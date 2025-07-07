const Message = require("../model/messageModel");
const Conversation = require("../model/conversationModel");
const ConversationState = require("../model/conversationStateModel");
const User = require("../model/userModel");
const Phone = require("../model/phoneModel");
const Cart = require("../model/cartModel");
const asyncHandler = require("express-async-handler");
const { detectIntent } = require("../utils/dialogflow");
const {
  uploadFile,
  getSignedUrl,
  deleteFile,
  saveMessageToFirestore,
} = require("../utils/firebase");
const fs = require("fs");
const mongoose = require("mongoose");
const { createReadStream, unlinkSync, existsSync, statSync } = require("fs");
const path = require("path");
const axios = require("axios");
const redis = require("redis");
const i18n = require("i18n");

const redisClient = redis.createClient();
redisClient.connect().catch(console.error);

let io;

const setIo = (socketIo) => {
  io = socketIo;
  // console.log("Socket.IO instance set in chatBoxController:", io); // Debug
};

// Lấy danh sách cuộc hội thoại
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString(); // Convert to string for Redis key
  const cacheKey = `conversations:${userId}`;

  const cachedConversations = await redisClient.get(cacheKey);
  if (cachedConversations) {
    console.log("Cache hit for conversations:", cachedConversations);
    return res.status(200).json({
      success: true,
      conversations: JSON.parse(cachedConversations),
    });
  }

  // Fetch conversations from MongoDB
  const conversations = await Conversation.find({ "participants.id": userId })
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username email" },
    })
    .sort({ updatedAt: -1 })
    .lean();

  // Prepare response using denormalized data
  const conversationsWithDetails = conversations.map((conversation) => {
    const unreadCount = conversation.unreadCounts?.get(userId) || 0;
    return {
      ...conversation,
      participants: conversation.participants.map((p) => ({
        id: p.id,
        username: p.username,
      })),
      unreadCount,
    };
  });

  // Cache result in Redis (5-minute TTL)
  await redisClient.setEx(
    cacheKey,
    300,
    JSON.stringify(conversationsWithDetails)
  );

  res
    .status(200)
    .json({ success: true, conversations: conversationsWithDetails });
});

// Lấy tin nhắn trong một cuộc hội thoại
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id.toString(); // Convert to string for Redis key
  const cacheKey = `messages:${conversationId}`;

  // Check Redis cache
  const cachedMessages = await redisClient.get(cacheKey);
  if (cachedMessages) {
    console.log("Cache hit for messages:", cachedMessages);
    return res.status(200).json({
      success: true,
      messages: JSON.parse(cachedMessages),
    });
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    "participants.id": userId,
  });
  if (!conversation) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found" });
  }

  const messages = await Message.find({ conversation: conversationId })
    .populate("sender", "username email")
    .populate("replyTo", "content sender")
    .populate("reactions.user", "username")
    .sort({ createdAt: 1 });

  for (let message of messages) {
    if (message.attachment) {
      message.attachment = await getSignedUrl(message.attachment);
    }
  }

  const messagesWithDetails = messages.map((message) => message.toObject());
  messagesWithDetails.forEach((message) => {
    message.sender = {
      id: message.sender._id.toString(),
      username: message.sender.username,
    };
    if (message.replyTo) {
      message.replyTo = {
        id: message.replyTo._id.toString(),
        content: message.replyTo.content,
        sender: {
          id: message.replyTo.sender._id.toString(),
          username: message.replyTo.sender.username,
        },
      };
    }
  });

  // Cache result in Redis (5-minute TTL)
  await redisClient.setEx(cacheKey, 300, JSON.stringify(messagesWithDetails));

  res.status(200).json({ success: true, messages: messagesWithDetails });
});

// Tạo cuộc hội thoại mới
// Debug: Verify io import
console.log("Imported io:", io);

const createConversation = asyncHandler(async (req, res) => {
  const { participantIds, name, type, isBotConversation } = req.body;
  const userId = req.user?._id;

  console.log("Request Body:", req.body);
  console.log("User ID from token:", userId);
  console.log("io status in createConversation:", io);

  // Validate userId
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    console.error("Invalid or missing userId");
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Invalid user ID" });
  }

  // Validate Socket.IO
  if (!io) {
    console.error("Socket.IO instance is undefined in createConversation");
    return res
      .status(500)
      .json({ success: false, message: "Socket.IO not initialized" });
  }

  // Validate participantIds
  if (!Array.isArray(participantIds)) {
    console.error("participantIds is not an array:", participantIds);
    return res
      .status(400)
      .json({ success: false, message: "participantIds must be an array" });
  }

  // Validate participantIds entries
  for (const id of participantIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error("Invalid participantId:", id);
      return res
        .status(400)
        .json({ success: false, message: `Invalid participantId: ${id}` });
    }
  }

  // Prevent userId in participantIds
  if (participantIds.includes(userId.toString())) {
    console.error("participantIds includes userId:", userId);
    return res.status(400).json({
      success: false,
      message: "Cannot include yourself in participantIds",
    });
  }

  // Validate bot conversation: participantIds must be empty
  if (isBotConversation && participantIds.length > 0) {
    console.error(
      "Bot conversation cannot have participantIds:",
      participantIds
    );
    return res.status(400).json({
      success: false,
      message:
        "Bot conversation cannot have participantIds; use an empty array",
    });
  }

  // Validate group conversation: name required
  if (type === "group" && !name) {
    console.error("Group conversation requires a name");
    return res.status(400).json({
      success: false,
      message: "Group conversation requires a name",
    });
  }

  // Validate bot group conversation: not allowed
  if (type === "group" && isBotConversation) {
    console.error("Bot conversations are not allowed for group type");
    return res.status(400).json({
      success: false,
      message: "Bot conversations are only allowed for one-to-one type",
    });
  }

  let allParticipants;

  // Fetch user details for denormalization
  const creator = await User.findById(userId).select("username");
  if (!creator) {
    return res
      .status(404)
      .json({ success: false, message: "Creator not found" });
  }

  // Handle bot conversation
  if (isBotConversation && participantIds.length === 0) {
    allParticipants = [userId];
    console.log("Bot conversation: allParticipants set to:", allParticipants);
  } else {
    const participants = await User.find({ _id: { $in: participantIds } });
    if (participants.length !== participantIds.length) {
      console.error("Some participants not found:", participantIds);
      return res.status(404).json({
        success: false,
        message: "One or more participants not found",
      });
    }
    // allParticipants = [
    //   ...new Set([
    //     userId,
    //     ...participantIds.map((id) => new mongoose.Types.ObjectId(id)),
    //   ]),
    // ];
    allParticipants = [
      { id: userId, username: creator.username },
      ...participants.map((p) => ({ id: p._id, username: p.username })),
    ];
    console.log(
      "Non-bot conversation: allParticipants set to:",
      allParticipants
    );
  }

  // Validate participant count
  if (type === "one-to-one" && !isBotConversation) {
    if (allParticipants.length !== 2) {
      console.error(
        "One-to-one non-bot conversation has invalid participant count:",
        allParticipants.length
      );
      return res.status(400).json({
        success: false,
        message:
          "One-to-one conversation must have exactly 2 different participants",
      });
    }
  } else if (type === "one-to-one" && isBotConversation) {
    if (allParticipants.length !== 1) {
      console.error(
        "Bot conversation has invalid participant count:",
        allParticipants.length,
        allParticipants
      );
      return res.status(400).json({
        success: false,
        message:
          "Bot conversation must have exactly 1 participant (the authenticated user)",
      });
    }
  } else if (type === "group" && !isBotConversation) {
    if (allParticipants.length < 2) {
      console.error(
        "Group conversation must have at least 2 participants:",
        allParticipants.length
      );
      return res.status(400).json({
        success: false,
        message:
          "Group conversation must have at least 2 participants (including the creator)",
      });
    }
  }

  // Check for existing conversation (only for one-to-one)
  let conversation;
  if (type === "one-to-one") {
    conversation = await Conversation.findOne({
      participants: { $all: allParticipants },
      type: "one-to-one",
    });
    if (conversation) {
      console.log("Existing Conversation:", conversation);
      return res.status(200).json({ success: true, conversation });
    }
  }

  // Initialize unreadCounts
  const unreadCounts = new Map();
  allParticipants.forEach((p) => {
    unreadCounts.set(p.id.toString(), 0);
  });

  // Create new conversation
  conversation = new Conversation({
    participants: allParticipants,
    name: type === "group" ? name : null,
    type: type || "one-to-one",
  });
  await conversation.save();
  console.log("Saved Conversation:", conversation);

  // Create initial message for all conversations
  let initialMessage;
  if (type === "one-to-one" && isBotConversation) {
    const botConfig = i18n.__("bot");
    if (!botConfig || !botConfig.welcomeMessage) {
      console.error("Bot configuration not found in i18n");
      return res
        .status(500)
        .json({ success: false, message: "Bot configuration not found" });
    }

    initialMessage = new Message({
      conversation: conversation._id,
      isBot: true,
      botName: botConfig.name,
      content: botConfig.welcomeMessage.content.replace(
        "{botName}",
        botConfig.name
      ),
      type: botConfig.welcomeMessage.type,
      readBy: [],
      richContent: botConfig.welcomeMessage.richContent,
    });
  } else {
    // Initial system message for non-bot one-to-one or group conversations
    const content =
      type === "group" ? `Group "${name}" created` : "Conversation started";
    initialMessage = new Message({
      conversation: conversation._id,
      isBot: false,
      content,
      type: "system",
      readBy: [userId],
    });
  }

  await initialMessage.save();

  // Update unreadCounts for initial message
  conversation.participants.forEach((p) => {
    if (!initialMessage.readBy.includes(p.id)) {
      conversation.unreadCounts.set(
        p.id.toString(),
        (conversation.unreadCounts.get(p.id.toString()) || 0) + 1
      );
    }
  });

  conversation.lastMessage = initialMessage._id;
  conversation.updatedAt = Date.now();
  await conversation.save();

  io.to(conversation._id.toString()).emit("newMessage", initialMessage);

  // Invalidate cache for all participants
  for (const participant of conversation.participants) {
    await redisClient.del(`conversations:${participant.id.toString()}`);
  }

  res.status(201).json({ success: true, conversation });
});

// Gửi tin nhắn
// Cấu hình i18n
i18n.configure({
  locales: ["en", "vi"],
  defaultLocale: "vi",
  directory: __dirname + "/locales",
  objectNotation: true,
});

// Schema Audit Log
const AuditLog = mongoose.model(
  "AuditLog",
  new mongoose.Schema({
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    details: { type: Object },
    timestamp: { type: Date, default: Date.now },
  })
);

// Hàm xử lý lỗi với đa ngôn ngữ
const handleError = (res, status, message, error = null, locale = "vi") => {
  const translatedMessage = i18n.__({ phrase: message, locale });
  console.error(
    translatedMessage,
    error ? { error: error.message, stack: error.stack } : {}
  );
  return res
    .status(status)
    .json({ success: false, message: translatedMessage });
};

