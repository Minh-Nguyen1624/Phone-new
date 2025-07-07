const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true, // Mã giảm giá không trùng lặp
    trim: true,
  },
  description: {
    type: String,
    trim: true, // Mô tả về giảm giá
    maxlength: [200, "Description cannot exceed 200 characters"], // Giới hạn độ dài mô tả
  },
  discountType: {
    type: String,
    required: true,
    enum: ["percentage", "fixed"], // Kiểu giảm giá (phần trăm hoặc số tiền cố định)
  },
  discountValue: {
    type: Number,
    required: true, // Giá trị giảm giá (có thể là % hoặc số tiền)
    min: [0, "Discount value must be positive"],
  },
  // order: {
  //  type: mongoose.Schema.Types.ObjectId,
  //  ref: "Order",
  //  required: true,
  // }
  minimumOrderAmount: {
    type: Number,
    default: 0, // Số tiền tối thiểu để áp dụng giảm giá
    min: [0, "Minimum order amount cannot be negative"],
  },
  applicablePhones: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone", // Áp dụng cho các sản phẩm cụ thể
    },
  ],
  applicableCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Áp dụng cho các danh mục cụ thể
    },
  ],
  applicableUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Áp dụng cho các người dùng cụ thể
    },
  ],
  usageLimit: {
    type: Number,
    default: 0, // 0 nghĩa là không giới hạn số lần sử dụng
    min: [0, "Usage limit cannot be negative"],
  },
  usedCount: {
    type: Number,
    default: 0, // Số lần mã giảm giá đã được sử dụng
  },
  startDate: {
    type: Date,
    required: true, // Ngày bắt đầu của giảm giá
  },
  endDate: {
    type: Date,
    required: true, // Ngày kết thúc của giảm giá
    validate: {
      validator: function (v) {
        if (!this.startDate) return false;
        return v > this.startDate; // endDate phải sau startDate
      },
      message: "End date must be later than start date",
    },
  },
  isActive: {
    type: Boolean,
    default: true, // Trạng thái hoạt động
  },
  createdAt: {
    type: Date,
    default: Date.now, // Tự động thêm thời gian tạo
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Tự động thêm thời gian cập nhật
  },
  deletedAt: {
    type: Date,
    default: null, // Tự động thêm thời gian xóa
  },
});

// Middleware: Auto-update `updatedAt`
discountSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware: Validate linked data
discountSchema.pre("save", async function (next) {
  try {
    // Validate `applicableUsers`
    if (this.applicableUsers && this.applicableUsers.length > 0) {
      const userCount = await mongoose.model("User").countDocuments({
        _id: { $in: this.applicableUsers },
      });
      if (userCount !== this.applicableUsers.length) {
        return next(new Error("Some users in applicableUsers do not exist"));
      }
    }

    // Validate `applicablePhones`
    if (this.applicablePhones && this.applicablePhones.length > 0) {
      const phoneCount = await mongoose.model("Phone").countDocuments({
        _id: { $in: this.applicablePhones },
      });
      if (phoneCount !== this.applicablePhones.length) {
        return next(new Error("Some phones in applicablePhones do not exist"));
      }
    }

    // Validate `applicableCategories`
    if (this.applicableCategories && this.applicableCategories.length > 0) {
      const categoryCount = await mongoose.model("Category").countDocuments({
        _id: { $in: this.applicableCategories },
      });
      if (categoryCount !== this.applicableCategories.length) {
        return next(
          new Error("Some categories in applicableCategories do not exist")
        );
      }
    }

    // Ensure no conflicts between Users, Phones, and Categories
    // const conflict =
    //   this.applicableUsers.length > 0 && this.applicablePhones.length > 0;
    // // ||
    // //   this.applicableCategories.length > 0
    // if (conflict) {
    //   return next(
    //     new Error(
    //       "Cannot apply discount to both Users and Phones/Categories at the same time"
    //     )
    //   );
    // }

    // Validate usage limit
    if (this.usageLimit > 0 && this.usedCount > this.usageLimit) {
      return next(new Error("Used count exceeds usage limit"));
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual field: Check if discount is currently active
discountSchema.virtual("isCurrentlyActive").get(function () {
  const now = Date.now();
  return (
    this.isActive &&
    this.startDate <= now &&
    this.endDate >= now &&
    (this.usageLimit === 0 || this.usedCount < this.usageLimit)
  );
});

// Middleware: Update related phones when discount changes
// discountSchema.post("save", async function () {
//   const Phone = mongoose.model("Phone");

//   // Nếu mã giảm giá không còn hiệu lực, xóa mã giảm giá khỏi các sản phẩm liên quan
//   if (!this.isCurrentlyActive) {
//     await Phone.updateMany(
//       { discount: this._id },
//       {
//         $set: {
//           discount: null,
//           discountValue: 0,
//           finalPrice: mongoose.model("Phone").price,
//         },
//       }
//     );
//     return;
//   }

//   const phones = await Phone.find({ discount: this._id });
//   for (const phone of phones) {
//     if (this.discountType === "percentage") {
//       phone.discountValue = (phone.price * this.discountValue) / 100;
//     } else {
//       phone.discountValue = this.discountValue;
//     }

//     phone.discountValue = Math.min(phone.discountValue, phone.price);
//     phone.finalPrice = phone.price - phone.discountValue;

//     await phone.save();
//   }
// });
discountSchema.post("save", async function () {
  const Phone = mongoose.model("Phone");

  if (!this.isCurrentlyActive) {
    await Phone.updateMany(
      { discount: this._id },
      {
        $set: {
          discount: null,
          discountValue: 0,
          discountAmount: 0,
          finalPrice: mongoose.model("Phone").price,
        },
      }
    );
    return;
  }

  const phones = await Phone.find({ discount: this._id });
  for (const phone of phones) {
    phone.discountValue = this.discountValue; // Lưu tỷ lệ phần trăm
    if (this.discountType === "percentage") {
      phone.discountAmount = (phone.price * this.discountValue) / 100; // Lưu số tiền giảm
    } else {
      phone.discountAmount = this.discountValue;
    }
    phone.discountAmount = Math.min(phone.discountAmount, phone.price);
    phone.finalPrice = phone.price - phone.discountAmount;
    await phone.save();
  }
});

// Middleware: Soft delete
discountSchema.pre("findOneAndDelete", async function (next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    doc.deletedAt = Date.now();
    doc.isActive = false;
    await doc.save();
  }
  next();
});

// Indexes for efficient querying
discountSchema.index({ code: 1 }, { unique: true });
discountSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("Discount", discountSchema);
