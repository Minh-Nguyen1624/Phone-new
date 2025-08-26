const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true, // Ví dụ: "Lắp đặt tiêu chuẩn", "Bảo hành mở rộng"
  },
  description: {
    type: String,
    default: "",
  },
  fee: {
    type: Number,
    default: 0,
    min: 0,
  },
  isRequired: {
    type: Boolean,
    default: false, // true nếu dịch vụ bắt buộc (VD: phí vận chuyển)
  },
  duration: {
    type: String,
    default: "", // VD: "12 tháng", "24 giờ"
  },
  serviceType: {
    type: String,
    enum: ["installation", "warranty", "delivery", "other"],
    default: "other",
  },
  active: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Service", serviceSchema);
