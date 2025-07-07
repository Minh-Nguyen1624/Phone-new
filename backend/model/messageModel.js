// // model/messageModel.js
// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema(
//   {
//     conversation: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Conversation",
//       required: true,
//     },
//     sender: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       // required: true,
//       required: false, // Bỏ yêu cầu bắt buộc
//     },
//     isBot: {
//       type: Boolean,
//       default: false, // Xác định tin nhắn từ bot
//     },
//     botName: {
//       type: String, // Tên bot, nếu isBot là true
//       default: null,
//     },
//     content: {
//       type: String,
//     },
//     attachment: {
//       type: String, // Đường dẫn file trên Firebase Storage
//       default: null,
//     },
//     attachmentBinary: {
//       type: Buffer, // Fallback để lưu file dưới dạng binary nếu Firebase thất bại
//       default: null,
//     },
//     attachmentType: {
//       type: String, // Loại file: image, pdf, doc, v.v.
//       enum: ["image", "pdf", "doc", "other"],
//       default: null,
//     },
//     type: {
//       type: String,
//       enum: ["text", "image", "file", "system", "rich"], // Loại tin nhắn
//       default: "text",
//     },
//     richContent: {
//       type: {
//         type: String,
//         enum: ["button", "card", "carousel"], // Hỗ trợ rich message
//       },
//       data: mongoose.Schema.Types.Mixed, // Dữ liệu tùy chỉnh (nút bấm, thẻ, v.v.)
//     },
//     replyTo: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Message", // Tin nhắn mà tin nhắn này trả lời
//       default: null,
//     },
//     readBy: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//       },
//     ],
//     reactions: [
//       {
//         user: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "User",
//         },
//         reaction: {
//           type: String,
//           enum: ["like", "love", "haha", "wow", "sad", "angry"],
//           required: true,
//         },
//       },
//     ],
//     isEdited: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// // Validation: Đảm bảo tin nhắn có ít nhất content hoặc attachment hoặc richContent
// messageSchema.pre("validate", function (next) {
//   if (!this.content && !this.attachment && !this.richContent) {
//     next(
//       new Error("Message must have either content, attachment, or richContent")
//     );
//   }
//   // Nếu là tin nhắn từ bot, gán botName mặc định nếu chưa có
//   if (this.isBot && !this.botName) {
//     this.botName = "SupportBot"; // Đặt tên mặc định cho bot
//   }
//   // Đảm bảo sender không được cung cấp nếu isBot là true
//   if (this.isBot && this.sender) {
//     this.sender = undefined; // Xóa sender nếu tin nhắn từ bot
//   }
//   next();
// });

// // Index để tăng hiệu suất truy vấn
// messageSchema.index({ conversation: 1, createdAt: 1 });
// messageSchema.index({ sender: 1 });

// module.exports = mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Bỏ yêu cầu bắt buộc
    },
    isBot: {
      type: Boolean,
      default: false, // Xác định tin nhắn từ bot
    },
    botName: {
      type: String, // Tên bot, nếu isBot là true
      default: null,
    },
    content: {
      type: String,
    },
    attachment: {
      type: String, // Đường dẫn file trên Firebase Storage
      default: null,
    },
    attachmentBinary: {
      type: String, // Fallback để lưu file dưới dạng Base64 nếu Firebase thất bại
      default: null,
    },
    attachmentType: {
      type: String, // Loại file: image, pdf, doc, v.v.
      enum: ["image", "pdf", "doc", "other"],
      default: null,
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "system", "rich"], // Loại tin nhắn
      default: "text",
    },
    richContent: {
      type: {
        type: String,
        enum: ["button", "card", "carousel"], // Hỗ trợ rich message
      },
      data: mongoose.Schema.Types.Mixed, // Dữ liệu tùy chỉnh (nút bấm, thẻ, v.v.)
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message", // Tin nhắn mà tin nhắn này trả lời
      default: null,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reaction: {
          type: String,
          enum: ["like", "love", "haha", "wow", "sad", "angry"],
          required: true,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Validation: Đảm bảo tin nhắn có ít nhất content hoặc attachment hoặc richContent
messageSchema.pre("validate", function (next) {
  if (
    !this.content &&
    !this.attachment &&
    !this.richContent &&
    !this.attachmentBinary
  ) {
    next(
      new Error(
        "Message must have either content, attachment, attachmentBinary, or richContent"
      )
    );
  }
  // Nếu là tin nhắn từ bot, gán botName mặc định nếu chưa có
  if (this.isBot && !this.botName) {
    this.botName = "SupportBot"; // Đặt tên mặc định cho bot
  }
  // Đảm bảo sender không được cung cấp nếu isBot là true
  if (this.isBot && this.sender) {
    this.sender = undefined; // Xóa sender nếu tin nhắn từ bot
  }
  next();
});

// Index để tăng hiệu suất truy vấn
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", messageSchema);
