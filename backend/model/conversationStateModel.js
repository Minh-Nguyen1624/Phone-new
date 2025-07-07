const mongoose = require("mongoose");

const conversationStateSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  state: {
    type: String, // Ví dụ: "waiting_for_product_selection"
  },
  data: mongoose.Schema.Types.Mixed, // Lưu thông tin tạm thời
  updatedAt: { type: Date, default: Date.now },
});

conversationStateSchema.index({ conversation: 1, user: 1 });

module.exports = mongoose.model("ConversationState", conversationStateSchema);
