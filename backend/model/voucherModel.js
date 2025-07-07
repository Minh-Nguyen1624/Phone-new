const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true, // Mã voucher phải là duy nhất
    minlength: [3, "Code must be at least 3 characters long"],
    maxlength: [100, "Code cannot exceed 100 characters"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"],
    default: "", // Cung cấp mặc định nếu mô tả không có
  },
  discountType: {
    type: String,
    required: true,
    enum: ["percentage", "fixed"],
  },
  discountValue: {
    type: Number,
    required: true,
    // min: [0, "Discount value must be positive"],
    // validate: {
    //   validator: function (value) {
    //     if (this.discountType === "percentage")
    //       return value > 0 && value <= 100;
    //     if (this.discountType === "fixed") return value > 0;
    //     return false;
    //   },
    //   message:
    //     "Invalid discount value. For percentage, it must be 1-100. For fixed, it must be greater than 0.",
    // },
    validate: {
      validator: function (value) {
        const discountType =
          this.discountType || this.getUpdate()?.$set?.discountType;
        if (discountType === "percentage") {
          return value >= 1 && value <= 100;
        }
        if (discountType === "fixed") {
          return value > 0;
        }
        return false;
      },
      message:
        "Invalid discount value. For percentage, it must be 1-100. For fixed, it must be greater than 0.",
    },
  },
  minimumOrderAmount: {
    type: Number,
    default: 0,
    min: [0, "Minimum order amount must be positive"],
  },
  applicableProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone", // Áp dụng cho sản phẩm cụ thể
    },
  ],
  applicableCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Áp dụng cho danh mục cụ thể
    },
  ],
  applicableUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Áp dụng cho người dùng cụ thể
    },
  ],
  usageLimit: {
    type: Number,
    default: 1, // Số lần sử dụng voucher
    min: [1, "Usage limit cannot be less than 1"],
  },
  usedCount: {
    type: Number,
    default: 0, // Số lần voucher đã được sử dụng
    min: [0, "Used count cannot be less than 0"],
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now, // Thời gian bắt đầu áp dụng voucher
  },
  endDate: {
    type: Date,
    required: true,
    // validate: {
    //   validator: function (value) {
    //     if (!this.startDate) {
    //       return false; // Nếu startDate chưa có, không hợp lệ
    //     }
    //     return value > this.startDate; // End date phải lớn hơn start date
    //   },
    //   message: "End date must be later than start date",
    // },
    validate: {
      validator: function (value) {
        const startDate = this.startDate || this.getUpdate()?.$set?.startDate;
        if (!startDate) return false;
        return value > startDate;
      },
      message: "End date must be later than start date.",
    },
  },
  isActive: {
    type: Boolean,
    default: true, // Trạng thái hoạt động của voucher
  },
  isFlashSale: {
    type: Boolean,
    default: false,
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

voucherSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Automatically deactivate expired or overused vouchers
  const now = Date.now();
  if (this.endDate < now || this.usedCount >= this.usageLimit) {
    this.isActive = false;
  }
  next();
});

// Middleware: Update `updatedAt` and validate on update
voucherSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.$set) {
    // Update `updatedAt`
    update.$set.updatedAt = Date.now();

    // Validate `startDate` and `endDate`
    if (update.$set.startDate && update.$set.endDate) {
      if (new Date(update.$set.endDate) <= new Date(update.$set.startDate)) {
        return next(new Error("End date must be later than start date."));
      }
    }

    // Validate `discountValue`
    if (update.$set.discountType && update.$set.discountValue !== undefined) {
      if (
        update.$set.discountType === "percentage" &&
        (update.$set.discountValue < 1 || update.$set.discountValue > 100)
      ) {
        return next(
          new Error("For percentage discount, value must be between 1 and 100.")
        );
      }
      if (
        update.$set.discountType === "fixed" &&
        update.$set.discountValue <= 0
      ) {
        return next(
          new Error("For fixed discount, value must be greater than 0.")
        );
      }
    }
  }
  next();
});

// Virtual: Check if voucher is currently active
voucherSchema.virtual("isCurrentlyActive").get(function () {
  const now = Date.now();
  return this.startDate <= now && this.endDate >= now && this.isActive;
});

// Method: Update voucher status
voucherSchema.methods.updateStatus = function () {
  const now = Date.now();
  this.isActive =
    this.startDate <= now &&
    this.endDate >= now &&
    this.usedCount < this.usageLimit;
};

// Method: Apply voucher
voucherSchema.methods.applyVoucher = async function () {
  const now = Date.now();
  if (
    !this.isActive ||
    this.endDate < now ||
    this.usedCount >= this.usageLimit
  ) {
    throw new Error(
      "Voucher is either expired, inactive, or has reached its usage limit."
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    this.usedCount += 1;
    if (this.usedCount >= this.usageLimit) this.isActive = false;
    await this.save({ session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// Middleware: Exclude soft-deleted vouchers by default
voucherSchema.pre(/^find/, function (next) {
  if (!this.getFilter().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Indexes
voucherSchema.index({ code: 1 }, { unique: true });
voucherSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
voucherSchema.index({ usedCount: 1 });
voucherSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("Voucher", voucherSchema);
