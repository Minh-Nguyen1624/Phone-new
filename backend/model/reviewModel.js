const mongoose = require("mongoose");
const Phone = require("./phoneModel");
const User = require("./userModel");

const reviewSchema = new mongoose.Schema(
  {
    // phone: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Phone",
    //   required: true,
    //   validate: {
    //     validator: async (value) => {
    //       const phone = await mongoose.model("Phone").findById(value);
    //       if (!phone) {
    //         throw new Error("Phone not found");
    //       }
    //     },
    //     message: "Phone not found",
    //   },
    // },
    phone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: true,
      validate: {
        validator: async function (value) {
          if (!mongoose.isValidObjectId(value))
            throw new Error("Invalid phone ID");
          const exists = await Phone.exists({ _id: value });
          if (!exists) throw new Error("Phone not found");
        },
      },
    },
    // user: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    //   validate: {
    //     validator: async (value) => {
    //       const user = await mongoose.model("User").findById(value);
    //       if (!user) {
    //         throw new Error("User not found");
    //       }
    //     },
    //     message: "User not found",
    //   },
    // },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: async function (value) {
          if (!mongoose.isValidObjectId(value))
            throw new Error("Invalid user ID");
          const exists = await User.exists({ _id: value });
          if (!exists) throw new Error("User not found");
        },
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

    consent: {
      type: Boolean,
      required: true,
      default: false,
      validate: {
        validator: function (value) {
          return typeof value === "boolean";
        },
        message: "Consent must be a boolean value",
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

// reviewSchema.pre("save", async function (next) {
//   try {
//     // Kiểm tra và cast ObjectId
//     if (!mongoose.Types.ObjectId.isValid(this.phone)) {
//       return next(new Error("Invalid phone ID"));
//     }
//     if (!mongoose.Types.ObjectId.isValid(this.user)) {
//       return next(new Error("Invalid user ID"));
//     }

//     const phone = await mongoose.model("Phone").findById(this.phone);
//     if (!phone) {
//       return next(new Error("Phone not found"));
//     }

//     const user = await mongoose.model("User").findById(this.user);
//     if (!user) {
//       return next(new Error("User not found"));
//     }

//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// reviewSchema.post("save", async function (doc) {
//   console.log("Post-save: Review saved with ID:", doc._id);
//   const phone = await mongoose.model("Phone").findById(doc.phone);
//   if (phone) {
//     console.log("Found phone:", phone._id);
//     const avgRating = await mongoose
//       .model("Review")
//       .getAverageRating(doc.phone);
//     phone.averageRating = avgRating;
//     await phone.save();
//     console.log("Updated phone averageRating:", phone.averageRating);
//   } else {
//     console.log("Phone not found for update");
//   }
// });

// reviewSchema.pre("save", async function (next) {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(this.phone))
//       return next(new Error("Invalid phone ID"));
//     if (!mongoose.Types.ObjectId.isValid(this.user))
//       return next(new Error("Invalid user ID"));
//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// Lọc các review chưa bị xóa khi tìm kiếm
// reviewSchema.pre("find", function () {
//   this.where({ isDeleted: false }); // Chỉ tìm những review chưa bị xóa
// });
reviewSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

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
  //   const reviews = await this.find({ phone: phoneId, isDeleted: false });
  //   if (!reviews.length) {
  //     throw new Error("No reviews found for this phone");
  //   }
  //   return reviews;
  // };
  return this.find({ phone: phoneId, isDeleted: false });
};
// Tìm tất cả review của một người dùng
// reviewSchema.statics.findByUser = function (userId) {
//   return this.find({ user: userId, isDeleted: false }); // Trả về các review của người dùng chưa bị xóa
// };
reviewSchema.statics.findByUser = async function (userId) {
  // const reviews = await this.find({ user: userId, isDeleted: false });
  // if (!reviews.length) {
  //   throw new Error("No reviews found for this user");
  // }
  // return reviews;
  return this.find({ user: userId, isDeleted: false });
};

// Static method to get average rating for a phone
// reviewSchema.statics.getAverageRating = async function (phoneId) {
//   const aggregation = await this.aggregate([
//     { $match: { phone: mongoose.Types.ObjectId(phoneId), isDeleted: false } },
//     { $group: { _id: "$phone", averageRating: { $avg: "$rating" } } },
//   ]);

//   // if (aggregation.length === 0) {
//   //   throw new Error("No reviews for this phone");
//   // }

//   // return aggregation[0].averageRating;
//   return aggregation.length ? aggregation[0].averageRating : 0;
// };
reviewSchema.statics.getAverageRating = async function (phoneId) {
  const agg = await this.aggregate([
    {
      $match: { phone: new mongoose.Types.ObjectId(phoneId), isDeleted: false },
    },
    { $group: { _id: "$phone", avgRating: { $avg: "$rating" } } },
  ]);
  return agg.length ? agg[0].avgRating : 0;
};

// reviewSchema.post("save", async function () {
//   // const phone = await mongoose.model("Phone").findById(this.phone);
//   // if (phone) {
//   //   const avgRating = await mongoose
//   //     .model("Review")
//   //     .getAverageRating(this.phone);
//   //   phone.averageRating = avgRating;
//   //   await phone.save();
//   // }
//   const phone = await Phone.findById(this.phone);
//   if (!phone) return;
//   const avgRating = await mongoose.model("Review").getAverageRating(this.phone);
//   phone.averageRating = avgRating;
//   await phone.save();
// });

// Cập nhật averageRating và reviews sau khi save
// reviewSchema.post("save", async function (doc) {
//   try {
//     const phone = await Phone.findById(doc.phone);
//     if (phone) {
//       // const avgRating = await this.getAverageRating(doc.phone);
//       const avgRating = await Review.getAverageRating(doc.phone);
//       const totalReviews = await this.countDocuments({
//         phone: doc.phone,
//         isDeleted: false,
//       });
//       phone.averageRating = avgRating || 0;
//       phone.totalReviews = totalReviews;
//       if (!phone.reviews.includes(doc._id)) {
//         phone.reviews.push(doc._id);
//       }
//       await phone.save();
//     }
//   } catch (error) {
//     console.error("Error updating phone after save:", error.message);
//   }
// });
reviewSchema.post("save", async function (doc) {
  try {
    const Phone = require("./phoneModel"); // Trì hoãn import
    const Review = require("./reviewModel"); // Đảm bảo model được truy cập đúng
    const phone = await Phone.findById(doc.phone);
    if (phone) {
      const avgRating = await Review.getAverageRating(doc.phone); // Sử dụng static method
      const totalReviews = await Review.countDocuments({
        phone: doc.phone,
        isDeleted: false,
      });
      phone.averageRating = avgRating || 0;
      phone.totalReviews = totalReviews;
      if (!phone.reviews.includes(doc._id)) {
        phone.reviews.push(doc._id);
      }
      await phone.save({ validateBeforeSave: false }); // Tránh validate lại, giảm rủi ro
    }
  } catch (error) {
    console.error("Error updating phone after save:", error.message);
  }
});

// Cập nhật khi soft delete
reviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.isDeleted) {
    const phone = await Phone.findById(doc.phone);
    if (phone) {
      // const avgRating = await this.getAverageRating(doc.phone);
      const avgRating = await Review.getAverageRating(doc.phone);
      const totalReviews = await this.countDocuments({
        phone: doc.phone,
        isDeleted: false,
      });
      phone.averageRating = avgRating || 0;
      phone.totalReviews = totalReviews;
      phone.reviews = phone.reviews.filter((id) => !id.equals(doc._id));
      await phone.save();
    }
  }
});

module.exports = mongoose.model("Review", reviewSchema);
