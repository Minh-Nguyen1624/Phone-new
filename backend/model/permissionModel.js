const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    permissionName: {
      type: String,
      required: [true, "Permission name is required"],
      unique: true,
      trim: true,
      minlength: [3, "Permission name must be at least 3 characters long"],
      maxlength: [50, "Permission name must not exceed 50 characters"],
      match: [
        /^[a-zA-Z0-9:_-]+$/,
        "Permission name must only contain alphanumeric characters, colon, hyphen, or underscore",
      ],
    },
    description: {
      type: String,
      default: "No description provided",
      trim: true,
      maxlength: [200, "Description must not exceed 200 characters"],
    },
    isActive: {
      type: Boolean,
      default: true, // Quyền này có đang hoạt động không?
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
  }
);

module.exports = mongoose.model("Permission", permissionSchema);
