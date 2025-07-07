const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Người dùng tạo comment
      required: true,
    },
    phone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone", // Liên kết đến sản phẩm (điện thoại)
      required: true,
    },
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog", // Liên kết đến bài viết blog
      required: false, // Trường này có thể không bắt buộc nếu không phải lúc nào cũng có blog
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "Content must be at least 10 characters long"], // Đảm bảo bình luận có độ dài tối thiểu
      maxlength: [500, "Content cannot exceed 500 characters"], // Giới hạn độ dài bình luận
      validate: {
        validator: function (v) {
          return /^[\w\s.,!?]+$/i.test(v); // Chỉ cho phép chữ, số, và một số ký tự đặc biệt cơ bản
        },
        message: "Content contains invalid characters.",
      },
    },
    isDeleted: {
      type: Boolean,
      default: false, // Đánh dấu bình luận đã bị xóa (soft delete)
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Người dùng đã thích bình luận này
        default: [], // Mảng chứa ID của người dùng đã thích bình luận
      },
    ],
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment", // Liên kết đến bình luận cha nếu có (dùng cho bình luận con)
      default: null, // Mặc định là null nếu không có bình luận cha
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment", // Liên kết đến các bình luận con (replies)
      },
    ],
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);
commentSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

commentSchema.pre("save", async function (next) {
  const User = mongoose.model("User");
  const Phone = mongoose.model("Phone");

  const userExists = await User.findById(this.user);
  const phoneExists = await Phone.findById(this.phone);

  if (!userExists) {
    throw new Error("User does not exist.");
  }
  if (!phoneExists) {
    throw new Error("Phone does not exist.");
  }

  next();
});

// Phương thức xóa mềm
commentSchema.methods.deleteComment = function () {
  if (this.isDeleted) {
    throw new Error("Comment is already deleted"); // Không thể xóa bình luận đã bị xóa
  }
  this.isDeleted = true;
  return this.save(); // Cập nhật bình luận với trạng thái xóa
};

// Tìm tất cả bình luận của một điện thoại (phone)
commentSchema.statics.findByPhone = function (phoneId) {
  if (!mongoose.Types.ObjectId.isValid(phoneId)) {
    throw new Error("Invalid phone ID");
  }
  // return this.find({ phone: phoneId, isDeleted: false }); // Trả về các comment của sản phẩm, chưa bị xóa
  return this.find({ phone: phoneId, isDeleted: false, parentComment: null })
    .populate("user", "username email")
    .populate("replies", "content user createdAt")
    .sort({ createdAt: -1 });
};

// Tìm tất cả bình luận của một người dùng (user)
commentSchema.statics.findByUserId = function (userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }
  // return this.find({ user: userId, isDeleted: false }); // Trả về các comment của người dùng, chưa bị xóa
  return this.find({ user: userId, isDeleted: false })
    .populate("phone", "name brand")
    .populate("blog", "title")
    .sort({ createdAt: -1 });
};

// Phương thức xóa mềm
commentSchema.methods.deleteComment = async function () {
  if (this.isDeleted) {
    throw new Error("Comment is already deleted.");
  }
  this.isDeleted = true;
  return this.save();
};

module.exports = mongoose.model("Comment", commentSchema);
