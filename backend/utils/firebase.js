const { initializeApp: adminInitializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
// const serviceAccount = require("../config/serviceAccountKey.json");
// const serviceAccount = require("../config/shopeeapp-cc221-4ff2659a269d.json");
const serviceAccount = require("../config/sample-firebase-ai-app-c894e-a7ac9956fd35.json");

// Initialize Firebase Admin SDK for Firestore
const adminApp = adminInitializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = getFirestore(adminApp);
console.log(
  "Admin SDK initialized with Project ID:",
  serviceAccount.project_id
);

// Kiểm tra kết nối Firestore (thêm để đảm bảo hoạt động)
(async () => {
  try {
    const snapshot = await db.collection("messages").limit(1).get();
    console.log(
      "Firestore connection test:",
      snapshot.empty ? "No data" : "Connected"
    );
  } catch (error) {
    console.error("Firestore connection failed:", error.message);
  }
})();

// Convert stream to buffer
const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", (err) => {
      console.error("Stream error details:", {
        message: err.message,
        stack: err.stack,
        event: "data_error",
      });
      reject(err);
    });
    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      console.log("Stream converted to buffer, size:", buffer.length);
      resolve(buffer);
    });
  });
};

// Upload file to Firestore as Base64
const uploadFile = async (fileStream, fileName, mimetype, req) => {
  let attachmentBinary;

  try {
    if (!fileStream) throw new Error("File stream is required");
    if (!fileName || typeof fileName !== "string" || fileName.trim() === "")
      throw new Error("File name is required and must be a non-empty string");
    if (!mimetype || typeof mimetype !== "string")
      throw new Error("MIME type is required and must be a string");

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const buffer = await streamToBuffer(fileStream);
    const MAX_FIRESTORE_SIZE = 750 * 1024; // 750KB limit for Firestore

    if (buffer.length > MAX_FIRESTORE_SIZE) {
      throw new Error(
        `File size (${buffer.length} bytes) exceeds Firestore limit of ${
          MAX_FIRESTORE_SIZE / 1024
        }KB`
      );
    }
    if (buffer.length === 0) {
      throw new Error("File buffer is empty");
    }

    // Convert file to Base64
    attachmentBinary = buffer.toString("base64");
    console.log("File converted to Base64, size:", buffer.length);

    // Optionally store file metadata in a separate 'attachments' collection
    const attachmentDoc = {
      fileName: sanitizedFileName,
      mimetype,
      size: buffer.length,
      createdAt: new Date().toISOString(),
      attachmentBinary,
    };

    const attachmentRef = db
      .collection("attachments")
      .doc(`${timestamp}-${sanitizedFileName}`);
    await attachmentRef.set(attachmentDoc);
    console.log("File metadata saved to Firestore with ID:", attachmentRef.id);

    return { filePath: null, url: null, attachmentBinary };
  } catch (error) {
    console.error("File upload error:", {
      message: error.message,
      code: error.code || "N/A",
      serverResponse: error.serverResponse || "No server response",
      stack: error.stack || "N/A",
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Save message to Firestore
const saveMessageToFirestore = async (message) => {
  try {
    // Kiểm tra đầu vào cơ bản
    if (!message) throw new Error("Message object is undefined or null");
    if (!message._id) throw new Error("Message _id is missing");
    if (!message.conversation)
      throw new Error("Message conversation is missing");
    if (!Array.isArray(message.readBy))
      throw new Error("Message readBy is not an array");

    // Chuẩn bị dữ liệu để lưu vào Firestore
    const messageData = {
      ...message,
      _id: message._id.toString(), // Chuyển đổi ObjectId thành chuỗi
      conversation: message.conversation.toString(), // Chuyển đổi ObjectId thành chuỗi
      sender: message.isBot ? null : message.sender?.toString() || null, // Chuyển đổi ObjectId thành chuỗi nếu có
      readBy: message.readBy
        .map((id) => (id ? id.toString() : ""))
        .filter(Boolean), // Chuyển đổi mảng ObjectId thành mảng chuỗi
      createdAt: message.createdAt
        ? message.createdAt.toISOString()
        : new Date().toISOString(), // Định dạng thời gian
      updatedAt: message.updatedAt
        ? message.updatedAt.toISOString()
        : new Date().toISOString(), // Định dạng thời gian
      kind: message.type || "text", // Lưu loại tin nhắn
      deleted: message.deleted || false, // Trạng thái xóa
      attachmentBinary: message.attachmentBinary || null, // Lưu dữ liệu Base64
      attachmentType: message.attachmentType || null, // Lưu loại file
      // Xử lý trường replyTo
      replyTo: message.replyTo ? message.replyTo.toString() : null, // Chuyển đổi ObjectId thành chuỗi
      // Xử lý richContent nếu có
      richContent: message.richContent
        ? JSON.stringify(message.richContent)
        : null, // Chuyển đổi object thành chuỗi JSON
      isBot: message.isBot || false, // Trạng thái bot
      botName: message.botName || null, // Tên bot
    };

    // Lưu vào Firestore
    const docRef = db.collection("messages").doc(messageData._id);
    await docRef.set(messageData, { merge: true });
    console.log(
      "Message saved to Firestore with ID:",
      messageData._id,
      "Kind:",
      messageData.kind
    );
  } catch (error) {
    console.error("Error saving message to Firestore:", {
      message: error.message,
      code: error.code || "N/A",
      stack: error.stack || "N/A",
      messageId: message?._id || "N/A",
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Failed to save message to Firestore: ${error.message}`);
  }
};

// Save conversation to Firestore
const saveConversationToFirestore = async (conversation) => {
  try {
    if (!conversation)
      throw new Error("Conversation object is undefined or null");
    if (!conversation._id) throw new Error("Conversation _id is missing");
    if (!Array.isArray(conversation.participants))
      throw new Error("Conversation participants is not an array");

    const conversationData = {
      ...conversation,
      _id: conversation._id.toString(),
      participants: conversation.participants.map((p) => ({
        id: p.id.toString(),
        username: p.username,
      })),
      lastMessage: conversation.lastMessage?.toString() || null,
      updatedAt: conversation.updatedAt
        ? conversation.updatedAt.toISOString()
        : new Date().toISOString(),
      unreadCounts: Object.fromEntries(conversation.unreadCounts || new Map()),
    };

    const docRef = db.collection("conversations").doc(conversationData._id);
    await docRef.set(conversationData, { merge: true });
    console.log(
      "Conversation saved to Firestore with ID:",
      conversationData._id
    );
  } catch (error) {
    console.error("Error saving conversation to Firestore:", {
      message: error.message,
      code: error.code || "N/A",
      stack: error.stack || "N/A",
      conversationId: conversation?._id || "N/A",
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to save conversation to Firestore: ${error.message}`
    );
  }
};

module.exports = {
  uploadFile,
  saveMessageToFirestore,
  saveConversationToFirestore,
};