// Hàm xác thực dữ liệu đầu vào
const validateRequest = ({ conversationId, senderId }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversationId");
  }
  if (!senderId) {
    throw new Error("Authentication required");
  }
};

// Hàm kiểm tra quyền truy cập vào cuộc hội thoại (hỗ trợ nhóm chat)
const checkConversationAccess = asyncHandler(
  async (conversationId, senderId, isBotConversation) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if (
      !conversation.participants ||
      !Array.isArray(conversation.participants)
    ) {
      throw new Error("Invalid participants structure");
    }
    if (!isBotConversation) {
      const isParticipant = conversation.participants.some(
        (p) => p.toString() === senderId.toString()
      );
      if (!isParticipant) {
        throw new Error("Not a participant");
      }
    }
    if (conversation.type === "group") {
      console.log(
        `Group chat detected: ${conversationId}, participants: ${conversation.participants.length}`
      );
    }
    return conversation;
  }
);

// Hàm xử lý file đính kèm với hỗ trợ loại tin nhắn mới
const processAttachment = asyncHandler(async (file) => {
  if (!file) return { attachmentBinary: null, attachmentType: null };

  console.log("Processing file:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds limit of 10MB");
  }

  const fileStream = createReadStream(file.path);
  try {
    const { attachmentBinary } = await uploadFile(
      fileStream,
      file.originalname,
      file.mimetype
    );
    console.log("File stored as Base64 in Firestore");

    const ext = file.originalname.split(".").pop().toLowerCase();
    const supportedTypes = {
      image: ["jpg", "jpeg", "png", "gif"],
      pdf: ["pdf"],
      doc: ["doc", "docx"],
      video: ["mp4", "mov"],
      audio: ["mp3", "wav"],
    };

    const attachmentType =
      Object.keys(supportedTypes).find((type) =>
        supportedTypes[type].includes(ext)
      ) || "other";

    if (attachmentType === "other") {
      throw new Error("Unsupported file type");
    }

    console.log("Determined attachment type:", attachmentType);
    return { attachmentBinary, attachmentType };
  } finally {
    try {
      unlinkSync(file.path);
      console.log("Temporary file deleted:", file.path);
    } catch (deleteError) {
      console.warn("Failed to delete temporary file:", deleteError);
    }
  }
});

// Hàm xác định loại tin nhắn
const determineMessageType = (type, attachmentType) => {
  if (attachmentType) {
    return attachmentType;
  }
  return type || "text";
};

// Hàm gửi thông báo (hỗ trợ nhóm chat)
const sendNotification = async (
  conversationId,
  senderId,
  messageContent,
  conversation
) => {
  try {
    const recipients = conversation.participants.filter(
      (p) => p.toString() !== senderId.toString()
    );
    const isGroupChat = conversation.type === "group";

    for (const recipientId of recipients) {
      const notificationMessage = isGroupChat
        ? `New message in group chat ${conversationId}: ${messageContent}`
        : `New message in private chat ${conversationId}: ${messageContent}`;
      console.log(
        `Sending push notification to user ${recipientId}: ${notificationMessage}`
      );
      // Ví dụ: Gọi API push notification
      // await pushNotificationService.send(recipientId, notificationMessage);
    }

    if (isGroupChat) {
      console.log(
        `Notified ${recipients.length} members in group chat ${conversationId}`
      );
    }
  } catch (error) {
    console.error("Error sending notification:", error.message);
  }
};

// Hàm ghi audit log
const logAction = async (action, userId, conversationId, details) => {
  try {
    const auditLog = new AuditLog({
      action,
      userId,
      conversationId,
      details,
      timestamp: new Date(),
    });
    await auditLog.save();
    console.log(`Audit log recorded for action: ${action}`);
  } catch (error) {
    console.error("Error saving audit log:", error.message);
  }
};

// Hàm gọi webhook
const triggerWebhook = async (webhookUrl, data) => {
  await axios.post(webhookUrl, data);
  console.log(`Webhook triggered successfully: ${webhookUrl}`);
};

// Hàm tạo và lưu tin nhắn
const createAndSaveMessage = async ({
  conversationId,
  senderId,
  content,
  attachmentBinary,
  attachmentType,
  type,
  replyTo,
  isBotConversation,
}) => {
  let replyToMessage = replyTo ? await Message.findById(replyTo) : null;
  if (
    replyTo &&
    (!replyToMessage ||
      replyToMessage.conversation.toString() !== conversationId)
  ) {
    throw new Error("Invalid replyTo message");
  }

  const message = new Message({
    conversation: conversationId,
    sender: isBotConversation ? null : senderId,
    content: content || "",
    attachmentBinary,
    attachmentType,
    type,
    replyTo: replyToMessage ? replyToMessage._id : null,
    readBy: [isBotConversation ? null : senderId],
    isBot: isBotConversation,
  });

  await message.save();
  await saveMessageToFirestore(message.toObject());
  await logAction("send_message", senderId, conversationId, {
    messageId: message._id.toString(),
    type,
    content,
  });
  return message;
};

// Hàm cập nhật trạng thái cuộc hội thoại (hỗ trợ nhóm chat)
const updateConversation = async (conversation, message) => {
  if (!conversation) {
    console.warn("Conversation is null, skipping update.");
    return;
  }

  if (!conversation.unreadCounts) conversation.unreadCounts = new Map();

  // Chỉ xử lý nếu message tồn tại
  if (message) {
    conversation.participants.forEach((p) => {
      const participantId = p.toString();
      if (!message.readBy.some((id) => id && id.toString() === participantId)) {
        conversation.unreadCounts.set(
          participantId,
          (conversation.unreadCounts.get(participantId) || 0) + 1
        );
      }
    });
  }

  conversation.lastMessage = message ? message._id : null;
  await conversation.save();
  console.log(
    "Conversation updated with lastMessage:",
    message ? message._id.toString() : "null"
  );
};

