// model/conversationModel.js
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    name: {
      type: String, // Tên cuộc hội thoại (dành cho chat nhóm)
      default: null,
    },
    type: {
      type: String,
      enum: ["one-to-one", "group"], // Loại hội thoại
      default: "one-to-one",
    },
    isMuted: {
      type: Boolean,
      default: false, // Trạng thái tắt thông báo
    },
  },
  { timestamps: true } // Tự động tạo createdAt và updatedAt
);

// Validation: Đảm bảo có ít nhất 2 người tham gia
conversationSchema.path("participants").validate(function (value) {
  return value.length >= 2;
}, "A conversation must have at least 2 participants.");

// Index để tăng hiệu suất truy vấn
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessage: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
