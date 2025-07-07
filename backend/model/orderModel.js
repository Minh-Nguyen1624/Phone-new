const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
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
        // enum: ["USD", "VND", "EUR", "JPY"],
        enum: {
          values: ["USD", "EUR", "GBP", "JPY", "VND"],
          message: "{VALUE} is not a supported currency.",
        },
        default: "VND",
      },
    },
  ],
  subTotal: {
    type: Number,
    default: 0,
    validate: {
      validator: (v) => !isNaN(v) && v >= 0,
      message: "Subtotal must be a valid number and greater than or equal to 0",
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
  totalAmount: {
    type: Number,
    // required: true,
    default: 0,
    validate: {
      validator: (v) => !isNaN(v) && v >= 0,
      message:
        "Total amount must be a valid number and greater than or equal to 0",
    },
  },
  totalCost: {
    type: Number,
    default: 0,
    validate: {
      validator: (v) => !isNaN(v) && v >= 0,
      message:
        "Total cost must be a valid number and greater than or equal to 0",
    },
  },
  discount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Discount",
    default: null,
  },
  discountAmount: {
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
      date.setDate(date.getDate() + 1);
      return date;
    },
  },
  deliveryOption: {
    type: String,
    enum: ["standard", "express", "same-day"],
    default: "standard",
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
  },
  useLoyaltyPoints: {
    type: Boolean,
    default: false,
  },
  specialRequests: {
    transferData: { type: Boolean, default: false },
    companyInvoice: { type: Boolean, default: false },
    otherRequest: { type: String, default: "" },
  },
  checkStatus: {
    type: Boolean,
    default: false,
  },
  shippingInfo: {
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
  },
  paymentStatus: {
    type: String,
    // enum: ["pending", "completed", "failed"],
    enum: [
      "Pending",
      "Completed",
      "Failed",
      "Refunded",
      "Cancelled",
      "Partially Refunded",
      "Expired",
    ],
    default: "Pending",
  },
  orderStatus: {
    type: String,
    // enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    enum: [
      "Pending",
      "processing",
      "shipped",
      "delivered",
      "Completed",
      "Cancelled",
    ],
    default: "Pending",
  },
  paymentMethod: {
    type: String,
    required: true,
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
  },
  payments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  ], // 👉 Thêm trường payments để tham chiếu đến các Payment
  orderDate: {
    type: Date,
    default: Date.now,
  },
  shipmentDate: {
    type: Date,
  },
  deliveryDate: {
    type: Date,
  },
});

// Middleware: Kiểm tra giá sản phẩm trong items có khớp với giá trong Phone không
// orderSchema.pre("save", async function (next) {
//   try {
//     // Kiểm tra và cập nhật tồn kho
//     for (const item of this.items) {
//       const phone = await mongoose.model("Phone").findById(item.phone);
//       if (!phone) {
//         return next(new Error(`Sản phẩm không tồn tại: ${item.phone}`));
//       }
//       // if (item.price !== phone.price) {
//       //   return next(
//       //     new Error(
//       //       `Giá sản phẩm không khớp: ${phone.name} có giá ${phone.price}, nhưng trong đơn hàng là ${item.price}`
//       //     )
//       //   );
//       // }
//       // Cập nhật item.price để khớp với finalPrice (hoặc price nếu không có finalPrice)
//       const phonePrice = phone.finalPrice || phone.price;
//       // if (item.price !== phonePrice) {
//       //   item.price = phonePrice; // Cập nhật giá trong Order để khớp với Phone
//       // }
//       // // item.originalPrice = phone.price; // Đảm bảo originalPrice từ Phone
//       if (item.price !== phonePrice) {
//         return next(
//           new Error(
//             `Giá sản phẩm không khớp: ${phone.name} có giá ${phonePrice}, nhưng trong đơn hàng là ${item.price}`
//           )
//         );
//       }
//       item.originalPrice = phone.price; // Đảm bảo originalPrice từ Phone
//       if (phone.stock < item.quantity) {
//         return next(new Error(`Không đủ tồn kho cho sản phẩm: ${phone.name}`));
//       }
//       phone.stock -= item.quantity;
//       await phone.save();

//       item.originalPrice = phone.price;
//       item.color = phone.color || "default";
//     }

//     // Tính subTotal
//     this.subTotal = this.items.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );

//     // Tính totalCost
//     this.totalCost = this.items.reduce(
//       (sum, item) => sum + item.originalPrice * item.quantity,
//       0
//     );

//     // Gán totalCartPrice bằng subTotal ban đầu
//     this.totalCartPrice = this.subTotal;

//     // Gán totalAmount bằng subTotal
//     this.totalAmount = this.subTotal;

//     // Áp dụng discount nếu có
//     if (this.discount) {
//       const discount = await mongoose.model("Discount").findById(this.discount);
//       if (discount && discount.isCurrentlyActive) {
//         const minOrderValue = discount.minOrderValue || 0;
//         if (this.totalAmount >= minOrderValue) {
//           if (discount.discountType === "percentage") {
//             this.discountAmount =
//               (this.totalAmount * discount.discountValue) / 100;
//           } else {
//             this.discountAmount = discount.discountValue;
//           }
//           // this.totalAmount -= this.discountAmount;
//           // this.totalCartPrice = this.totalAmount; // Đồng bộ totalCartPrice
//           this.totalCartPrice -= this.discountAmount;
//         } else {
//           this.discount = null;
//           this.discountAmount = 0;
//         }
//       } else {
//         this.discount = null;
//         this.discountAmount = 0;
//       }
//     } else {
//       this.discountAmount = 0;
//     }

