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
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// addressSchema.pre("save", async function (next) {
//   if (this.isDefault) {
//     await mongoose
//       .model("Address")
//       .updateMany(
//         { user: this.user, _id: { $ne: this._id } },
//         { isDefault: false }
//       );
//   }
//   next();
// });

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

// Middleware để tự động thêm tọa độ từ Google Maps API
// const axios = require("axios");

// addressSchema.pre("save", async function (next) {
//   if ((!this.latitude || !this.longitude) && this.street && this.city) {
//     try {
//       const response = await axios.get(
//         `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
//           `${this.street}, ${this.city}, ${this.country}`
//         )}&key=${process.env.GOOGLE_API_KEY}`
//       );
//       const location = response.data.results[0]?.geometry?.location;
//       if (location) {
//         this.latitude = location.lat;
//         this.longitude = location.lng;
//       }
//     } catch (error) {
//       console.error("Error fetching coordinates:", error.message);
//     }
//   }
//   next();
// });

// Index để tối ưu hóa tìm kiếm
addressSchema.index({ user: 1, isDefault: 1 });

// addressSchema.pre("save", async function (next) {
//   if (this.street && this.city && this.country) {
//     try {
//       const response = await axios.get(
//         `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
//           `${this.street}, ${this.city}, ${this.country}`
//         )}&key=YOUR_GOOGLE_API_KEY`
//       );

//       const result = response.data.results[0];
//       if (result) {
//         const location = result.geometry.location;
//         const addressComponents = result.address_components;

//         // Gắn tọa độ
//         this.latitude = location.lat;
//         this.longitude = location.lng;

//         // Gắn thêm thông tin từ API
//         addressComponents.forEach((component) => {
//           if (component.types.includes("administrative_area_level_1")) {
//             this.province = component.long_name; // Tỉnh/thành phố
//           }
//           if (component.types.includes("administrative_area_level_2")) {
//             this.district = component.long_name; // Quận/huyện
//           }
//           if (component.types.includes("locality")) {
//             this.city = component.long_name; // Thành phố
//           }
//         });
//       }
//     } catch (error) {
//       console.error("Error fetching address details:", error.message);
//     }
//   }
//   next();
// });

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