// Hàm xóa cache Redis với tối ưu hóa
const clearRedisCache = async (conversationId, participants) => {
  try {
    const keysToDelete = [
      `messages:${conversationId}`,
      ...participants.map((p) => `conversations:${p.toString()}`),
    ];
    await redisClient.del(keysToDelete);
    console.log("Redis cache cleared for conversation:", conversationId);
  } catch (error) {
    console.error("Error clearing Redis cache:", {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Hàm xử lý tin nhắn bot
const handleBotConversation = asyncHandler(
  async ({
    conversationId,
    senderId,
    content,
    replyTo,
    action,
    simulateAction,
    io,
    req,
  }) => {
    console.log("Starting handleBotConversation with content:", content);

    // Overall timeout for the function (45 seconds, increased for stability)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Request timed out after 45 seconds")),
        45000
      );
    });

    const mainPromise = (async () => {
      const sessionId = `${conversationId}-${senderId}`;
      console.log("Fetching conversation state for sessionId:", sessionId);
      let state = await ConversationState.findOne({
        conversation: conversationId,
        user: senderId,
      }).catch((err) => {
        console.error("Error fetching conversation state:", err.message);
        throw new Error("Không thể truy vấn trạng thái cuộc hội thoại.");
      });
      console.log(
        "Fetched conversation state:",
        state ? state.state : "No state found"
      );

      if (!state) {
        state = new ConversationState({
          conversation: conversationId,
          user: senderId,
          state: "initial",
          data: {},
        });
        await state.save().catch((err) => {
          console.error("Error saving new conversation state:", err.message);
          throw new Error("Không thể tạo trạng thái cuộc hội thoại mới.");
        });
        console.log("Created new conversation state for session:", sessionId);
      } else {
        state.data = state.data || {};
      }

      let simulationCount = 0;
      const simulationLimit = 1;

      // Check for special characters
      const specialCharRegex = /[@#$%&*()!^={\}\[\]\\;:"'<>~`]/;
      if (content && specialCharRegex.test(content)) {
        console.log("Content contains special characters:", content);
        throw new Error(
          "Nội dung chứa ký tự đặc biệt không được phép. Vui lòng nhập lại."
        );
      }

      // Extract productId from action
      const extractProductId = (action, expectedPrefix) => {
        const parts = action.split("_");
        return expectedPrefix === "view_product_" && parts.length === 3
          ? parts[2]
          : expectedPrefix === "add_to_cart_" && parts.length === 4
          ? parts[3]
          : null;
      };

      const defaultConfig = { defaultQuantity: 1, defaultCurrency: "VND" };

      // Handle action
      const handleAction = async (actionToHandle) => {
        let simulatedMessage;
        console.log("Handling action:", actionToHandle);

        if (actionToHandle.startsWith("view_product_")) {
          const parts = actionToHandle.split("_");
          const productId = extractProductId(actionToHandle, "view_product_");
          if (parts.length === 5 && parts[3] === "color") {
            const selectedColor = parts[4];
            if (productId && mongoose.Types.ObjectId.isValid(productId)) {
              console.log("Fetching product with ID:", productId);
              const product = await Promise.race([
                Phone.findById(productId)
                  .select("name price finalPrice stock colors specifications")
                  .lean()
                  .catch((err) => {
                    console.error("Error fetching product:", err.message);
                    throw new Error("Không thể tìm thấy sản phẩm.");
                  }),
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Product query timed out")),
                    7000
                  )
                ),
              ]);
              console.log(
                "Fetched product for view_product with color:",
                product
              );

              let content = i18n.__({
                phrase:
                  "Invalid product or unavailable price. Please try again.",
                locale: "vi",
              });
              let richContent = {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Choose action:", locale: "vi" }),
                  buttons: [
                    { text: "Liên hệ hỗ trợ", value: "contact_support" },
                  ],
                },
              };

              if (
                product &&
                typeof product.price === "number" &&
                product.price >= 0 &&
                product.stock > 0
              ) {
                content = `Chi tiết sản phẩm:\n- Tên: ${
                  product.name
                }\n- Giá gốc: ${product.price.toLocaleString(
                  "vi-VN"
                )}đ\n- Giá sau giảm: ${(
                  product.finalPrice || product.price
                ).toLocaleString("vi-VN")}đ\n- Tồn kho: ${
                  product.stock
                } suất\n- Màu đã chọn: ${selectedColor}\n- Thông số: RAM ${
                  product.specifications?.ram || "N/A"
                }, Bộ nhớ ${
                  product.specifications?.storage || "N/A"
                }, Màn hình ${product.specifications?.screen || "N/A"}`;
                richContent = {
                  type: "button",
                  data: {
                    text: i18n.__({
                      phrase: "What would you like to do?",
                      locale: "vi",
                    }),
                    buttons: [
                      {
                        text: "Thêm vào giỏ",
                        value: `add_to_cart_${product._id}`,
                      },
                      { text: "Xem sản phẩm khác", value: "view_product" },
                    ],
                  },
                };
              }

              simulatedMessage = new Message({
                _id: new mongoose.Types.ObjectId(),
                conversation: conversationId,
                isBot: true,
                replyTo: replyTo || null,
                content,
                type: "rich",
                richContent,
                readBy: [],
              });
              state.state = "product_selected";
              state.data.productId = product._id;
              state.data.selectedColor = selectedColor;
            } else {
              simulatedMessage = new Message({
                _id: new mongoose.Types.ObjectId(),
                conversation: conversationId,
                isBot: true,
                replyTo: replyTo || null,
                content: i18n.__({
                  phrase: "Invalid product ID. Please try again.",
                  locale: "vi",
                }),
                type: "system",
                readBy: [],
              });
            }
          } else if (productId && mongoose.Types.ObjectId.isValid(productId)) {
            console.log("Fetching product with ID:", productId);
            const product = await Promise.race([
              Phone.findById(productId)
                .select("name price finalPrice stock colors specifications")
                .lean()
                .catch((err) => {
                  console.error("Error fetching product:", err.message);
                  throw new Error("Không thể tìm thấy sản phẩm.");
                }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Product query timed out")),
                  7000
                )
              ),
            ]);
            console.log("Fetched product for view_product:", product);

            if (product) {
              const availableColors = product.colors;
              const colorButtons = availableColors.map((color) => ({
                text: color,
                value: `view_product_${
                  product._id
                }_color_${color.toLowerCase()}`,
              }));
              simulatedMessage = new Message({
                _id: new mongoose.Types.ObjectId(),
                conversation: conversationId,
                isBot: true,
                replyTo: replyTo || null,
                content: i18n.__({
                  phrase: `Available colors for ${
                    product.name
                  }: ${availableColors.join(", ")}`,
                  locale: "vi",
                }),
                type: "rich",
                richContent: {
                  type: "button",
                  data: {
                    text: i18n.__({ phrase: "Select a color:", locale: "vi" }),
                    buttons:
                      colorButtons.length > 0
                        ? colorButtons
                        : [
                            {
                              text: "Xem sản phẩm khác",
                              value: "view_product",
                            },
                            {
                              text: "Liên hệ hỗ trợ",
                              value: "contact_support",
                            },
                          ],
                  },
                },
                readBy: [],
              });
              state.state = "waiting_for_color_selection";
              state.data.productId = product._id;
            } else {
              simulatedMessage = new Message({
                _id: new mongoose.Types.ObjectId(),
                conversation: conversationId,
                isBot: true,
                replyTo: replyTo || null,
                content: i18n.__({
                  phrase: "Invalid product ID. Please try again.",
                  locale: "vi",
                }),
                type: "system",
                readBy: [],
              });
            }
          } else {
            simulatedMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: i18n.__({
                phrase: "Invalid product ID. Please try again.",
                locale: "vi",
              }),
              type: "system",
              readBy: [],
            });
          }
        } else if (actionToHandle === "view_product_manual") {
          simulatedMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase:
                "Please provide product name (e.g., iPhone 15 or realme 15+ 5G).",
              locale: "vi",
            }),
            type: "system",
            readBy: [],
          });
          state.state = "waiting_for_product_selection";
        } else if (actionToHandle.startsWith("add_to_cart_")) {
          const productId = extractProductId(actionToHandle, "add_to_cart_");
          if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            simulatedMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: i18n.__({
                phrase: "Invalid product ID. Please try again.",
                locale: "vi",
              }),
              type: "system",
              readBy: [],
            });
          } else {
            console.log("Fetching product for add_to_cart with ID:", productId);
            const product = await Promise.race([
              Phone.findById(productId)
                .select(
                  "name price finalPrice image images currency stock reserved"
                )
                .lean()
                .catch((err) => {
                  console.error(
                    "Error fetching product for add_to_cart:",
                    err.message
                  );
                  throw new Error("Không thể tìm thấy sản phẩm.");
                }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Product query timed out")),
                  7000
                )
              ),
            ]);
            console.log("Fetched product for add_to_cart:", product);

            let content = i18n.__({ phrase: "Invalid product.", locale: "vi" });
            if (product && product.stock >= defaultConfig.defaultQuantity) {
              console.log("Fetching cart for user:", senderId);
              const cart =
                (await Promise.race([
                  Cart.findOne({ user: senderId }).catch((err) => {
                    console.error("Error fetching cart:", err.message);
                    throw new Error("Không thể truy vấn giỏ hàng.");
                  }),
                  new Promise((_, reject) =>
                    setTimeout(
                      () => reject(new Error("Cart query timed out")),
                      7000
                    )
                  ),
                ])) || new Cart({ user: senderId, items: [] });
              const existingItem = cart.items.find(
                (item) => item.phone.toString() === productId
              );
              const imageUrl =
                (product.images?.length > 0
                  ? product.images[0].url
                  : product.image) || "";
              const price = product.finalPrice || product.price || 0;
              const originalPrice = product.price || 0;
              const quantity = defaultConfig.defaultQuantity;
              const currency =
                product.currency || defaultConfig.defaultCurrency;

              const isValidImageUrl = imageUrl
                ? /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/.test(imageUrl)
                : false;
              const validImageUrl = isValidImageUrl
                ? imageUrl
                : "https://example.com/default.jpg";

              if (existingItem) {
                existingItem.quantity += quantity;
              } else {
                cart.items.push({
                  phone: productId,
                  quantity,
                  price,
                  originalPrice,
                  imageUrl: validImageUrl,
                  currency,
                  isGift: false,
                  customOption: {},
                  createdAt: new Date(),
                });
              }
              cart.updatedAt = Date.now();
              await cart.save().catch((err) => {
                console.error("Error saving cart:", err.message);
                throw new Error("Không thể lưu giỏ hàng.");
              });
              await Phone.updateOne(
                { _id: productId },
                { $inc: { stock: -quantity, reserved: quantity } }
              ).catch((err) => {
                console.error("Error updating product stock:", err.message);
                throw new Error("Không thể cập nhật số lượng sản phẩm.");
              });
              content = `Đã thêm ${quantity} x ${product.name} vào giỏ. Xem tại /cart`;
            } else {
              content = i18n.__({
                phrase: "Product out of stock. Please try another product.",
                locale: "vi",
              });
            }
            simulatedMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content,
              type: "system",
              readBy: [],
            });
            state.state = "order_placed";
            state.data = {};
          }
        } else if (actionToHandle === "place_order") {
          simulatedMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase:
                "Please provide product name (e.g., iPhone 15 or realme 15+ 5G).",
              locale: "vi",
            }),
            type: "system",
            readBy: [],
          });
          state.state = "waiting_for_product_selection";
        } else if (actionToHandle === "contact_support") {
          simulatedMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: "Liên hệ: 0123-456-789 hoặc support@shop.com.",
            type: "system",
            readBy: [],
          });
          state.state = "support_contacted";
        } else if (actionToHandle === "cancel_order") {
          simulatedMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase: "Order canceled. What would you like to do next?",
              locale: "vi",
            }),
            type: "rich",
            richContent: {
              type: "button",
              data: {
                text: i18n.__({ phrase: "Choose action:", locale: "vi" }),
                buttons: [
                  { text: "Xem sản phẩm", value: "view_product" },
                  { text: "Liên hệ hỗ trợ", value: "contact_support" },
                ],
              },
            },
            readBy: [],
          });
          state.state = "initial";
          state.data = {};
        } else if (actionToHandle === "view_product") {
          console.log("Fetching suggested products...");
          const suggestedProducts = await Promise.race([
            Phone.aggregate([
              {
                $match: {
                  _id: { $ne: state.data.productId },
                  stock: { $gt: 0 },
                },
              },
              { $sample: { size: 3 } },
            ])
              .lean()
              .catch((err) => {
                console.error(
                  "Error fetching suggested products:",
                  err.message
                );
                throw new Error("Không thể lấy danh sách sản phẩm gợi ý.");
              }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Suggested products query timed out")),
                7000
              )
            ),
          ]);
          console.log("Suggested products:", suggestedProducts);

          const buttons = suggestedProducts.map((product) => ({
            text: `${product.name} (Giá: ${
              product.finalPrice || product.price
            }đ, Stock: ${product.stock})`,
            value: `view_product_${product._id}`,
          }));
          buttons.push({
            text: "Nhập tên sản phẩm khác",
            value: "view_product_manual",
          });
          simulatedMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({ phrase: "Suggested products:", locale: "vi" }),
            type: "rich",
            richContent: {
              type: "button",
              data: {
                text: i18n.__({ phrase: "Select product:", locale: "vi" }),
                buttons:
                  buttons.length > 0
                    ? buttons
                    : [
                        { text: "Thử lại", value: "view_product_manual" },
                        { text: "Liên hệ hỗ trợ", value: "contact_support" },
                      ],
              },
            },
            readBy: [],
          });
          state.state = "waiting_for_product_selection";
        } else {
          simulatedMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase: "Invalid action. Please try again.",
              locale: "vi",
            }),
            type: "system",
            readBy: [],
          });
        }

        if (simulatedMessage) {
          await state.save().catch((err) => {
            console.error("Error saving state after action:", err.message);
            throw new Error("Không thể lưu trạng thái sau hành động.");
          });
          console.log("Saved conversation state after action:", state.state);
          await simulatedMessage.save().catch((err) => {
            console.error("Error saving simulated message:", err.message);
            throw new Error("Không thể lưu tin nhắn mô phỏng.");
          });
          console.log("Saved simulated message:", simulatedMessage.content);
          await saveMessageToFirestore(simulatedMessage.toObject()).catch(
            (err) => {
              console.error("Error saving to Firestore:", err.message);
              throw new Error("Không thể lưu tin nhắn vào Firestore.");
            }
          );
          io.to(conversationId).emit("newMessage", simulatedMessage);
          console.log("Emitted newMessage to conversationId:", conversationId);
          if (!io.sockets.adapter.rooms.has(conversationId)) {
            console.warn("No clients in room:", conversationId);
          }
          return { botMessage: simulatedMessage, simulatedMessages: [] };
        }
        return { botMessage: null, simulatedMessages: [] };
      };

      // Simulate button click
      const simulateButtonClick = async (
        buttons,
        actionToSimulate,
        currentProductId
      ) => {
        if (simulationCount >= simulationLimit) {
          console.log("Simulation limit reached:", simulationLimit);
          return null;
        }
        if (buttons?.length > 0) {
          let adjustedAction = actionToSimulate;
          const expectedAction = `add_to_cart_${currentProductId}`;
          if (
            actionToSimulate.startsWith("add_to_cart_") &&
            actionToSimulate !== expectedAction
          ) {
            adjustedAction = expectedAction;
          }
          const selectedButton = buttons.find(
            (btn) => btn.value === adjustedAction
          );
          if (selectedButton) {
            simulationCount++;
            console.log(
              "Simulating button click with value:",
              selectedButton.value
            );
            return await handleAction(selectedButton.value);
          } else {
            console.log("No matching button found for action:", adjustedAction);
          }
        } else {
          console.log("No buttons available for simulation");
        }
        return null;
      };

      let botMessage;
      if (action) {
        console.log("Processing action:", action);
        return await handleAction(action);
      }

      // Dialogflow call with improved error handling
      console.log("Starting Dialogflow call...");
      const dialogflowTimeout = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(new Error("Dialogflow request timed out after 15 seconds")),
          15000
        );
      });

      let dialogflowResponse;
      try {
        dialogflowResponse = await Promise.race([
          detectIntent(content, sessionId),
          dialogflowTimeout,
        ]);
      } catch (err) {
        console.error("Dialogflow error:", err.message);
        dialogflowResponse = { intent: "default", parameters: {} }; // Fallback to default intent
      }
      console.log(
        "Dialogflow response:",
        JSON.stringify(dialogflowResponse, null, 2)
      );

      const brandMatch = content
        .toLowerCase()
        .match(/(tìm|tôi cần tìm|so sánh)\s*(?:điện thoại\s*)?(.+)/i);
      const searchTerm = brandMatch ? brandMatch[2].trim() : content.trim();
      const isCompare = content.toLowerCase().includes("so sánh");

      console.log("Fetching brands...");
      let brands;
      try {
        brands = await Promise.race([
          Phone.distinct("brand"),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Brand query timed out")), 7000)
          ),
        ]);
      } catch (err) {
        console.error("Brand query error:", err.message);
        brands = [];
      }
      console.log("Fetched brands:", brands);

      const matchedBrand = brands.find((brand) =>
        content.toLowerCase().includes(brand.toLowerCase())
      );
      const isSearchRequest =
        (content.toLowerCase().includes("điện thoại") ||
          content.toLowerCase().includes("tìm") ||
          content.toLowerCase().includes("mua") ||
          content.toLowerCase().includes("tìm kiếm") ||
          content.toLowerCase().includes("còn hàng")) &&
        !content.toLowerCase().includes("có màu gì") &&
        !content.toLowerCase().includes("màu nào");

      if (
        dialogflowResponse.intent === "contact_support" ||
        content.toLowerCase().includes("hỗ trợ")
      ) {
        botMessage = new Message({
          _id: new mongoose.Types.ObjectId(),
          conversation: conversationId,
          isBot: true,
          replyTo: replyTo || null,
          content: "Liên hệ: 0123-456-789 hoặc support@shop.com.",
          type: "system",
          readBy: [],
        });
        state.state = "support_contacted";
      } else if (
        dialogflowResponse.intent === "place_order" ||
        content.toLowerCase().includes("đặt hàng")
      ) {
        const productNameMatch =
          dialogflowResponse.parameters["product-name"] ||
          (matchedBrand
            ? content
                .toLowerCase()
                .match(new RegExp(`${matchedBrand.toLowerCase()}\\s*\\w+`, "i"))
            : null);
        const productName = productNameMatch
          ? typeof productNameMatch === "string"
            ? productNameMatch
            : productNameMatch[0].trim()
          : null;

        if (productName) {
          let query = {
            name: { $regex: productName, $options: "i" },
            stock: { $gt: 0 },
            price: { $gte: 0 },
          };
          // if (dialogflowResponse.parameters?.color) {
          //   let requestedColor =
          //     dialogflowResponse.parameters.color.toLowerCase();
          //   requestedColor = requestedColor.replace(/[^a-zA-Z\s-]/g, "");
          //   query.colors = {
          //     $elemMatch: {
          //       $in: [
          //         requestedColor,
          //         requestedColor.replace("deep ", ""),
          //         "deep " + requestedColor,
          //       ],
          //     },
          //   };
          // }
          if (dialogflowResponse.parameters?.color) {
            let requestedColor = dialogflowResponse.parameters.color
              .toLowerCase()
              .trim()
              .replace(/[^a-zA-Z\s-]/g, "");
            query.colors = {
              $elemMatch: { $regex: requestedColor, $options: "i" }, // Bỏ '^' và '$' để khớp với cả "Deep Purple"
            };
          }

          console.log("Searching product for place_order with query:", query);
          const product = await Promise.race([
            Phone.findOne(query)
              .lean()
              .catch((err) => {
                console.error(
                  "Error finding product for place_order:",
                  err.message
                );
                throw new Error(
                  "Không thể tìm thấy sản phẩm trong cơ sở dữ liệu."
                );
              }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Product query timed out")),
                7000
              )
            ),
          ]);
          console.log("Found product for place_order:", product);

          if (product) {
            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: `Bạn muốn đặt sản phẩm:\n- Tên: ${
                product.name
              }\n- Giá: ${(product.finalPrice || product.price).toLocaleString(
                "vi-VN"
              )}đ`,
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Confirm order?", locale: "vi" }),
                  buttons: [
                    { text: "Xác nhận", value: `add_to_cart_${product._id}` },
                    { text: "Hủy", value: "cancel_order" },
                  ],
                },
              },
              readBy: [],
            });
            state.state = "confirming_order";
            state.data.productId = product._id;
          } else {
            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: i18n.__({
                phrase:
                  "Product not found. Please provide a more specific name.",
                locale: "vi",
              }),
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Choose action:", locale: "vi" }),
                  buttons: [
                    { text: "Thử lại", value: "view_product_manual" },
                    { text: "Liên hệ hỗ trợ", value: "contact_support" },
                  ],
                },
              },
              readBy: [],
            });
            state.state = "waiting_for_product_selection";
          }
        } else {
          botMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase:
                "Please provide product name (e.g., iPhone 15 or realme 15+ 5G).",
              locale: "vi",
            }),
            type: "system",
            readBy: [],
          });
          state.state = "waiting_for_product_selection";
        }
      } else if (isCompare) {
        const productNames =
          content
            .toLowerCase()
            .match(new RegExp(`(${brands.join("|")})\\s*\\w+`, "gi")) || [];
        if (productNames.length >= 2) {
          console.log("Comparing products:", productNames);
          const products = await Promise.race([
            Phone.find({
              name: {
                $in: productNames.map((name) => new RegExp(`^${name}$`, "i")),
              },
              stock: { $gt: 0 },
              price: { $gte: 0 },
            })
              .lean()
              .catch((err) => {
                console.error(
                  "Error finding products for comparison:",
                  err.message
                );
                throw new Error("Không thể tìm thấy sản phẩm để so sánh.");
              }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Comparison query timed out")),
                7000
              )
            ),
          ]);
          console.log("Found products for comparison:", products);

          if (products.length >= 2) {
            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: `So sánh sản phẩm:\n- ${products[0].name}: Giá ${(
                products[0].finalPrice || products[0].price
              ).toLocaleString("vi-VN")}đ, RAM ${
                products[0].specifications?.ram || "N/A"
              }\n- ${products[1].name}: Giá ${(
                products[1].finalPrice || products[1].price
              ).toLocaleString("vi-VN")}đ, RAM ${
                products[1].specifications?.ram || "N/A"
              }`,
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: i18n.__({
                    phrase: "Select product for details:",
                    locale: "vi",
                  }),
                  buttons: products.map((p) => ({
                    text: p.name,
                    value: `view_product_${p._id}`,
                  })),
                },
              },
              readBy: [],
            });
          } else {
            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: i18n.__({
                phrase:
                  "Not enough products found for comparison. Please try again.",
                locale: "vi",
              }),
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Choose action:", locale: "vi" }),
                  buttons: [
                    { text: "Thử lại", value: "view_product_manual" },
                    { text: "Liên hệ hỗ trợ", value: "contact_support" },
                  ],
                },
              },
              readBy: [],
            });
          }
        } else {
          botMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase:
                "Please provide at least 2 products to compare (e.g., compare iPhone 15 and Samsung S24).",
              locale: "vi",
            }),
            type: "system",
            readBy: [],
          });
        }
      } else if (dialogflowResponse.intent === "Ask_colors") {
        const productName = dialogflowResponse.parameters?.["product-name"];
        state.previousIntent = "Ask_colors";
        if (!productName) {
          botMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase: "Please provide the product name (e.g., iPhone 14).",
              locale: "vi",
            }),
            type: "system",
            readBy: [],
          });
          state.state = "waiting_for_product_name";
        } else {
          let searchValue = productName;
          if (dialogflowResponse.parameters?.number) {
            searchValue = `${searchValue} ${dialogflowResponse.parameters.number}`;
          }
          console.log("Searching for product (Ask_colors):", searchValue);

          let query = {
            name: { $regex: searchValue, $options: "i" },
            stock: { $gt: 0 },
            price: { $gte: 0 },
          };
          if (dialogflowResponse.parameters?.color) {
            let requestedColor =
              dialogflowResponse.parameters.color.toLowerCase();
            requestedColor = requestedColor.replace(/[^a-zA-Z\s-]/g, "");
            query.colors = {
              $elemMatch: {
                $in: [
                  requestedColor,
                  requestedColor.replace("deep ", ""),
                  "deep " + requestedColor,
                ],
              },
            };
          }

          let products = await Promise.race([
            Phone.find(query)
              .lean()
              .catch((err) => {
                console.error(
                  "Error finding product (Ask_colors):",
                  err.message
                );
                throw new Error(
                  "Không thể tìm thấy sản phẩm trong cơ sở dữ liệu."
                );
              }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Ask_colors query timed out")),
                7000
              )
            ),
          ]);

          let exactMatch = products.length > 0;

          if (products.length === 0) {
            query.name = { $regex: searchValue, $options: "i" };
            products = await Promise.race([
              Phone.find(query)
                .lean()
                .catch((err) => {
                  console.error(
                    "Error finding fallback product (Ask_colors):",
                    err.message
                  );
                  throw new Error(
                    "Không thể tìm thấy sản phẩm trong cơ sở dữ liệu."
                  );
                }),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(new Error("Ask_colors fallback query timed out")),
                  7000
                )
              ),
            ]);
          }
          console.log("Found products (Ask_colors):", products);

          if (products.length === 1) {
            const product = products[0];
            if (
              typeof product.price !== "number" ||
              product.price < 0 ||
              product.stock <= 0
            ) {
              botMessage = new Message({
                _id: new mongoose.Types.ObjectId(),
                conversation: conversationId,
                isBot: true,
                replyTo: replyTo || null,
                content: i18n.__({
                  phrase:
                    "Invalid product or unavailable price. Please try again.",
                  locale: "vi",
                }),
                type: "rich",
                richContent: {
                  type: "button",
                  data: {
                    text: i18n.__({ phrase: "Chọn hành động:", locale: "vi" }),
                    buttons: [
                      { text: "Xem sản phẩm khác", value: "view_product" },
                      { text: "Liên hệ hỗ trợ", value: "contact_support" },
                    ],
                  },
                },
                readBy: [],
              });
              state.state = "waiting_for_product_selection";
            } else {
              const availableColors = product.colors;
              const colorButtons = availableColors.map((color) => ({
                text: color,
                value: `view_product_${
                  product._id
                }_color_${color.toLowerCase()}`,
              }));
              botMessage = new Message({
                _id: new mongoose.Types.ObjectId(),
                conversation: conversationId,
                isBot: true,
                replyTo: replyTo || null,
                content: i18n.__({
                  phrase: exactMatch
                    ? `Các màu có sẵn cho ${
                        product.name
                      }: ${availableColors.join(", ")}`
                    : `Không tìm thấy chính xác ${searchValue}. Dưới đây là các màu của ${
                        product.name
                      }: ${availableColors.join(", ")}`,
                  locale: "vi",
                }),
                type: "rich",
                richContent: {
                  type: "button",
                  data: {
                    text: i18n.__({ phrase: "Chọn màu:", locale: "vi" }),
                    buttons:
                      colorButtons.length > 0
                        ? colorButtons
                        : [
                            {
                              text: "Xem sản phẩm khác",
                              value: "view_product",
                            },
                            {
                              text: "Liên hệ hỗ trợ",
                              value: "contact_support",
                            },
                          ],
                  },
                },
                readBy: [],
              });
              state.state = "waiting_for_color_selection";
              state.data.productId = product._id;
            }
          } else if (products.length > 1) {
            const buttons = products.map((p) => ({
              text: `${p.name} (Giá: ${p.finalPrice || p.price}đ, Stock: ${
                p.stock
              })`,
              value: `view_product_${p._id}`,
            }));
            buttons.push({
              text: "Nhập tên sản phẩm khác",
              value: "view_product_manual",
            });

            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: i18n.__({
                phrase: "Multiple matching products found. Please select one:",
                locale: "vi",
              }),
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Chọn sản phẩm:", locale: "vi" }),
                  buttons,
                },
              },
              readBy: [],
            });
            state.state = "waiting_for_product_selection";
          } else {
            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: i18n.__({
                phrase: `Product ${searchValue} not found or out of stock.`,
                locale: "vi",
              }),
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Chọn hành động:", locale: "vi" }),
                  buttons: [
                    { text: "Thử lại", value: "view_product_manual" },
                    { text: "Liên hệ hỗ trợ", value: "contact_support" },
                  ],
                },
              },
              readBy: [],
            });
            state.state = "waiting_for_product_selection";
          }
        }
      }
      // else if (
      //   dialogflowResponse.intent === "search_product" &&
      //   dialogflowResponse.intent !== "Ask_colors" &&
      //   (brandMatch || matchedBrand || isSearchRequest)
      // ) {
      //   let query = { stock: { $gt: 0 }, price: { $gte: 0 } };
      //   let searchValue = searchTerm;

      //   if (
      //     dialogflowResponse.parameters &&
      //     dialogflowResponse.parameters["product-name"]
      //   ) {
      //     searchValue = dialogflowResponse.parameters["product-name"];
      //     if (dialogflowResponse.parameters?.number) {
      //       searchValue = `${searchValue} ${dialogflowResponse.parameters.number}`;
      //     }
      //     console.log("Using product-name from Dialogflow:", searchValue);
      //   } else if (matchedBrand) {
      //     query.brand = matchedBrand;
      //     const productModel = searchTerm
      //       .toLowerCase()
      //       .replace(matchedBrand.toLowerCase(), "")
      //       .trim();
      //     if (productModel) searchValue = productModel;
      //   } else if (
      //     dialogflowResponse.parameters?.number &&
      //     content.toLowerCase().includes("iphone")
      //   ) {
      //     // searchValue = `iPhone ${dialogflowResponse.parameters.number}`;
      //     // console.log("Fallback searchValue:", searchValue);
      //     let baseModel = content.toLowerCase().includes("pro")
      //       ? "iPhone ${dialogflowResponse.parameters.number} Pro"
      //       : `iPhone ${dialogflowResponse.parameters.number}`;
      //     searchValue = baseModel;
      //     console.log("Fallback searchValue:", searchValue);
      //   }

      //   query.name = { $regex: searchValue.trim(), $options: "i" };
      //   console.log("Constructed name query:", query.name);

      //   if (dialogflowResponse.parameters?.color) {
      //     let requestedColor = dialogflowResponse.parameters.color
      //       .toLowerCase()
      //       .trim()
      //       .replace(/[^a-zA-Z\s-]/g, "");
      //     query.colors = {
      //       $elemMatch: { $regex: `^${requestedColor}$`, $options: "i" },
      //     };
      //     console.log("Constructed color query:", query.colors);
      //   }

      //   console.log(
      //     "Full query before execution:",
      //     JSON.stringify(query, null, 2)
      //   );
      //   let products = await Promise.race([
      //     Phone.find(query)
      //       .lean()
      //       .catch((err) => {
      //         console.error("Error searching products:", err.message);
      //         throw new Error(
      //           "Không thể tìm kiếm sản phẩm trong cơ sở dữ liệu."
      //         );
      //       }),
      //     new Promise((_, reject) =>
      //       setTimeout(() => reject(new Error("Search query timed out")), 7000)
      //     ),
      //   ]);

      //   console.log(
      //     "Found products for search:",
      //     JSON.stringify(products, null, 2)
      //   );

      //   if (products.length === 1) {
      //     const product = products[0];
      //     let content = `Chi tiết sản phẩm:\n- Tên: ${
      //       product.name
      //     }\n- Giá gốc: ${product.price.toLocaleString(
      //       "vi-VN"
      //     )}đ\n- Giá sau giảm: ${(
      //       product.finalPrice || product.price
      //     ).toLocaleString("vi-VN")}đ\n- Tồn kho: ${
      //       product.stock
      //     } suất\n- Màu sắc: ${product.colors.join(", ")}`;

      //     if (dialogflowResponse.parameters?.color) {
      //       let requestedColor = dialogflowResponse.parameters.color
      //         .toLowerCase()
      //         .trim()
      //         .replace(/[^a-zA-Z\s-]/g, "");
      //       let requestedColorDisplay =
      //         product.colors.find(
      //           (color) => color.toLowerCase().trim() === requestedColor
      //         ) || requestedColor;
      //       content += `\n- Màu yêu cầu: ${requestedColorDisplay}`;
      //       const estimatedStockPerColor = Math.floor(
      //         product.stock / product.colors.length
      //       );
      //       if (
      //         product.stock > 0 &&
      //         product.colors.some(
      //           (color) => color.toLowerCase().trim() === requestedColor
      //         )
      //       ) {
      //         if (
      //           req &&
      //           req.user &&
      //           req.user.role &&
      //           req.user.role.roleName &&
      //           req.user.role.roleName.toLowerCase() === "admin"
      //         ) {
      //           content += `\n- Tình trạng: Còn ${estimatedStockPerColor.toLocaleString(
      //             "vi-VN"
      //           )} sản phẩm với màu ${requestedColorDisplay}.`;
      //         } else {
      //           if (!req || !req.user) {
      //             console.warn(
      //               "req.user is undefined - defaulting to non-admin response. Ensure protect middleware is applied and token is provided."
      //             );
      //           }
      //           content += `\n- Tình trạng: Còn hàng với màu ${requestedColorDisplay}.`;
      //         }
      //       } else {
      //         content += `\n- Tình trạng: Hết hàng hoặc không có màu ${requestedColorDisplay}.`;
      //       }
      //     }
      //     content += `\n- Thông số: RAM ${
      //       product.specifications?.ram || "N/A"
      //     }, Bộ nhớ ${product.specifications?.storage || "N/A"}, Màn hình ${
      //       product.specifications?.screen || "N/A"
      //     }`;

      //     let richContent = {
      //       type: "button",
      //       data: {
      //         text: i18n.__({
      //           phrase: "What would you like to do?",
      //           locale: "vi",
      //         }),
      //         buttons: [
      //           { text: "Thêm vào giỏ", value: `add_to_cart_${product._id}` },
      //           { text: "Xem sản phẩm khác", value: "view_product" },
      //         ],
      //       },
      //     };

      //     botMessage = new Message({
      //       _id: new mongoose.Types.ObjectId(),
      //       conversation: conversationId,
      //       isBot: true,
      //       replyTo: replyTo || null,
      //       content,
      //       type: "rich",
      //       richContent,
      //       readBy: [],
      //     });

      //     state.state = "product_selected";
      //     state.data.productId = product._id;
      //   } else if (products.length > 1) {
      //     const buttons = products.map((p) => ({
      //       text: `${p.name} (Giá: ${p.finalPrice || p.price}đ, Stock: ${
      //         p.stock
      //       })`,
      //       value: `view_product_${p._id}`,
      //     }));
      //     buttons.push({ text: "Xem sản phẩm khác", value: "view_product" });

      //     botMessage = new Message({
      //       _id: new mongoose.Types.ObjectId(),
      //       conversation: conversationId,
      //       isBot: true,
      //       replyTo: replyTo || null,
      //       content: i18n.__({
      //         phrase: "Multiple matching products found. Please select one:",
      //         locale: "vi",
      //       }),
      //       type: "rich",
      //       richContent: {
      //         type: "button",
      //         data: {
      //           text: i18n.__({ phrase: "Select product:", locale: "vi" }),
      //           buttons,
      //         },
      //       },
      //       readBy: [],
      //     });
      //     state.state = "product_suggestion";
      //   }
      //   else {

      //     // Tìm kiếm sản phẩm tương tự với logic cải tiến
      //     let similarQuery = {
      //       stock: { $gt: 0 },
      //       price: { $gte: 0 },
      //     };

      //     // Tìm các sản phẩm có tên gần giống (bao gồm các biến thể như iPhone 14 Pro, iPhone 14 Pro Max)
      //     let baseModel = searchValue.trim().split(" ").slice(0, -1).join(" "); // Lấy phần cơ bản, ví dụ "iPhone 14" từ "iPhone 14 Pro"
      //     similarQuery.name = { $regex: `^${baseModel}`, $options: "i" }; // Tìm các sản phẩm bắt đầu bằng "iPhone 14"

      //     if (dialogflowResponse.parameters?.color) {
      //       let requestedColor = dialogflowResponse.parameters.color
      //         .toLowerCase()
      //         .trim()
      //         .replace(/[^a-zA-Z\s-]/g, "");
      //       similarQuery.colors = {
      //         $elemMatch: { $regex: requestedColor, $options: "i" },
      //       };
      //     }

      //     let similarProducts = await Promise.race([
      //       Phone.find(similarQuery)
      //         .lean()
      //         .catch((err) => {
      //           console.error("Error searching similar products:", err.message);
      //           throw new Error("Không thể tìm kiếm sản phẩm tương tự.");
      //         }),
      //       new Promise((_, reject) =>
      //         setTimeout(
      //           () => reject(new Error("Similar search query timed out")),
      //           7000
      //         )
      //       ),
      //     ]);

      //     console.log(
      //       "Found similar products:",
      //       JSON.stringify(similarProducts, null, 2)
      //     );

      //     if (similarProducts.length > 0) {
      //       // Sửa đổi: Hiển thị danh sách gợi ý ngay cả khi chỉ có 1 sản phẩm tương tự
      //       const buttons = similarProducts.map((p) => ({
      //         text: `${p.name} (Giá: ${(p.finalPrice || p.price).toLocaleString(
      //           "vi-VN"
      //         )}đ, Màu: ${p.colors.join(", ")})`,
      //         value: `view_product_${p._id}`,
      //       }));
      //       buttons.push({
      //         text: "Nhập tên sản phẩm khác",
      //         value: "view_product_manual",
      //       });
      //       buttons.push({
      //         text: "Liên hệ hỗ trợ",
      //         value: "contact_support",
      //       });

      //       botMessage = new Message({
      //         _id: new mongoose.Types.ObjectId(),
      //         conversation: conversationId,
      //         isBot: true,
      //         replyTo: replyTo || null,
      //         content: `Không tìm thấy ${searchValue} ${
      //           dialogflowResponse.parameters?.color
      //             ? `màu ${dialogflowResponse.parameters.color}`
      //             : ""
      //         }. Tuy nhiên, dưới đây là các sản phẩm tương tự:`,
      //         type: "rich",
      //         richContent: {
      //           type: "button",
      //           data: {
      //             text: "Chọn sản phẩm:",
      //             buttons,
      //           },
      //         },
      //         readBy: [],
      //       });
      //       state.state = "waiting_for_product_selection";
      //     } else {
      //       // Nếu không tìm thấy sản phẩm tương tự, hiển thị tất cả sản phẩm có sẵn
      //       console.log(
      //         "Fetching all products with enhanced filtering, sorting, and pagination..."
      //       );

      //       let query = { stock: { $gt: 0 }, price: { $gte: 0 } };
      //       if (matchedBrand) {
      //         query.brand = matchedBrand;
      //       }

      //       let page = state.data.page || 0;
      //       const pageSize = 10;

      //       const totalProducts = await Promise.race([
      //         Phone.countDocuments(query).catch((err) => {
      //           console.error("Error counting products:", err.message);
      //           throw new Error("Không thể đếm sản phẩm.");
      //         }),
      //         new Promise((_, reject) =>
      //           setTimeout(
      //             () => reject(new Error("Count query timed out")),
      //             7000
      //           )
      //         ),
      //       ]);
      //       const totalPages = Math.ceil(totalProducts / pageSize);

      //       const allProducts = await Promise.race([
      //         Phone.find(query)
      //           .sort({ finalPrice: 1, sold: -1 })
      //           .skip(page * pageSize)
      //           .limit(pageSize)
      //           .select("name price finalPrice colors specifications stock")
      //           .lean()
      //           .catch((err) => {
      //             console.error("Error fetching products:", err.message);
      //             throw new Error("Không thể lấy danh sách sản phẩm.");
      //           }),
      //         new Promise((_, reject) =>
      //           setTimeout(
      //             () => reject(new Error("Products query timed out")),
      //             7000
      //           )
      //         ),
      //       ]);
      //       console.log(
      //         "Products for page",
      //         page,
      //         ":",
      //         JSON.stringify(allProducts, null, 2)
      //       );

      //       const buttons = allProducts.map((p) => {
      //         const colorsDisplay =
      //           Array.isArray(p.colors) && p.colors.length > 0
      //             ? p.colors.join(", ")
      //             : "Không có màu";
      //         return {
      //           text: `${p.name} (Giá: ${(
      //             p.finalPrice || p.price
      //           ).toLocaleString("vi-VN")}đ, Màu: ${colorsDisplay}, RAM: ${
      //             p.specifications?.ram || "N/A"
      //           })`,
      //           value: `view_product_${p._id}`,
      //         };
      //       });

      //       if (page > 0) {
      //         buttons.push({
      //           text: "Quay lại",
      //           value: `view_more_page_${page - 1}`,
      //         });
      //       }
      //       if (allProducts.length === pageSize && page < totalPages - 1) {
      //         buttons.push({
      //           text: "Xem thêm",
      //           value: `view_more_page_${page + 1}`,
      //         });
      //       }
      //       buttons.push({
      //         text: "Nhập tên sản phẩm khác",
      //         value: "view_product_manual",
      //       });
      //       buttons.push({
      //         text: "Liên hệ hỗ trợ",
      //         value: "contact_support",
      //       });

      //       state.data.page = page;
      //       await state.save().catch((err) => {
      //         console.error("Error saving state:", err.message);
      //         throw new Error("Không thể lưu trạng thái phân trang.");
      //       });

      //       botMessage = new Message({
      //         _id: new mongoose.Types.ObjectId(),
      //         conversation: conversationId,
      //         isBot: true,
      //         replyTo: replyTo || null,
      //         content: i18n.__({
      //           phrase: matchedBrand
      //             ? `Không tìm thấy sản phẩm ${searchTerm}. Dưới đây là các sản phẩm của ${matchedBrand} (Trang ${
      //                 page + 1
      //               }/${totalPages}):`
      //             : `Không tìm thấy sản phẩm ${searchTerm}. Dưới đây là tất cả sản phẩm có sẵn (Trang ${
      //                 page + 1
      //               }/${totalPages}):`,
      //           locale: "vi",
      //         }),
      //         type: "rich",
      //         richContent: {
      //           type: "button",
      //           data: {
      //             text: i18n.__({ phrase: "Chọn sản phẩm:", locale: "vi" }),
      //             buttons:
      //               buttons.length > 0
      //                 ? buttons
      //                 : [
      //                     { text: "Thử lại", value: "view_product_manual" },
      //                     { text: "Liên hệ hỗ trợ", value: "contact_support" },
      //                   ],
      //           },
      //         },
      //         readBy: [],
      //       });
      //       state.state = "waiting_for_product_selection";
      //     }
      //   }
      // }
      else if (
        dialogflowResponse.intent === "search_product" &&
        dialogflowResponse.intent !== "Ask_colors" &&
        (brandMatch || matchedBrand || isSearchRequest)
      ) {
        let query = { stock: { $gt: 0 }, price: { $gte: 0 } };
        let searchValue = searchTerm;

        if (
          dialogflowResponse.parameters &&
          dialogflowResponse.parameters["product-name"]
        ) {
          searchValue = dialogflowResponse.parameters["product-name"];
          if (dialogflowResponse.parameters?.number) {
            searchValue = `${searchValue} ${dialogflowResponse.parameters.number}`;
          }
          console.log("Using product-name from Dialogflow:", searchValue);
        } else if (matchedBrand) {
          query.brand = matchedBrand;
          const productModel = searchTerm
            .toLowerCase()
            .replace(matchedBrand.toLowerCase(), "")
            .trim();
          if (productModel) searchValue = productModel;
        } else if (
          dialogflowResponse.parameters?.number &&
          content.toLowerCase().includes("iphone")
        ) {
          let baseModel = content.toLowerCase().includes("pro")
            ? `iPhone ${dialogflowResponse.parameters.number} Pro`
            : `iPhone ${dialogflowResponse.parameters.number}`;
          searchValue = baseModel;
          console.log("Fallback searchValue:", searchValue);
        }

        // Yêu cầu khớp chính xác tên sản phẩm
        query.name = { $regex: `^${searchValue.trim()}$`, $options: "i" };
        console.log("Constructed name query:", query.name);

        // Cải thiện logic lọc màu sắc để nhận diện "Deep Purple"
        if (dialogflowResponse.parameters?.color) {
          let requestedColor = dialogflowResponse.parameters.color
            .toLowerCase()
            .trim()
            .replace(/[^a-zA-Z\s-]/g, "");
          query.colors = {
            $elemMatch: { $regex: requestedColor, $options: "i" },
          };
          console.log("Constructed color query:", query.colors);
        }

        console.log("Starting product search...");
        console.log(
          "Full query before execution:",
          JSON.stringify(query, null, 2)
        );
        let products = await Promise.race([
          Phone.find(query)
            .lean()
            .catch((err) => {
              console.error("Error searching products:", err.message);
              throw new Error(
                "Không thể tìm kiếm sản phẩm trong cơ sở dữ liệu."
              );
            }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Search query timed out")), 10000)
          ),
        ]);
        console.log(
          "Product search completed:",
          products.length,
          "results found"
        );

        if (products.length === 1) {
          const product = products[0];
          let content = `Chi tiết sản phẩm:\n- Tên: ${
            product.name
          }\n- Giá gốc: ${product.price.toLocaleString(
            "vi-VN"
          )}đ\n- Giá sau giảm: ${(
            product.finalPrice || product.price
          ).toLocaleString("vi-VN")}đ\n- Tồn kho: ${
            product.stock
          } suất\n- Màu sắc: ${product.colors.join(", ")}`;

          if (dialogflowResponse.parameters?.color) {
            let requestedColor = dialogflowResponse.parameters.color
              .toLowerCase()
              .trim()
              .replace(/[^a-zA-Z\s-]/g, "");
            let requestedColorDisplay =
              product.colors.find(
                (color) => color.toLowerCase().trim() === requestedColor
              ) || requestedColor;
            content += `\n- Màu yêu cầu: ${requestedColorDisplay}`;
            const estimatedStockPerColor = Math.floor(
              product.stock / product.colors.length
            );
            if (
              product.stock > 0 &&
              product.colors.some(
                (color) => color.toLowerCase().trim() === requestedColor
              )
            ) {
              if (
                req &&
                req.user &&
                req.user.role &&
                req.user.role.roleName &&
                req.user.role.roleName.toLowerCase() === "admin"
              ) {
                content += `\n- Tình trạng: Còn ${estimatedStockPerColor.toLocaleString(
                  "vi-VN"
                )} sản phẩm với màu ${requestedColorDisplay}.`;
              } else {
                if (!req || !req.user) {
                  console.warn(
                    "req.user is undefined - defaulting to non-admin response. Ensure protect middleware is applied and token is provided."
                  );
                }
                content += `\n- Tình trạng: Còn hàng với màu ${requestedColorDisplay}.`;
              }
            } else {
              content += `\n- Tình trạng: Hết hàng hoặc không có màu ${requestedColorDisplay}.`;
            }
          }
          content += `\n- Thông số: RAM ${
            product.specifications?.ram || "N/A"
          }, Bộ nhớ ${product.specifications?.storage || "N/A"}, Màn hình ${
            product.specifications?.screen || "N/A"
          }`;

          let richContent = {
            type: "button",
            data: {
              text: i18n.__({
                phrase: "What would you like to do?",
                locale: "vi",
              }),
              buttons: [
                { text: "Thêm vào giỏ", value: `add_to_cart_${product._id}` },
                { text: "Xem sản phẩm khác", value: "view_product" },
              ],
            },
          };

          botMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content,
            type: "rich",
            richContent,
            readBy: [],
          });

          state.state = "product_selected";
          state.data.productId = product._id;
        } else if (products.length > 1) {
          const buttons = products.map((p) => ({
            text: `${p.name} (Giá: ${p.finalPrice || p.price}đ, Stock: ${
              p.stock
            })`,
            value: `view_product_${p._id}`,
          }));
          buttons.push({ text: "Xem sản phẩm khác", value: "view_product" });

          botMessage = new Message({
            _id: new mongoose.Types.ObjectId(),
            conversation: conversationId,
            isBot: true,
            replyTo: replyTo || null,
            content: i18n.__({
              phrase: "Multiple matching products found. Please select one:",
              locale: "vi",
            }),
            type: "rich",
            richContent: {
              type: "button",
              data: {
                text: i18n.__({ phrase: "Select product:", locale: "vi" }),
                buttons,
              },
            },
            readBy: [],
          });
          state.state = "product_suggestion";
        } else {
          // Tìm kiếm sản phẩm tương tự với logic cải tiến
          let similarQuery = {
            stock: { $gt: 0 },
            price: { $gte: 0 },
          };

          // Tìm các sản phẩm có tên gần giống (bao gồm các biến thể như iPhone 14 Pro, iPhone 14 Pro Max)
          let baseModel = searchValue.trim().split(" ").slice(0, -1).join(" "); // Lấy phần cơ bản, ví dụ "iPhone 14" từ "iPhone 14 Pro"
          similarQuery.name = { $regex: `^${baseModel}`, $options: "i" }; // Tìm các sản phẩm bắt đầu bằng "iPhone 14"

          if (dialogflowResponse.parameters?.color) {
            let requestedColor = dialogflowResponse.parameters.color
              .toLowerCase()
              .trim()
              .replace(/[^a-zA-Z\s-]/g, "");
            similarQuery.colors = {
              $elemMatch: { $regex: requestedColor, $options: "i" },
            };
          }

          console.log("Starting similar products search...");
          let similarProducts = await Promise.race([
            Phone.find(similarQuery)
              .lean()
              .limit(5) // Giới hạn 5 kết quả để tăng hiệu suất
              .catch((err) => {
                console.error("Error searching similar products:", err.message);
                throw new Error("Không thể tìm kiếm sản phẩm tương tự.");
              }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Similar search query timed out")),
                10000
              )
            ),
          ]);
          console.log(
            "Similar products search completed:",
            similarProducts.length,
            "results found"
          );

          if (similarProducts.length > 0) {
            // Hiển thị danh sách gợi ý ngay cả khi chỉ có 1 sản phẩm tương tự
            const buttons = similarProducts.map((p) => ({
              text: `${p.name} (Giá: ${(p.finalPrice || p.price).toLocaleString(
                "vi-VN"
              )}đ, Màu: ${p.colors.join(", ")})`,
              value: `view_product_${p._id}`,
            }));
            buttons.push({
              text: "Nhập tên sản phẩm khác",
              value: "view_product_manual",
            });
            buttons.push({
              text: "Liên hệ hỗ trợ",
              value: "contact_support",
            });

            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: `Không tìm thấy ${searchValue} ${
                dialogflowResponse.parameters?.color
                  ? `màu ${dialogflowResponse.parameters.color}`
                  : ""
              }. Tuy nhiên, dưới đây là các sản phẩm tương tự:`,
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: "Chọn sản phẩm:",
                  buttons,
                },
              },
              readBy: [],
            });
            state.state = "waiting_for_product_selection";
          } else {
            // Nếu không tìm thấy sản phẩm tương tự, hiển thị tất cả sản phẩm có sẵn
            console.log(
              "Fetching all products with enhanced filtering, sorting, and pagination..."
            );

            let query = { stock: { $gt: 0 }, price: { $gte: 0 } };
            if (matchedBrand) {
              query.brand = matchedBrand;
            }

            let page = state.data.page || 0;
            const pageSize = 10;

            const totalProducts = await Promise.race([
              Phone.countDocuments(query).catch((err) => {
                console.error("Error counting products:", err.message);
                throw new Error("Không thể đếm sản phẩm.");
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Count query timed out")),
                  10000
                )
              ),
            ]);
            const totalPages = Math.ceil(totalProducts / pageSize);

            const allProducts = await Promise.race([
              Phone.find(query)
                .sort({ finalPrice: 1, sold: -1 })
                .skip(page * pageSize)
                .limit(pageSize)
                .select("name price finalPrice colors specifications stock")
                .lean()
                .catch((err) => {
                  console.error("Error fetching products:", err.message);
                  throw new Error("Không thể lấy danh sách sản phẩm.");
                }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Products query timed out")),
                  10000
                )
              ),
            ]);
            console.log(
              "Products for page",
              page,
              ":",
              JSON.stringify(allProducts, null, 2)
            );

            const buttons = allProducts.map((p) => {
              const colorsDisplay =
                Array.isArray(p.colors) && p.colors.length > 0
                  ? p.colors.join(", ")
                  : "Không có màu";
              return {
                text: `${p.name} (Giá: ${(
                  p.finalPrice || p.price
                ).toLocaleString("vi-VN")}đ, Màu: ${colorsDisplay}, RAM: ${
                  p.specifications?.ram || "N/A"
                })`,
                value: `view_product_${p._id}`,
              };
            });

            if (page > 0) {
              buttons.push({
                text: "Quay lại",
                value: `view_more_page_${page - 1}`,
              });
            }
            if (allProducts.length === pageSize && page < totalPages - 1) {
              buttons.push({
                text: "Xem thêm",
                value: `view_more_page_${page + 1}`,
              });
            }
            buttons.push({
              text: "Nhập tên sản phẩm khác",
              value: "view_product_manual",
            });
            buttons.push({
              text: "Liên hệ hỗ trợ",
              value: "contact_support",
            });

            state.data.page = page;
            await state.save().catch((err) => {
              console.error("Error saving state:", err.message);
              throw new Error("Không thể lưu trạng thái phân trang.");
            });

            botMessage = new Message({
              _id: new mongoose.Types.ObjectId(),
              conversation: conversationId,
              isBot: true,
              replyTo: replyTo || null,
              content: i18n.__({
                phrase: matchedBrand
                  ? `Không tìm thấy sản phẩm ${searchTerm}. Dưới đây là các sản phẩm của ${matchedBrand} (Trang ${
                      page + 1
                    }/${totalPages}):`
                  : `Không tìm thấy sản phẩm ${searchTerm}. Dưới đây là tất cả sản phẩm có sẵn (Trang ${
                      page + 1
                    }/${totalPages}):`,
                locale: "vi",
              }),
              type: "rich",
              richContent: {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Chọn sản phẩm:", locale: "vi" }),
                  buttons:
                    buttons.length > 0
                      ? buttons
                      : [
                          { text: "Thử lại", value: "view_product_manual" },
                          { text: "Liên hệ hỗ trợ", value: "contact_support" },
                        ],
                },
              },
              readBy: [],
            });
            state.state = "waiting_for_product_selection";
          }
        }
      } else if (state.state === "waiting_for_product_selection") {
        const productNameMatch =
          dialogflowResponse.parameters["product-name"] ||
          content.toLowerCase().match(/(.+)/);
        const productName = productNameMatch
          ? typeof productNameMatch === "string"
            ? productNameMatch
            : productNameMatch[1].trim()
          : null;

        let query = {
          name: { $regex: productName, $options: "i" },
          stock: { $gt: 0 },
          price: { $gte: 0 },
        };
        if (dialogflowResponse.parameters?.color) {
          let requestedColor =
            dialogflowResponse.parameters.color.toLowerCase();
          requestedColor = requestedColor.replace(/[^a-zA-Z\s-]/g, "");
          query.colors = {
            $elemMatch: {
              $in: [
                requestedColor,
                requestedColor.replace("deep ", ""),
                "deep " + requestedColor,
              ],
            },
          };
        }

        let product = productName
          ? await Promise.race([
              Phone.findOne(query)
                .lean()
                .catch((err) => {
                  console.error(
                    "Error finding product (waiting_for_product_selection):",
                    err.message
                  );
                  throw new Error(
                    "Không thể tìm thấy sản phẩm trong cơ sở dữ liệu."
                  );
                }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Product selection query timed out")),
                  7000
                )
              ),
            ])
          : null;
        console.log("Found product (waiting_for_product_selection):", product);

        let content =
          product && typeof product.price === "number" && product.price >= 0
            ? `Chi tiết sản phẩm:\n- Tên: ${
                product.name
              }\n- Giá gốc: ${product.price.toLocaleString(
                "vi-VN"
              )}đ\n- Giá sau giảm: ${(
                product.finalPrice || product.price
              ).toLocaleString("vi-VN")}đ\n- Tồn kho: ${
                product.stock
              } suất\n- Màu sắc: ${product.colors.join(
                ", "
              )}\n- Thông số: RAM ${
                product.specifications?.ram || "N/A"
              }, Bộ nhớ ${product.specifications?.storage || "N/A"}, Màn hình ${
                product.specifications?.screen || "N/A"
              }`
            : i18n.__({
                phrase:
                  "Product not found. Please check the name or contact support.",
                locale: "vi",
              });
        const richContent =
          product && typeof product.price === "number" && product.price >= 0
            ? {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Choose action:", locale: "vi" }),
                  buttons: [
                    { text: "Xác nhận", value: `add_to_cart_${product._id}` },
                    { text: "Hủy", value: "cancel_order" },
                  ],
                },
              }
            : {
                type: "button",
                data: {
                  text: i18n.__({ phrase: "Choose action:", locale: "vi" }),
                  buttons: [
                    { text: "Liên hệ hỗ trợ", value: "contact_support" },
                  ],
                },
              };
        botMessage = new Message({
          _id: new mongoose.Types.ObjectId(),
          conversation: conversationId,
          isBot: true,
          replyTo: replyTo || null,
          content,
          type: "rich",
          richContent,
          readBy: [],
        });
        state.state = "confirming_order";
        state.data.productId = product?._id;
      } else {
        botMessage = new Message({
          _id: new mongoose.Types.ObjectId(),
          conversation: conversationId,
          isBot: true,
          replyTo: replyTo || null,
          content: i18n.__({
            phrase: "Tôi không hiểu yêu cầu của bạn. Vui lòng nhập cụ thể hơn.",
            locale: "vi",
          }),
          type: "rich",
          richContent: {
            type: "button",
            data: {
              text: i18n.__({ phrase: "Chọn hành động:", locale: "vi" }),
              buttons: [
                { text: "Tìm sản phẩm", value: "view_product_manual" },
                { text: "Liên hệ hỗ trợ", value: "contact_support" },
              ],
            },
          },
          readBy: [],
        });
      }

      // Fallback if botMessage is not created
      if (!botMessage) {
        console.warn(
          "botMessage was not created, creating default error message"
        );
        botMessage = new Message({
          _id: new mongoose.Types.ObjectId(),
          conversation: conversationId,
          isBot: true,
          replyTo: replyTo || null,
          content: i18n.__({
            phrase: "Có lỗi xảy ra. Vui lòng thử lại.",
            locale: "vi",
          }),
          type: "system",
          readBy: [],
        });
      }

      // Save state and message with error handling
      await state.save().catch((err) => {
        console.error("Error saving conversation state:", err.message);
        throw new Error("Không thể lưu trạng thái cuộc hội thoại.");
      });
      console.log("Saved conversation state:", state.state);

      await botMessage.save().catch((err) => {
        console.error("Error saving bot message:", err.message);
        throw new Error("Không thể lưu tin nhắn bot.");
      });
      console.log("Saved bot message:", botMessage.content);

      await saveMessageToFirestore(botMessage.toObject()).catch((err) => {
        console.error("Error saving to Firestore:", err.message);
        throw new Error("Không thể lưu tin nhắn vào Firestore.");
      });
      console.log("Saved message to Firestore");

      const simulatedMessages = [];
      if (
        botMessage.type === "rich" &&
        botMessage.richContent?.type === "button" &&
        simulateAction
      ) {
        const buttons = botMessage.richContent.data.buttons;
        const currentProductId = state.data.productId;
        const simulatedMessage = await simulateButtonClick(
          buttons,
          simulateAction,
          currentProductId
        );
        if (simulatedMessage) {
          simulatedMessages.push(simulatedMessage.botMessage);
        }
      }

      await botMessage.populate("sender", "username email").catch((err) => {
        console.error("Error populating sender:", err.message);
        throw new Error("Không thể lấy thông tin người gửi.");
      });

      if (botMessage.replyTo) {
        await botMessage.populate("replyTo", "content sender").catch((err) => {
          console.error("Error populating replyTo:", err.message);
          throw new Error("Không thể lấy thông tin tin nhắn trả lời.");
        });
        if (!botMessage.replyTo) {
          console.log(
            `Warning: replyTo message ${replyTo} not found in database.`
          );
        }
      }

      io.to(conversationId).emit("newMessage", botMessage);
      console.log(
        "Emitted newMessage to conversationId:",
        conversationId,
        "with content:",
        botMessage.content
      );
      if (!io.sockets.adapter.rooms.has(conversationId)) {
        console.warn("No clients in room:", conversationId);
      }

      return { botMessage, simulatedMessages };
    })();

    return await Promise.race([mainPromise, timeoutPromise]).catch((err) => {
      console.error("Error in handleBotConversation:", err.message);
      const errorMessage = new Message({
        _id: new mongoose.Types.ObjectId(),
        conversation: conversationId,
        isBot: true,
        replyTo: replyTo || null,
        content: i18n.__({
          phrase: "Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.",
          locale: "vi",
        }),
        type: "system",
        readBy: [],
      });
      io.to(conversationId).emit("newMessage", errorMessage);
      throw err;
    });
  }
);
// Controller chính
const sendMessage = asyncHandler(async (req, res) => {
  console.log("Request received at:", new Date().toISOString());
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  console.log("Uploaded File:", req.file ? req.file : "No file uploaded");
  console.log(
    "Multer Error:",
    req.multerError ? req.multerError : "No Multer error"
  );

  const {
    conversationId,
    content,
    replyTo,
    action,
    isBotConversation,
    type,
    simulateAction,
    locale = "vi",
    webhookUrl,
  } = req.body || {};
  const senderId = req.user?._id || req.user?.userId;
  console.log("Sender ID:", senderId?.toString());

  let message = null;
  let conversation = null;

  try {
    // Xác thực dữ liệu đầu vào
    validateRequest({ conversationId, senderId });

    // Kiểm tra quyền truy cập
    conversation = await checkConversationAccess(
      conversationId,
      senderId,
      isBotConversation
    );

    // Xử lý file đính kèm
    if (type === "file" && !req.file) {
      return handleError(
        res,
        400,
        "File required for type 'file'",
        null,
        locale
      );
    }
    const { attachmentBinary, attachmentType } = await processAttachment(
      req.file
    );

    // Xác định loại tin nhắn
    const messageType = determineMessageType(type, attachmentType);
    console.log("Message type determined:", messageType);

    // Tạo và lưu tin nhắn
    message = await createAndSaveMessage({
      conversationId,
      senderId,
      content,
      attachmentBinary,
      attachmentType,
      type: messageType,
      replyTo,
      isBotConversation,
    });

    // Cập nhật trạng thái cuộc hội thoại
    await updateConversation(conversation, message);

    // Gửi thông báo
    await sendNotification(conversationId, senderId, content, conversation);

    // Populate dữ liệu và gửi qua socket
    await message.populate("sender", "username email");
    if (message.replyTo) {
      await message.populate("replyTo", "content sender");
    }
    io.to(conversationId).emit("newMessage", message);
    console.log("User message emitted to room:", conversationId);

    // Gọi webhook nếu có
    if (webhookUrl) {
      await triggerWebhook(webhookUrl, {
        event: "new_message",
        conversationId,
        senderId,
        message: message.toObject(),
      });
    }

    // Xử lý bot nếu cần
    let botResponse = null;
    if (isBotConversation) {
      botResponse = await handleBotConversation({
        conversationId,
        senderId,
        content,
        replyTo,
        action,
        simulateAction,
        io,
      });
    }

    // Xóa cache Redis
    await clearRedisCache(conversationId, conversation.participants);

    // Trả về kết quả
    return res.status(201).json({
      success: true,
      message,
      ...(botResponse && {
        botMessage: botResponse.botMessage,
        simulatedMessages:
          (botResponse.simulatedMessages || []).length > 0
            ? botResponse.simulatedMessages
            : undefined,
      }),
    });
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    if (
      message &&
      error.message ===
        i18n.__({
          phrase: "Content contains special characters. Please try again.",
          locale: "vi",
        })
    ) {
      await Message.findByIdAndDelete(message._id);
    }
    if (
      error.message ===
      i18n.__({
        phrase: "Content contains special characters. Please try again.",
        locale: "vi",
      })
    ) {
      return handleError(res, 400, error.message, null, locale);
    }
    return handleError(
      res,
      error.message.includes("Authentication required")
        ? 401
        : error.message.includes("not found")
        ? 404
        : error.message.includes("participant")
        ? 403
        : 500,
      error.message,
      error,
      locale
    );
  }
});

