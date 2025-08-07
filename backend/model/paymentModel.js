const mongoose = require("mongoose");
const Phone = require("./phoneModel");
const Order = require("./orderModel");
const Transaction = require("./transactionModel");
const User = require("../model/userModel");
const {
  sendPaymentConfirmationEmail,
  sendPaymentNotification,
  sendRefundConfirmationEmail,
} = require("../utils/email");
const { convertVNDToUSD } = require("../utils/currencyConverter");
const { convertOrderToUSD } = require("../utils/orderConverter");

const paymentSchema = new mongoose.Schema(
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
    paymentStatus: {
      type: String,
      required: true,
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
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      enum: {
        values: ["USD", "EUR", "GBP", "JPY", "VND"],
        message: "{VALUE} is not a supported currency.",
      },
      default: "VND",
    },
    transactionId: {
      type: String,
      required: function () {
        return this.paymentMethod !== "Cash on Delivery";
      },
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          // Validate transaction ID format (example: alphanumeric)
          return /^[a-zA-Z0-9-_]+$/.test(v); // Example validation
        },
        message: "Invalid transaction ID format",
      },
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        required: true,
      },
    ], // 👉 Mảng chứa các giao dịch liên quan đến Payment
    gatewayResponse: {
      type: Object,
      required: function () {
        return this.paymentMethod !== "Cash on Delivery";
      },
      validate: {
        validator: function (v) {
          if (this.paymentMethod === "Cash on Delivery") return true; // Skip validation for COD
          return v && v.status && v.message;
        },
        message: "Invalid gateway response format",
      },
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    refundedAt: {
      type: Date,
      validate: {
        validator: function (value) {
          return this.isRefunded ? value !== null : true;
        },
        message: "Refunded payments must have a refundedAt date.",
      },
      default: Date.now(),
    },
    refundAmount: {
      type: Number,
      min: [0, "Refund amount cannot be negative"], // Optional: Partial refund amount
      validate: {
        validator: function (value) {
          return value <= this.amount;
        },
        message: "Refund amount cannot exceed original payment amount",
      },
    },
    // refunds: [refundSchema], // Thêm mảng để lưu lịch sử hoàn tiền
    phone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      // required: true,
    },
    // orderInfo: {
    //   type: String,
    //   required: false,
    // },
    // returnUrl: {
    //   type: String,
    //   require: false,
    //   validate: {
    //     validator: function (v) {
    //       return /^(http|https):\/\/[^ "]+$/.test(v);
    //     },
    //     message: "Invalid return URL format",
    //   },
    // },
    // notifyUrl: {
    //   type: String,
    //   require: false,
    //   validate: {
    //     validator: function (v) {
    //       return /^(http|https):\/\/[^ "]+$/.test(v);
    //     },
    //     message: "Invalid notify URL format",
    //   },
    // },
    orderInfo: {
      type: String,
      required: function () {
        return ["VNPay", "PayPal", "Stripe"].includes(this.paymentMethod);
      },
      validate: {
        validator: function (v) {
          return v && v.trim().length > 0;
        },
        message: "Order info cannot be empty",
      },
    },
    returnUrl: {
      type: String,
      required: function () {
        return ["VNPay", "PayPal", "Stripe", "ZaloPay"].includes(
          this.paymentMethod
        );
      },
      validate: {
        validator: function (v) {
          return /^(http|https):\/\/[^ "]+$/.test(v);
        },
        message: "Invalid return URL format",
      },
    },
    notifyUrl: {
      type: String,
      required: function () {
        return ["VNPay", "Stripe", "ZaloPay"].includes(this.paymentMethod);
      },
      validate: {
        validator: function (v) {
          return /^(http|https):\/\/[^ "]+$/.test(v);
        },
        message: "Invalid notify URL format",
      },
    },
    clientIp: {
      // 👉 Thêm thuộc tính clientIp
      type: String,
      required: function () {
        return this.paymentMethod === "VNPay"; // Chỉ bắt buộc khi thanh toán qua VNPay
      },
      validate: {
        validator: function (v) {
          return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v); // Kiểm tra định dạng IP
        },
        message: "Invalid client IP address format",
      },
    },
    expiresAt: {
      // Thêm trường expiresAt
      type: Date,
      required: function () {
        return ["Momo", "VietQR", "ZaloPay", "VNPay"].includes(
          this.paymentMethod
        );
      },
    },
    failureReason: {
      // Thêm trường failureReason
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    autoIndex: false, // Tắt autoIndex để ngăn Mongoose tự động tạo chỉ mục
  }
);

