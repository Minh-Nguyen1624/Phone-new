const mongoose = require("mongoose");
require("dotenv").config();

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientName: { type: String, required: true, trim: true }, // Tên người nhận
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[0-9]{10,11}$/.test(v); // Số điện thoại 10-11 số
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    ward: { type: String, trim: true }, // Thêm phường
    province: { type: String, trim: true }, // Thêm tỉnh/thành phố
    postalCode: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[0-9]{4,6}$/.test(v); // Mã bưu chính từ 4-6 số
        },
        message: (props) => `${props.value} is not a valid postal code!`,
      },
    },
    // country: { type: String, required: true, trim: true },
    country: {
      type: String,
      required: true,
      trim: true,
      enum: ["Vietnam", "USA", "Canada", "Australia", "Other"], // Tùy chỉnh danh sách
      default: "Vietnam", // Mặc định là Việt Nam
    },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    // isDefault: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["shipping", "billing", "other"],
      default: "shipping",
    },
    isPublic: { type: Boolean, default: false },
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false },
    isDefaultOther: { type: Boolean, default: false }, // Thêm cho "other"
  },
  {
    timestamps: true,
  }
);

// Middleware để cập nhật `isDefault` cho địa chỉ
addressSchema.pre("save", async function (next) {
  if (this.isDefault) {
    await mongoose
      .model("Address")
      .updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { isDefault: false }
      );
  }
  if (this.isDefaultBilling) {
    await mongoose
      .model("Address")
      .updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { isDefaultBilling: false }
      );
  }
  next();
});

// Index để tối ưu hóa tìm kiếm
addressSchema.index({ user: 1, isDefault: 1 });

// Chuẩn hóa trước khi lưu
const capitalizeWords = (str) => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
addressSchema.pre("save", function (next) {
  if (this.city) this.city = capitalizeWords(this.city);
  if (this.district) this.district = capitalizeWords(this.district);
  if (this.province) this.province = capitalizeWords(this.province);
  next();
});
// addressSchema.index({ user: 1, isDefaultShipping: 1 });
module.exports = mongoose.model("Address", addressSchema);