// Chỉnh sửa tin nhắn
// Xóa tin nhắn
const editMessage = asyncHandler(async (req, res) => {
  const { messageId, content } = req.body;
  const userId = req.user._id;

  const message = await Message.findById(messageId);
  if (!message) {
    return res
      .status(404)
      .json({ success: false, message: "Message not found" });
  }

  if (
    message.isBot ||
    (message.sender && message.sender.toString() !== userId.toString())
  ) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to edit this message",
    });
  }

  if (!content) {
    return res
      .status(400)
      .json({ success: false, message: "Content cannot be empty" });
  }

  message.content = content;
  message.isEdited = true;
  message.updatedAt = Date.now();
  await message.save();

  await message.populate("sender", "username email");
  if (message.replyTo) {
    await message.populate("replyTo", "content sender");
  }

  io.to(message.conversation.toString()).emit("messageUpdated", message);

  // Invalidate cache
  await redisClient.del(`messages:${message.conversation.toString()}`);

  res.status(200).json({ success: true, message });
});

// Xóa tin nhắn
// Đánh dấu tin nhắn đã đọc
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId).populate("conversation");
  if (!message) {
    return res
      .status(404)
      .json({ success: false, message: "Message not found" });
  }

  if (
    message.isBot ||
    (message.sender && message.sender.toString() !== userId.toString())
  ) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to delete this message",
    });
  }

  // Xóa file đính kèm trên Firebase (nếu có)
  if (message.attachment) {
    await deleteFile(message.attachment);
  }

  const conversation = message.conversation;

  await message.deleteOne();

  // Cập nhật lastMessage của cuộc hội thoại
  const lastMessage = await Message.findOne({
    conversation: conversation._id,
  }).sort({ createdAt: -1 });
  conversation.lastMessage = lastMessage ? lastMessage._id : null;
  conversation.updatedAt = Date.now();
  await conversation.save();

  io.to(conversation._id.toString()).emit("messageDeleted", messageId);

  // Invalidate caches
  await redisClient.del(`messages:${conversation._id.toString()}`);
  for (const participant of conversation.participants) {
    await redisClient.del(`conversations:${participant.id.toString()}`);
  }

  res.status(200).json({ success: true, message: "Message deleted" });
});

