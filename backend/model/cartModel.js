const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        phone: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Phone",
          required: true,
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: [true, "Price is required"],
          validate: {
            validator: (v) => !isNaN(v) && v >= 0,
            message:
              "Price must be a valid number and greater than or equal to 0",
          },
        },
        originalPrice: {
          type: Number,
          required: true,
          validate: {
            validator: (v) => !isNaN(v) && v >= 0,
            message:
              "Original price must be a valid number and greater than or equal to 0",
          },
        },
        imageUrl: {
          type: String,
          required: [true, "Image URL is required"],
          trim: true,
          validate: {
            validator: function (v) {
              return /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/.test(v);
            },
            message: (props) =>
              `${props.value} is not a valid image URL (must end with .jpg, .jpeg, .png, or .gif)`,
          },
        },
        isGift: {
          type: Boolean,
          default: false,
        },
        customOption: {
          type: Object,
          default: {},
        },
        currency: {
          type: String,
          required: true,
          enum: ["USD", "VND", "EUR", "JPY"],
          default: "VND",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    //
    subTotal: {
      type: Number,
      default: 0,
      validate: {
        validator: (v) => !isNaN(v) && v >= 0,
        message:
          "Subtotal must be a valid number and greater than or equal to 0",
      },
    },
    totalCartPrice: {
      type: Number,
      default: 0,
      validate: {
        validator: (v) => !isNaN(v) && v >= 0,
        message:
          "Total cart price must be a valid number and greater than or equal to 0",
      },
    },
    discount: {
      type: mongoose.Schema.Types.ObjectId, // Thay đổi thành tham chiếu đến Discount
      ref: "Discount",
      default: null,
    },
    discountAmount: {
      // Lưu giá trị giảm giá sau khi áp dụng
      type: Number,
      default: 0,
      validate: {
        validator: (v) => !isNaN(v) && v >= 0,
        message:
          "Discount amount must be a valid number and greater than or equal to 0",
      },
    },
    shippingFee: {
      type: Number,
      default: 0,
      validate: {
        validator: (v) => !isNaN(v) && v >= 0,
        message:
          "Shipping fee must be a valid number and greater than or equal to 0",
      },
    },
    estimatedDeliveryDate: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 1); // Mặc định giao hàng sau 1 ngày
        return date;
      },
    },
    //
    deliveryOption: {
      type: String,
      enum: ["standard", "express"],
      default: "standard",
    },
    loyaltyPoints: {
      // Điểm tích lũy Quà Tặng VIP
      type: Number,
      default: 0,
    },
    //
    useLoyaltyPoints: {
      type: Boolean,
      default: false,
    },
    specialRequests: {
      transferData: { type: Boolean, default: false },
      companyInvoice: { type: Boolean, default: false },
      otherRequest: { type: String, default: "" },
    },
    paymentMethod: {
      type: String,
      enum: [
        "Credit Card",
        "PayPal",
        "Bank Transfer",
        "Cash on Delivery",
        "Momo",
        "ZaloPay",
        "VNPay",
        "Stripe",
        "VietQR",
        "In-Store",
      ],
      // default: "Cash on Delivery",
    },
    checkStatus: {
      type: Boolean,
      default: false,
    },
    shippingInfo: {
      // address: {
      //   street: { type: String, required: true, trim: true },
      //   city: { type: String, required: true, trim: true },
      //   district: { type: String, required: true, trim: true },
      //   country: { type: String, required: true, trim: true },
      //   postalCode: { type: String, required: true, trim: true },
      // },
      address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.pre("validate", function (next) {
  this.items.forEach((item) => {
    if (!item.quantity) item.quantity = 1;
    if (!item.price) item.price = 0;
  });
  if (!this.shippingInfo) {
    this.shippingInfo = { address: null };
  }
  next();
});

// cartSchema.pre("save", function (next) {
//   this.totalCartPrice = this.items.reduce((total, item) => {
//     if (!item.price || !item.quantity) {
//       throw new Error("Invalid price or quantity in items");
//     }
//     return total + item.price * item.quantity;
//   }, 0);
//   next();
// });

// cartSchema.pre("save", async function (next) {
//   // Populate giá và hình ảnh từ Phone
//   const phones = await mongoose.model("Phone").find({
//     _id: { $in: this.items.map((item) => item.phone) },
//   });

//   this.items.forEach((item) => {
//     const phone = phones.find(
//       (p) => p._id.toString() === item.phone.toString()
//     );
//     if (phone) {
//       item.price = phone.finalPrice || phone.price; // Lấy giá từ Phone
//       item.originalPrice = phone.price; // Lấy giá gốc từ Phone
//       item.imageUrl = phone.imageUrl || item.imageUrl; // Lấy imageUrl từ Phone nếu có
//     }
//   });

//   this.subTotal = this.items.reduce((total, item) => {
//     if (!item.originalPrice || !item.quantity) {
//       throw new Error("Invalid original price or quantity in items");
//     }
//     return total + item.originalPrice * item.quantity;
//   }, 0);

//   // Tính tổng giá
//   this.totalCartPrice = this.items.reduce((total, item) => {
//     if (!item.price || !item.quantity) {
//       throw new Error("Invalid price or quantity in items");
//     }
//     return total + item.price * item.quantity;
//   }, 0);

//   // Áp dụng mã giảm giá
//   if (this.discount) {
//     const discount = await mongoose.model("Discount").findById(this.discount);
//     if (discount && discount.isCurrentlyActive) {
//       if (discount.discountType === "percentage") {
//         this.discountAmount =
//           (this.totalCartPrice * discount.discountValue) / 100;
//       } else {
//         this.discountAmount = discount.discountValue;
//       }
//       this.totalCartPrice -= this.discountAmount;

//       // Cập nhật usedCount của Discount
//       discount.usedCount += 1;
//       await discount.save();
//     } else {
//       this.discount = null;
//       this.discountAmount = 0;
//     }
//   } else {
//     this.discountAmount = 0;
//   }

//   if (this.useLoyaltyPoints) {
//     const user = await mongoose.model("User").findById(this.user);
//     const pointsToUse = Math.min(user.loyaltyPoints || 0, this.totalCartPrice);
//     this.totalCartPrice -= pointsToUse;
//   }
//   // // Tính phí giao hàng (giả định miễn phí)
//   // this.shippingFee = 0;
//   // Calculate shipping fee (placeholder logic, adjust as needed)
//   this.shippingFee = this.shippingInfo.address ? 30000 : 0; // Example: 30,000 VND if address is set

//   // Tính điểm tích lũy Quà Tặng VIP (giả định: 1đ = 2 điểm)
//   this.loyaltyPoints = Math.floor(this.totalCartPrice * 2);

//   next();
// });

cartSchema.pre("save", async function (next) {
  // Populate giá và hình ảnh từ Phone
  const Phone = mongoose.model("Phone");
  const phones = await Phone.find({
    _id: { $in: this.items.map((item) => item.phone) },
  }).select("price finalPrice discount discountAmount");

  this.items.forEach((item) => {
    const phone = phones.find(
      (p) => p._id.toString() === item.phone.toString()
    );
    if (phone) {
      item.price = phone.finalPrice || phone.price; // Lấy finalPrice từ Phone
      item.originalPrice = phone.price; // Lấy giá gốc từ Phone
      if (!item.imageUrl) item.imageUrl = phone.image; // Lấy imageUrl từ Phone nếu chưa có
    }
  });

  // Tính subTotal (dựa trên originalPrice)
  this.subTotal = this.items.reduce((total, item) => {
    if (!item.originalPrice || !item.quantity) {
      throw new Error("Invalid original price or quantity in items");
    }
    return total + item.originalPrice * item.quantity;
  }, 0);

  // Tính totalCartPrice (dựa trên price)
  this.totalCartPrice = this.items.reduce((total, item) => {
    if (!item.price || !item.quantity) {
      throw new Error("Invalid price or quantity in items");
    }
    return total + item.price * item.quantity;
  }, 0);

  // Áp dụng mã giảm giá từ Phone
  if (this.items.length > 0) {
    const firstPhone = await Phone.findById(this.items[0].phone).select(
      "price finalPrice discount discountAmount"
    );
    if (firstPhone && firstPhone.discount) {
      this.discount = firstPhone.discount; // Lấy discount từ Phone
      // Tính discountAmount từ Phone nếu chưa có
      if (firstPhone.discountAmount) {
        this.discountAmount = firstPhone.discountAmount;
      } else {
        this.discountAmount =
          firstPhone.price - (firstPhone.finalPrice || firstPhone.price);
      }
      // Nếu finalPrice đã bao gồm giảm giá, không áp dụng thêm discount từ Cart
      if (this.discountAmount > 0) {
        this.totalCartPrice = this.items.reduce((total, item) => {
          return total + item.price * item.quantity;
        }, 0);
      }
    }
  }

  // Chỉ áp dụng discount từ Cart nếu Phone không có giảm giá hoặc Discount hợp lệ
  const currentDate = new Date();
  if (this.discount && this.discountAmount === 0) {
    const Discount = mongoose.model("Discount");
    const discount = await Discount.findById(this.discount);
    if (
      discount &&
      discount.isActive &&
      new Date(discount.startDate) <= currentDate &&
      (!discount.endDate || new Date(discount.endDate) >= currentDate)
    ) {
      if (discount.discountType === "percentage") {
        this.discountAmount = (this.subTotal * discount.discountValue) / 100;
      } else {
        this.discountAmount = Math.min(
          discount.discountValue,
          this.totalCartPrice
        );
      }
      this.discountAmount = Math.min(this.discountAmount, this.totalCartPrice); // Đảm bảo không âm
      this.totalCartPrice -= this.discountAmount;
      discount.usedCount += 1;
      await discount.save();
    } else {
      this.discount = null;
      this.discountAmount = 0;
    }
  }

  // Tính phí giao hàng (miễn phí nếu có address và deliveryOption là standard)
  if (
    this.shippingInfo &&
    this.shippingInfo.address &&
    this.deliveryOption === "standard"
  ) {
    this.shippingFee = 0;
  } else {
    this.shippingFee = 30000;
  }

  // Tính điểm tích lũy Quà Tặng VIP
  this.loyaltyPoints = Math.floor(this.totalCartPrice * 2);

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
