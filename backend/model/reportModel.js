const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters"],
    },
    details: {
      type: String,
      required: true,
      minlength: 10, // Đảm bảo chi tiết báo cáo có nội dung
      maxlength: 1000, // Giới hạn nội dung không quá dài
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    category: {
      type: String,
      enum: ["complaint", "feedback", "technical_issue", "other"],
      default: "other",
    },
    reportedSubject: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "reportedModel",
      required: function () {
        return this.reportedModel !== "Other";
      }, // Chỉ yêu cầu đối tượng được báo cáo khi báo cáo không phải là "khác"
    },
    reportedModel: {
      type: String,
      enum: ["Product", "Order", "User", "Other", "Review"], // Liên kết với các đối tượng báo cáo (ví dụ: sản phẩm, đơn hàng, người dùng)
      required: true,
      default: "Other",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);