// Đánh dấu tin nhắn đã đọc
// Thêm hoặc xóa reaction cho tin nhắn
const markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId).populate("conversation");
  if (!message) {
    return res
      .status(404)
      .json({ success: false, message: "Message not found" });
  }

  // Check if user is a participant, handling both schemas
  const isParticipant = message.conversation.participants.some((p) => {
    // Case 1: p is an ObjectId (old schema)
    if (p instanceof mongoose.Types.ObjectId) {
      return p.toString() === userId.toString();
    }
    // Case 2: p is an object with id (new schema)
    if (p.id && mongoose.Types.ObjectId.isValid(p.id)) {
      return p.id.toString() === userId.toString();
    }
    return false;
  });

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: "You are not a participant in this conversation",
    });
  }

  // Thêm userId vào readBy nếu chưa có
  if (!message.readBy.includes(userId)) {
    message.readBy.push(userId);
    await message.save();

    // Update unreadCounts
    const conversation = message.conversation;
    // Initialize unreadCounts if undefined
    if (!conversation.unreadCounts) {
      const unreadCounts = new Map();
      conversation.participants.forEach((p) => {
        const participantId = p.id ? p.id.toString() : p.toString();
        unreadCounts.set(participantId, 0);
      });
      conversation.unreadCounts = unreadCounts;
    }

    const currentUnread = conversation.unreadCounts.get(userId.toString()) || 0;
    if (currentUnread > 0) {
      conversation.unreadCounts.set(userId.toString(), currentUnread - 1);
      await conversation.save();
    }
  }

  io.to(message.conversation._id.toString()).emit("messageRead", {
    messageId,
    userId,
  });

  // Invalidate caches
  await redisClient.del(`messages:${message.conversation._id.toString()}`);
  for (const participant of message.conversation.participants) {
    const participantId = participant.id
      ? participant.id.toString()
      : participant.toString();
    await redisClient.del(`conversations:${participantId}`);
  }

  res.status(200).json({ success: true, message: "Message marked as read" });
});

