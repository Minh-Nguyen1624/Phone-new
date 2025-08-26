const mongoose = require("mongoose");
const validator = require("validator");
// const bcrypt = require("bcrypt");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 100,
      // match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      validate: [validator.isEmail, "Invalid email format"],
    },
    password: {
      type: String,
      required: true,
      //  minlength: 8,
      select: false,
    },
    phone: {
      type: String,
      required: true,
      // match: [/^\d{10,15}$/, "Invaalid phone number"],
      validate: [validator.isMobilePhone, "Invalid phone number"],
    },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    // address: {
    //   street: { type: String, default: null, trim: true },
    //   district: { type: String, default: null, trim: true },
    //   city: { type: String, default: null, trim: true },
    //   country: { type: String, default: null, trim: true },
    // },
    address: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    // emailVerified: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    lastLogin: { type: Date },
    // role: { type: String, enum: ["admin", "user"], required: true },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role", // Liên kết với Role schema
      required: true,
      // enum: ["admin", "user"],
    },

    // order: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Order",
    //   },
    // ],
    order: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
      default: [], // Đảm bảo giá trị mặc định là mảng rỗng
    },
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
    notifications: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Notification",
        },
      ],
      default: [],
    },
    // transaction: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Transaction",
    // },
    transaction: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        default: [], // Thêm default: [] để đảm bảo transaction là mảng
      },
    ],
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: true,
    },
    isProfileComplete: { type: Boolean, default: false }, // Thêm cờ này
    // Thêm các trường reset mật khẩu
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    tiktokId: {
      type: String,
      unique: true,
      sparse: true,
      required: false,
    },
    // Thêm các trường cho xác minh
    isVerified: { type: Boolean, default: false }, // Trạng thái xác minh
    verificationToken: { type: String }, // Token xác minh
    verificationTokenExpires: { type: Date }, // Thời gian hết hạn token
    // 🔹 Thêm trường tích điểm
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // auto-create createdAt and updatedAt fields
  }
);

// Hàm tiền xử lý trước khi lưu user (hash mật khẩu)
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) {
//     return next();
//   }

//   try {
//     console.log("🔹 Mật khẩu trước khi hash:", this.password);
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     console.log("Hashed Password:", this.password);
//     next();
//   } catch (error) {
//     console.error("⚠️ Lỗi khi hash mật khẩu:", error);
//     next(error);
//   }
// });

// So sánh mật khẩu người dùng nhập với mật khẩu đã hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  // return await bcrypt.compare(candidatePassword, this.password);
  // if (!this.password) return false; // Nếu không có password trong DB
  // return bcrypt.compare(candidatePassword, this.password);
  // console.log("Mật khẩu nhập:", candidatePassword);
  // console.log("Mật khẩu trong DB:", this.password);
  // console.log("Kết quả so sánh:", this.password === candidatePassword);
  // const result = await bcrypt.compare(candidatePassword, this.password);
  // console.log("Kết quả so sánh:", result);

  // return result;

  if (!this.password) {
    console.error("⚠️ Lỗi: Mật khẩu trong DB không tồn tại!");
    return false;
  }

  // console.log("🔹 Mật khẩu nhập:", candidatePassword);
  // console.log("🔹 Hash trong DB:", this.password);

  try {
    const result = await bcrypt.compare(candidatePassword, this.password);
    // const result = await bcrypt.compare("SecurePass123!@", this.password);
    console.log("🔹 Kết quả so sánh:", result);
    return result;
  } catch (error) {
    console.error("⚠️ Lỗi bcrypt.compare:", error);
    return false;
  }
};

// **Ẩn trường nhạy cảm khi trả về dữ liệu người dùng**
userSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    delete ret.password; // Xóa trường password khỏi dữ liệu trả về
    delete ret.__v; // Xóa trường __v (version key của MongoDB)
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