paymentSchema.pre("save", async function (next) {
  try {
    const order = await Order.findById(this.order).populate("items.phone");
    if (!order) {
      return next(new Error("No order found for this payment"));
    }
    console.log("Order payment method:", order.paymentMethod);
    console.log("Payment method in request:", this.paymentMethod);

    // Kiểm tra nếu phương thức thanh toán không khớp với đơn hàng
    if (this.paymentMethod !== order.paymentMethod) {
      return next(
        new Error("Payment method does not match the order payment method")
      );
    }

    // Đảm bảo giao dịch hợp lệ cho các phương thức không phải COD
    if (
      this.paymentMethod !== "Cash on Delivery" &&
      (!this.transactionId || this.transactionId.trim() === "")
    ) {
      return next(
        new Error(
          "Transaction ID is required for non-cash on delivery payments."
        )
      );
    }

    // Kiểm tra sản phẩm có còn tồn kho không trước khi thanh toán
    const products = await Phone.find({
      _id: { $in: order.items.map((item) => item.phone) },
    });
    for (const product of products) {
      if (product.stock <= 0) {
        return next(new Error(`Product ${product.name} is out of stock`));
      }
    }

    // Đảm bảo hoàn tiền hợp lệ
    if (this.isRefunded) {
      if (!this.refundedAt) {
        return next(
          new Error("Refunded payments must have a refundedAt date.")
        );
      }
      if (this.refundAmount > this.amount) {
        return next(
          new Error("Refund amount cannot exceed the original payment amount")
        );
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook to handle validations before saving the payment document
paymentSchema.pre("save", async function (next) {
  if (this.isRefunded && !this.refundedAt) {
    return next(new Error("Refunded payments must have a refundedAt date."));
  }

  if (this.isRefunded && this.refundAmount) {
    if (this.refundAmount > this.amount) {
      return next(
        new Error("Refund amount cannot exceed the original payment amount")
      );
    }
  }

  // Sửa: Lấy danh sách sản phẩm từ order.items thay vì this.products
  const order = await Order.findById(this.order);
  if (!order) {
    return next(new Error("Order not found for this payment"));
  }
  const products = await Phone.find({
    _id: { $in: order.items.map((item) => item.phone) },
  });
  for (const product of products) {
    if (product.stock <= 0) {
      return next(new Error(`Product ${product.name} is out of stock`));
    }
  }

  next();
});

// Xử lý logic hoàn tiền
paymentSchema.post("save", async function (doc, next) {
  try {
    const order = await Order.findById(doc.order).populate("items.phone");
    if (!order) {
      return next(new Error("Order not found"));
    }

    // Nếu thanh toán thành công, giảm số lượng tồn kho
    if (doc.paymentStatus === "Completed") {
      for (const item of order.items) {
        const product = await Phone.findById(item.phone);
        if (product) {
          product.stock -= item.quantity;
          await product.save();
        }
      }
    }

    // Nếu hoàn tiền, khôi phục lại tồn kho
    if (doc.isRefunded && doc.order && Array.isArray(doc.order.items)) {
      for (const item of doc.order.items) {
        const product = await Phone.findById(item.phone);
        if (product) {
          product.stock += item.quantity; // Khôi phục tồn kho
          await product.save();
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// 🟢 Xử lý tự động hủy thanh toán nếu quá 30 phút
paymentSchema.post("save", async function (doc, next) {
  if (doc.paymentStatus === "Pending") {
    setTimeout(async () => {
      const payment = await mongoose.model("Payment").findById(doc._id);
      if (payment && payment.paymentStatus === "Pending") {
        payment.paymentStatus = "Expired";
        await payment.save();
        logger.warn(`Payment expired: ${doc._id}`);
      }
    }, 30 * 60 * 1000);
  }
  next();
});

// Post-save hook: Update stock, send email, and handle refund
paymentSchema.post("save", async function (doc, next) {
  try {
    const order = await Order.findById(doc.order).populate({
      path: "items.phone",
      select: "stock name",
    });
    if (!order) {
      return next(new Error("Order not found"));
    }

    const user = await User.findById(doc.user).select("email");
    if (!user) {
      return next(new Error("User not found"));
    }

    // Đồng bộ paymentStatus giữa Order và Payment
    if (doc.paymentStatus !== order.paymentStatus) {
      order.paymentStatus = doc.paymentStatus;
      if (
        doc.paymentStatus === "Completed" &&
        order.orderStatus === "Pending"
      ) {
        order.orderStatus = "processing"; // Đồng bộ với enum mới
      } else if (
        ["Failed", "Cancelled", "Expired"].includes(doc.paymentStatus) &&
        order.orderStatus !== "Cancelled"
      ) {
        order.orderStatus = "Cancelled"; // Đồng bộ với enum mới
        for (const item of order.items) {
          const product = await Phone.findById(item.phone._id);
          if (product) {
            product.stock += item.quantity;
            await product.save();
            console.log(
              `Restored stock for product ${item.phone._id}: +${item.quantity}`
            );
          }
        }
      }
      await order.save();
    }

    // // 📌 Xử lý tồn kho khi thanh toán thành công
    // if (doc.paymentStatus === "Completed" && !doc.isRefunded) {
    //   for (const item of order.items) {
    //     const product = item.phone;
    //     if (product) {
    //       product.stock -= item.quantity;
    //       await product.save();
    //       console.log(
    //         `Reduced stock for product ${product._id}: -${item.quantity}`
    //       );
    //     }
    //   }
    // }

    // Gửi email xác nhận thanh toán khi thanh toán thành công
    if (doc.paymentStatus === "Completed") {
      await sendPaymentConfirmationEmail(user.email, {
        amount: doc.amount,
        currency: doc.currency,
        transactionId: doc.transactionId || "N/A",
        paymentMethod: doc.paymentMethod,
        createdAt: doc.createdAt,
      });
      console.log(`Payment confirmation email sent to ${user.email}`);
    }

    // Khôi phục tồn kho và gửi email khi hoàn tiền
    if (doc.isRefunded && order.items) {
      let stockRestored = false;
      if (order.orderStatus !== "Cancelled") {
        for (const item of order.items) {
          const product = await Phone.findById(item.phone._id);
          if (product) {
            product.stock += item.quantity;
            await product.save();
            console.log(
              `Restored stock for product ${item.phone._id}: +${item.quantity}`
            );
            stockRestored = true;
          }
        }
        order.orderStatus = "Cancelled"; // Đồng bộ với enum mới
        await order.save();
      }

      if (stockRestored) {
        await sendRefundConfirmationEmail(user.email, {
          refundAmount: doc.refundAmount,
          currency: doc.currency,
          transactionId: doc.transactionId || "N/A",
          refundedAt: doc.refundedAt,
        });
        console.log(`Refund confirmation email sent to ${user.email}`);
      }
    }

    // // 📌 Tự động hủy thanh toán nếu quá 30 phút
    // if (doc.paymentStatus === "Pending") {
    //   setTimeout(async () => {
    //     const payment = await mongoose.model("Payment").findById(doc._id);
    //     if (payment && payment.paymentStatus === "Pending") {
    //       payment.paymentStatus = "Expired";
    //       await payment.save();
    //       const order = await Order.findById(payment.order).populate(
    //         "items.phone"
    //       );
    //       if (order && order.paymentStatus !== "Expired") {
    //         order.paymentStatus = "Expired";
    //         if (order.orderStatus !== "Cancelled") {
    //           order.orderStatus = "Cancelled";
    //           for (const item of order.items) {
    //             const product = item.phone;
    //             if (product) {
    //               product.stock += item.quantity;
    //               await product.save();
    //               console.log(
    //                 `Restored stock for product ${product._id}: +${item.quantity}`
    //               );
    //             }
    //           }
    //         }
    //         await order.save();
    //       }
    //       console.log(`Payment expired: ${doc._id}`);
    //     }
    //   }, 30 * 60 * 1000);
    // }
    // Tự động hủy thanh toán nếu quá 15 phút (đồng bộ với expiresAt trong createMomoOrder)
    if (doc.paymentStatus === "Pending" && doc.expiresAt) {
      const timeUntilExpiry = doc.expiresAt.getTime() - Date.now();
      if (timeUntilExpiry > 0) {
        setTimeout(async () => {
          const payment = await mongoose
            .model("Payment")
            .findById(doc._id)
            .populate("user");
          if (payment && payment.paymentStatus === "Pending") {
            payment.paymentStatus = "Expired";
            payment.failureReason = "Transaction expired due to timeout";
            await payment.save();
            const order = await Order.findById(payment.order).populate(
              "items.phone"
            );
            if (order && order.paymentStatus !== "Expired") {
              order.paymentStatus = "Expired";
              if (order.orderStatus !== "Cancelled") {
                order.orderStatus = "Cancelled";
                for (const item of order.items) {
                  const product = item.phone;
                  if (product) {
                    product.stock += item.quantity;
                    await product.save();
                    console.log(
                      `Restored stock for product ${product._id}: +${item.quantity}`
                    );
                  }
                }
              }
              await order.save();
            }
            // Gửi email thông báo hết hạn
            if (payment.user && payment.user.email) {
              await sendPaymentNotification(payment.user.email, payment);
              console.log(
                `Expiry notification email sent to ${payment.user.email}`
              );
            }
            console.log(`Payment expired: ${doc._id}`);
          }
        }, timeUntilExpiry);
      }
    }

    next();
  } catch (error) {
    console.error("Error in payment post-save hook:", error);
    next(error);
  }
});

// Post-save hook: Auto-expire pending payments after 30 minutes
// paymentSchema.post("save", async function (doc, next) {
//   if (doc.paymentStatus === "Pending") {
//     setTimeout(async () => {
//       const payment = await mongoose.model("Payment").findById(doc._id);
//       if (payment && payment.paymentStatus === "Pending") {
//         payment.paymentStatus = "Expired";
//         await payment.save();
//         console.log(`Payment expired: ${doc._id}`);
//       }
//     }, 30 * 60 * 1000);
//   }
//   next();
// });
paymentSchema.post("save", async function (doc, next) {
  if (doc.paymentStatus === "Pending") {
    setTimeout(async () => {
      const payment = await mongoose.model("Payment").findById(doc._id);
      if (payment && payment.paymentStatus === "Pending") {
        payment.paymentStatus = "Expired";
        await payment.save();
        const order = await Order.findById(payment.order);
        if (order && order.paymentStatus !== "Expired") {
          order.paymentStatus = "Expired";
          if (order.orderStatus !== "Cancelled") {
            order.orderStatus = "Cancelled"; // Đồng bộ với enum mới
            const populatedOrder = await Order.findById(payment.order).populate(
              "items.phone"
            );
            for (const item of populatedOrder.items) {
              const product = await Phone.findById(item.phone);
              if (product) {
                product.stock += item.quantity;
                await product.save();
              }
            }
          }
          await order.save();
        }
        console.log(`Payment expired: ${doc._id}`);
      }
    }, 30 * 60 * 1000);
  }
  next();
});

// Webhook: Update payment status from various gateways
paymentSchema.statics.updatePaymentStatusFromWebhook = async function (
  transactionId,
  status,
  gateway
) {
  try {
    const payment = await this.findOne({ transactionId });
    if (!payment) throw new Error("Payment not found");

    const user = await User.findById(payment.user);
    if (!user) throw new Error("User not found");

    const order = await Order.findById(payment.order).populate("items.phone");
    if (!order) throw new Error("Order not found");

    const statusMap = {
      Momo: {
        0: "Completed",
        9000: "Failed",
      },
      ZaloPay: {
        1: "Completed",
        2: "Failed",
      },
      VNPay: {
        "00": "Completed",
        24: "Cancelled",
      },
      PayPal: {
        COMPLETED: "Completed",
        DENIED: "Failed",
      },
      Stripe: {
        succeeded: "Completed",
        failed: "Failed",
      },
    };

    const mappedStatus = statusMap[gateway]?.[status] || "Failed";

    // Kiểm tra trạng thái hiện tại để tránh ghi đè không cần thiết
    if (payment.paymentStatus === "Completed" && mappedStatus !== "Refunded") {
      console.log(
        `Payment ${transactionId} already completed, ignoring update to ${mappedStatus}`
      );
      return;
    }

    // Cập nhật trạng thái thanh toán
    payment.paymentStatus = mappedStatus;
    await payment.save();

    // Đồng bộ với Order
    if (order.paymentStatus !== mappedStatus) {
      order.paymentStatus = mappedStatus;
      if (mappedStatus === "Failed" || mappedStatus === "Cancelled") {
        // Nếu thanh toán thất bại hoặc bị hủy, cập nhật trạng thái đơn hàng và khôi phục tồn kho
        if (order.orderStatus !== "Cancelled") {
          order.orderStatus = "Cancelled";
          for (const item of order.items) {
            const product = await Phone.findById(item.phone);
            if (product) {
              product.stock += item.quantity;
              await product.save();
            }
          }
        }
      } else if (mappedStatus === "Completed") {
        // Nếu thanh toán thành công, cập nhật trạng thái đơn hàng
        if (order.orderStatus === "Pending") {
          order.orderStatus = "processing";
        }
      }
      await order.save();
    }

    // Gửi email thông báo cập nhật trạng thái
    if (mappedStatus === "Completed") {
      await sendPaymentConfirmationEmail(user.email, {
        amount: payment.amount,
        currency: payment.currency,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
      });
    } else if (mappedStatus === "Failed" || mappedStatus === "Cancelled") {
      await sendEmail(
        user.email,
        "Cập nhật trạng thái thanh toán",
        `Thanh toán của bạn (${payment.transactionId}) đã thất bại hoặc bị hủy. Vui lòng thử lại.`,
        `<h2>Cập nhật trạng thái thanh toán</h2>
         <p>Thanh toán của bạn (${payment.transactionId}) đã thất bại hoặc bị hủy.</p>
         <p>Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>`
      );
    }

    console.log(
      `Payment ${transactionId} updated to ${mappedStatus} from ${gateway}`
    );
  } catch (error) {
    console.error("Error updating payment status:", error);
  }
};

module.exports = mongoose.model("Payment", paymentSchema);
