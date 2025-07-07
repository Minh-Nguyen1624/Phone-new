const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: ["info", "warning", "error", "success", "promotion", "system"], // Bổ sung các loại thông báo phổ biến
      default: "info",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true, // Tạo chỉ mục để truy vấn nhanh hơn khi lọc thông báo đã đọc/chưa đọc
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL cho thông báo
    isGlobal: { type: Boolean, default: false }, // Thông báo toàn hệ thống
    meta: {
      // Thêm thông tin phụ, tùy chỉnh theo nhu cầu
      data: { type: mongoose.Schema.Types.Mixed }, // Lưu trữ dữ liệu JSON linh hoạt (e.g., IDs, URLs)
      actionUrl: { type: String, trim: true }, // Đường dẫn để chuyển hướng khi người dùng bấm vào thông báo
    },
    scheduledAt: { type: Date, required: true }, // Thêm trường scheduledAt
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
