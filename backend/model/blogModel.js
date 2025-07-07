const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxLength: 150,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug phải là chuỗi URL thân thiện (chỉ chứa chữ thường, số, và dấu gạch ngang).",
      ],
    },
    // content: { type: String, required: true, minLength: 100 },
    content: { type: String, required: true, maxLength: 5000 },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [{ type: String, trim: true, maxLength: 150 }],
    isPublished: { type: Boolean, default: false },
    views: { type: Number, default: 0, min: 0 },
    thumbnail: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v); // Kiểm tra URL ảnh hợp lệ
        },
        message: "URL ảnh phải là URL hợp lệ.",
      },
    },
    category: {
      type: String,
      required: true,
      enum: ["Tin tức", "Tư vấn", "Đánh giá", "Khuyến mãi"],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    publicationDate: {
      type: Date,
      default: null,
    },
    isDeleted: { type: Boolean, default: false }, // Trường để đánh dấu bài viết đã bị xóa (soft delete)
  },
  { timestamps: true }
);

// Phương thức tăng lượt xem
blogSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};
// blogSchema.post("findOne", async function (doc) {
//   if (doc) {
//     doc.views += 1;
//     await doc.save();
//   }
// });

// Phương thức công nhận một lượt thích
blogSchema.methods.addLike = function (userId) {
  if (this.likes.includes(userId)) {
    throw new Error("User has already liked this blog.");
  }
  this.likes.push(userId);
  return this.save();
};

// Phương thức thêm bình luận vào bài viết
blogSchema.methods.addComment = async function (commentId) {
  this.comments.push(commentId);
  return this.save();
};

// Phương thức kiểm tra trạng thái xuất bản
blogSchema.methods.publish = function () {
  if (this.isPublished) {
    throw new Error("Blog is already published.");
  }
  this.isPublished = true;
  this.publicationDate = new Date();
  return this.save();
};

// Phương thức xóa bài viết
blogSchema.methods.deleteBlog = function () {
  return this.remove();
};

// Phương thức lấy tất cả bài viết đã xuất bản
blogSchema.statics.findPublishedBlogs = function () {
  return this.find({ isPublished: true }).sort({ publicationDate: -1 });
};

// Phương thức tìm một blog theo slug
blogSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug });
};

module.exports = mongoose.model("Blog", blogSchema);
