const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true, // Tên vai trò, ví dụ: "admin", "user"
      minlength: [3, "Role name must be at least 3 characters long"],
      maxlength: [50, "Role name must not exceed 50 characters"],
      enum: ["admin", "user", "manager", "staff"], // Chỉ cho phép 2 giá trị: "admin" hoặc "user"
    },
    description: {
      type: String,
      default: "",
      trim: true, // Mô tả vai trò
      maxlength: [200, "Description must not exceed 200 characters"],
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
        // required: true,
      },
    ],
    isDefault: {
      type: Boolean,
      default: false, // Đánh dấu đây là vai trò mặc định hay không
    },
  },
  {
    timestamps: true, // Auto tạo trường createdAt và updatedAt
  }
);

module.exports = mongoose.model("Role", roleSchema);