// Thêm hoặc xóa reaction cho tin nhắn
const addReaction = asyncHandler(async (req, res) => {
  const { messageId, reaction } = req.body;
  const userId = req.user._id;

  const message = await Message.findById(messageId).populate("conversation");
  if (!message) {
    return res
      .status(404)
      .json({ success: false, message: "Message not found" });
  }

  // Check if user is a participant, handling both schemas
  const isParticipant = message.conversation.participants.some((p) => {
    // Case 1: p is an ObjectId (old schema)
    if (p instanceof mongoose.Types.ObjectId) {
      return p.toString() === userId.toString();
    }
    // Case 2: p is an object with id (new schema)
    if (p.id && mongoose.Types.ObjectId.isValid(p.id)) {
      return p.id.toString() === userId.toString();
    }
    return false;
  });

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: "You are not a participant in this conversation",
    });
  }

  const validReactions = ["like", "love", "haha", "wow", "sad", "angry"];
  if (!validReactions.includes(reaction)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid reaction" });
  }

  const existingReaction = message.reactions.find(
    (r) => r.user.toString() === userId.toString()
  );

  if (existingReaction) {
    if (existingReaction.reaction === reaction) {
      message.reactions = message.reactions.filter(
        (r) => r.user.toString() !== userId.toString()
      );
    } else {
      existingReaction.reaction = reaction;
    }
  } else {
    message.reactions.push({ user: userId, reaction });
  }

  message.updatedAt = Date.now();
  await message.save();

  await message.populate("reactions.user", "username");
  io.to(message.conversation._id.toString()).emit(
    "reactionUpdated",
    message.reactions
  );

  await redisClient.del(`messages:${message.conversation._id.toString()}`);

  res.status(200).json({ success: true, reactions: message.reactions });
});

module.exports = {
  setIo,
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessageAsRead,
  addReaction,
};