//     // // Cộng phí vận chuyển vào totalAmount
//     // this.totalAmount += this.shippingFee || 0;

//     // Cộng phí vận chuyển vào totalAmount
//     this.totalAmount = this.totalCartPrice + (this.shippingFee || 0);

//     // Tính điểm tích lũy (1đ = 2 điểm)
//     this.loyaltyPoints = Math.floor(this.totalAmount * 2);

//     // Cập nhật estimatedDeliveryDate
//     if (!this.estimatedDeliveryDate) {
//       const deliveryDays =
//         this.deliveryOption === "express"
//           ? 2
//           : this.deliveryOption === "same-day"
//           ? 1
//           : 5;
//       this.estimatedDeliveryDate = new Date(
//         Date.now() + deliveryDays * 24 * 60 * 60 * 1000
//       );
//     }

//     // Cập nhật updatedAt
//     this.updatedAt = new Date();

//     next();
//   } catch (error) {
//     next(error);
//   }
// });
orderSchema.pre("save", async function (next) {
  try {
    // Kiểm tra và cập nhật tồn kho
    for (const item of this.items) {
      const phone = await mongoose.model("Phone").findById(item.phone);
      if (!phone) {
        return next(new Error(`Sản phẩm không tồn tại: ${item.phone}`));
      }
      const phonePrice = phone.finalPrice || phone.price;
      if (item.price !== phonePrice) {
        return next(
          new Error(
            `Giá sản phẩm không khớp: ${phone.name} có giá ${phonePrice}, nhưng trong đơn hàng là ${item.price}`
          )
        );
      }
      item.originalPrice = phone.price; // Đảm bảo originalPrice từ Phone
      if (phone.stock < item.quantity) {
        return next(new Error(`Không đủ tồn kho cho sản phẩm: ${phone.name}`));
      }
      phone.stock -= item.quantity;
      await phone.save();
    }

    // Tính subTotal (dựa trên originalPrice)
    this.subTotal = this.items.reduce(
      (sum, item) => sum + item.originalPrice * item.quantity,
      0
    );

    // Tính totalCost
    this.totalCost = this.items.reduce(
      (sum, item) => sum + item.originalPrice * item.quantity,
      0
    );

    // Tính totalCartPrice ban đầu (dựa trên price)
    this.totalCartPrice = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Áp dụng mã giảm giá từ discountId
    const currentDate = new Date();
    if (this.discount) {
      const Discount = mongoose.model("Discount");
      const discount = await Discount.findById(this.discount);
      console.log("Discount document:", discount); // Log để debug
      if (
        discount &&
        discount.isCurrentlyActive &&
        new Date(discount.startDate) <= currentDate &&
        (!discount.endDate || new Date(discount.endDate) >= currentDate)
      ) {
        const minOrderValue = discount.minOrderValue || 0;
        console.log(
          "Min order value:",
          minOrderValue,
          "Subtotal:",
          this.subTotal
        );
        if (this.subTotal >= minOrderValue) {
          if (discount.discountType === "percentage") {
            this.discountAmount =
              (this.subTotal * discount.discountValue) / 100;
          } else {
            this.discountAmount = Math.min(
              discount.discountValue,
              this.subTotal
            );
          }
          this.discountAmount = Math.min(
            this.discountAmount,
            this.totalCartPrice
          ); // Đảm bảo không âm
          this.totalCartPrice -= this.discountAmount;
          discount.usedCount = (discount.usedCount || 0) + 1;
          await discount.save();
          console.log("Discount applied:", this.discountAmount);
        } else {
          this.discount = null;
          this.discountAmount = 0;
          console.log("Discount not applied: Subtotal below minOrderValue");
        }
      } else {
        this.discount = null;
        this.discountAmount = 0;
        console.log("Discount not active or invalid");
      }
    } else {
      this.discountAmount = 0;
      console.log("No discount provided");
    }

    // Cộng phí vận chuyển vào totalAmount
    this.totalAmount = this.totalCartPrice + (this.shippingFee || 0);

    // Tính điểm tích lũy (1đ = 2 điểm)
    this.loyaltyPoints = Math.floor(this.totalAmount * 2);

    // Cập nhật estimatedDeliveryDate
    if (!this.estimatedDeliveryDate) {
      const deliveryDays =
        this.deliveryOption === "express"
          ? 2
          : this.deliveryOption === "same-day"
          ? 1
          : 5;
      this.estimatedDeliveryDate = new Date(
        Date.now() + deliveryDays * 24 * 60 * 60 * 1000
      );
    }

    this.updatedAt = new Date();
    next();
  } catch (error) {
    console.error("Error in orderSchema pre-save:", error.message);
    next(error);
  }
});

module.exports = mongoose.model("Order", orderSchema);
