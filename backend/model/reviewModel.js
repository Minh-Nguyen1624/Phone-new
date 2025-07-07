const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    phone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: true,
      validate: {
        validator: async (value) => {
          const phone = await mongoose.model("Phone").findById(value);
          if (!phone) {
            throw new Error("Phone not found");
          }
        },
        message: "Phone not found",
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: async (value) => {
          const user = await mongoose.model("User").findById(value);
          if (!user) {
            throw new Error("User not found");
          }
        },
        message: "User not found",
      },
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5, // Đánh giá theo thang điểm từ 1 đến 5 sao
    },
    // content: {
    //   type: String,
    //   required: true,
    //   maxlength: [1000, "Content cannot exceed 1000 characters"], // Nội dung đánh giá có nhiều nhất 1000 ký tự
    // },
    content: {
      type: String,
      required: true,
      maxlength: [1000, "Content cannot exceed 1000 characters"],
      validate: {
        validator: function (value) {
          return value.trim().length > 0; // Nội dung không được rỗng
        },
        message: "Content cannot be empty or just spaces",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now, // Thời gian tạo review
    },
    updatedAt: {
      type: Date,
      default: Date.now, // Thời gian cập nhật review
    },
    isDeleted: {
      type: Boolean,
      default: false, // Trạng thái xóa review
    },
  },
  { timestamps: true }
);

reviewSchema.index({ phone: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ phone: 1, user: 1 }, { unique: true });

// Tự động cập nhật updatedAt mỗi khi review được thay đổi
reviewSchema.pre("save", function (next) {
  this.updatedAt = Date.now(); // Cập nhật thời gian khi review được thay đổi
  next();
});

reviewSchema.pre("save", async function (next) {
  const phone = await mongoose.model("Phone").findById(this.phone);
  if (!phone) {
    return next(new Error("Phone not found"));
  }

  const user = await mongoose.model("User").findById(this.user);
  if (!user) {
    return next(new Error("User not found"));
  }

  next();
});

// Lọc các review chưa bị xóa khi tìm kiếm
// reviewSchema.pre("find", function () {
//   this.where({ isDeleted: false }); // Chỉ tìm những review chưa bị xóa
// });
reviewSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

// Phương thức xóa review (soft delete)
// reviewSchema.methods.deleteReview = function () {
//   this.isDeleted = true; // Đánh dấu review là đã xóa (soft delete)
//   return this.save(); // Cập nhật review với trạng thái xóa
// };
// reviewSchema.methods.deleteReview = function () {
//   if (!this.isDeleted) {
//     this.isDeleted = true;
//     return this.save();
//   }
//   return Promise.resolve(this); // Nếu đã xóa thì trả về chính đối tượng
// };
// Soft delete method
reviewSchema.methods.deleteReview = async function () {
  if (!this.isDeleted) {
    this.isDeleted = true;
    return await this.save();
  }
  return this;
};

// Tìm tất cả review của một sản phẩm (sử dụng phoneId)
// reviewSchema.statics.findByPhone = function (phoneId) {
//   return this.find({ phone: phoneId, isDeleted: false }); // Trả về các review của sản phẩm (phone) chưa bị xóa
// };
reviewSchema.statics.findByPhone = async function (phoneId) {
  const reviews = await this.find({ phone: phoneId, isDeleted: false });
  if (!reviews.length) {
    throw new Error("No reviews found for this phone");
  }
  return reviews;
};

// Tìm tất cả review của một người dùng
// reviewSchema.statics.findByUser = function (userId) {
//   return this.find({ user: userId, isDeleted: false }); // Trả về các review của người dùng chưa bị xóa
// };
reviewSchema.statics.findByUser = async function (userId) {
  const reviews = await this.find({ user: userId, isDeleted: false });
  if (!reviews.length) {
    throw new Error("No reviews found for this user");
  }
  return reviews;
};

// Static method to get average rating for a phone
reviewSchema.statics.getAverageRating = async function (phoneId) {
  const aggregation = await this.aggregate([
    { $match: { phone: mongoose.Types.ObjectId(phoneId), isDeleted: false } },
    { $group: { _id: "$phone", averageRating: { $avg: "$rating" } } },
  ]);

  // if (aggregation.length === 0) {
  //   throw new Error("No reviews for this phone");
  // }

  // return aggregation[0].averageRating;
  return aggregation.length ? aggregation[0].averageRating : 0;
};

reviewSchema.post("save", async function () {
  const phone = await mongoose.model("Phone").findById(this.phone);
  if (phone) {
    const avgRating = await mongoose
      .model("Review")
      .getAverageRating(this.phone);
    phone.averageRating = avgRating;
    await phone.save();
  }
});

module.exports = mongoose.model("Review", reviewSchema);
