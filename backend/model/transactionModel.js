const mongoose = require("mongoose");
// const Payment = require("./paymentModel");
// const Order = require("./orderModel");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    }, // 👉 Thêm tham chiếu đến Payment
    amount: {
      type: Number,
      required: true,
      min: 0, // Số tiền không được âm
      // validate: {
      //   validator: Number.isInteger,
      //   message: "{VALUE} is not a valid integer amount",
      // },
    },
    status: {
      type: String,
      // enum: ["pending", "completed", "failed", "canceled", "refunded"],
      enum: [
        "Pending",
        "Completed",
        "Failed",
        "Refunded",
        "Cancelled",
        "Partially Refunded",
      ],
      required: true,
    },
    // paymentMethod: {
    //   type: String,
    //   enum: [
    //     "credit_card",
    //     "paypal",
    //     "bank_transfer",
    //     "cash",
    //     "wallet",
    //     "crypto",
    //   ],
    //   required: true,
    // },
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
    transactionDate: {
      type: Date,
      default: Date.now,
      validate: {
        // validator: (date) => {
        //   return date <= Date.now();
        // },
        validator: function (date) {
          return date <= Date.now();
        },
        message: "Transaction date cannot be in the future",
      },
    },
    description: { type: String, trim: true, maxlength: 255 },
    transactionRef: {
      type: String,
      unique: true, // Mã giao dịch phải là duy nhất
      required: false,
      trim: true,
      default: () =>
        `TRX_${new mongoose.Types.ObjectId().toString().substring(0, 8)}`,
    },
    transactionId: {
      // Đổi từ transactionRef thành transactionId để đồng bộ
      type: String,
      unique: true,
      required: false,
      trim: true,
    },
    transactionFee: {
      type: Number,
      required: false,
      min: 0, // Phí giao dịch không thể âm
      default: 0, // Mặc định là 0 nếu không có phí
    },
    currency: {
      type: String,
      required: true,
      enum: {
        values: ["USD", "EUR", "GBP", "JPY", "VND"],
        message: "{VALUE} is not a supported currency.",
      },
      default: "VND", // Đặt VND là mặc định
    },
    completedAt: { type: Date },
    failureReason: { type: String, trim: true },
    initiator: {
      type: String,
      enum: ["user", "admin", "system"],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.pre("save", async function (next) {
  try {
    // Dynamically get the Order and Payment models
    const Order = mongoose.model("Order");
    const Payment = mongoose.model("Payment");

    // Kiểm tra Order tồn tại
    const order = await Order.findById(this.order);
    if (!order) {
      return next(new Error("No order found for this transaction"));
    }

    const payment = await Payment.findById(this.paymentId);
    if (!payment) {
      return next(new Error("No payment found for this transaction"));
    }

    // Kiểm tra paymentMethod của Order
    if (!order.paymentMethod) {
      return next(new Error("Order does not have a payment method defined"));
    }

    // Debug (có thể bỏ trong production)
    console.log("Order payment method:", order.paymentMethod);
    console.log("Transaction payment method:", this.paymentMethod);
    // console.log("Payment payment method:", payment.paymentMethod);

    // So sánh paymentMethod
    // if (this.paymentMethod !== order.paymentMethod) {
    //   return next(
    //     new Error("Payment method does not match the order payment method")
    //   );
    // }

    // // Kiểm tra transactionId cho các phương thức không phải COD
    // if (this.paymentMethod !== "Cash on Delivery") {
    //   if (!this.transactionId || this.transactionId.trim() === "") {
    //     return next(
    //       new Error(
    //         "Transaction ID is required for non-Cash on Delivery payments"
    //       )
    //     );
    //   }
    // }
    if (
      this.paymentMethod !== order.paymentMethod ||
      this.paymentMethod !== payment.paymentMethod
    ) {
      return next(
        new Error("Payment method does not match the order or payment")
      );
    }

    if (
      this.paymentMethod !== "Cash on Delivery" &&
      (!this.transactionId || this.transactionId.trim() === "")
    ) {
      return next(
        new Error(
          "Transaction ID is required for non-Cash on Delivery payments"
        )
      );
    }

    if (this.amount > payment.amount) {
      return next(new Error("Transaction amount cannot exceed payment amount"));
    }

    next();
  } catch (error) {
    console.error("Error in transaction pre-save middleware:", error);
    next(error);
  }
});

// transactionSchema.pre("save", async function (next) {
//   try {
//     // Kiểm tra xem Payment có tồn tại không
//     // const payment = await Payment.findOne({ order: this.order });
//     const payment = await Payment.findOne({ _id: this.paymentId });
//     if (!payment) {
//       return next(new Error("No payment found for this order"));
//     }

//     // Kiểm tra xem Order có tồn tại không
//     const order = await Order.findById(this.order);
//     if (!order) {
//       return next(new Error("Order not found"));
//     }

//     // Kiểm tra xem Transaction có liên kết với Payment không
//     if (!this.payment) {
//       return next(new Error("Transaction must be linked to a payment"));
//     }

//     // Kiểm tra xem paymentMethod của Transaction có khớp với Payment không
//     if (this.paymentMethod !== payment.paymentMethod) {
//       return next(new Error("Payment method does not match"));
//     }

//     // Kiểm tra xem số tiền của Transaction có hợp lệ không
//     if (this.amount > payment.amount) {
//       return next(new Error("Transaction amount cannot exceed payment amount"));
//     }

//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// transactionSchema.pre("save", async function (next) {
//   try {
//     console.log("🔍 Kiểm tra Payment:", this.payment);
//     const payment = await Payment.findOne({ order: this.order });
//     if (!payment) {
//       console.log("❌ Không tìm thấy Payment cho Order:", this.order);
//       return next(new Error("No payment found for this order"));
//     }

//     console.log("✅ Tìm thấy Payment:", payment);
//     next();
//   } catch (error) {
//     console.error("❌ Lỗi khi kiểm tra Payment:", error);
//     next(error);
//   }
// });

// transactionSchema.pre("save", async function (next) {
//   try {
//     // Kiểm tra Order tồn tại
//     const order = await Order.findById(this.order);
//     if (!order) {
//       return next(new Error("No order found for this transaction"));
//     }

//     // Kiểm tra paymentMethod của Order
//     if (!order.paymentMethod) {
//       return next(new Error("Order does not have a payment method defined"));
//     }

//     // Debug (có thể bỏ trong production)
//     console.log("Order payment method:", order.paymentMethod);
//     console.log("Transaction payment method:", this.paymentMethod);

//     // So sánh paymentMethod
//     if (this.paymentMethod !== order.paymentMethod) {
//       return next(
//         new Error("Payment method does not match the order payment method")
//       );
//     }

//     // Kiểm tra transactionRef cho các phương thức không phải COD
//     if (this.paymentMethod !== "Cash on Delivery") {
//       if (!this.transactionRef || this.transactionRef.trim() === "") {
//         return next(
//           new Error(
//             "Transaction reference is required for non-Cash on Delivery payments"
//           )
//         );
//       }
//     }

//     next();
//   } catch (error) {
//     console.error("Error in transaction pre-save middleware:", error);
//     next(error);
//   }
// });

// Index tối ưu cho tìm kiếm
transactionSchema.index({ user: 1, order: 1 }); // Tìm theo người dùng và đơn hàng
transactionSchema.index({ status: 1, transactionDate: -1 }); // Tìm theo trạng thái và thời gian giao dịch
// transactionSchema.index({ transactionRef: 1 }); // Tìm theo mã giao dịch
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ paymentMethod: 1 });
transactionSchema.index({ currency: 1 });
transactionSchema.index({ initiator: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
