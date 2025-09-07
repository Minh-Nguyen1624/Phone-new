const Payment = require("../model/paymentModel");
// const {validationResult} = require('express-validation');
const Order = require("../model/orderModel");
const User = require("../model/userModel");
const Phone = require("../model/phoneModel");
const Transaction = require("../model/transactionModel");
const axios = require("axios");
// const paypal = require("paypal-rest-sdk"); // Hoặc thư viện PayPal bạn đang dùng
const asyncHandler = require("express-async-handler");
const { paypal, client } = require("../config/paypalConfig");
const momoService = require("../services/momoService");
const crypto = require("crypto");
const querystring = require("qs");
const moment = require("moment");
const vnpayConfig = require("../config/vnpayConfig");
// const vnPayService = require("../services/vnpayService");
const {
  createPayPalPayment,
  getPayPalAccessToken,
  capturePayPalPayment,
  verifyPaypalWebhook,
} = require("../services/paypalService");
const { convertVNDToUSD } = require("../utils/currencyConverter");
const { convertOrderToUSD } = require("../utils/orderConverter");
const {
  createVnPayWalletRequest,
  verifySignature,
  queryTransaction,
} = require("../services/vnpayService");
// const { createVnPayRequest, verifyPaymentResponse, VNPayError } = require('../services/vnpayService');
const { createStripePaymentIntent } = require("../services/stripeService");
const {
  createZaloPayRequest,
  verifyZaloPaySignature,
} = require("../services/zalopayService");
const {
  createMomoRequest,
  queryMomoTransaction,
} = require("../services/momoService");
const {
  sendPaymentConfirmationEmail,
  sendPaymentNotification,
  sendRefundConfirmationEmail,
} = require("../utils/email");
const { updateOrderPaymentStatus } = require("../controller/orderController");
const zaloPayConfig = require("../config/zalopayConfig");
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const {
  createBulkNotifications,
  createNotification,
} = require("./notificationController");
const validator = require("validator");
const notificationTemplates = require("../config/notificationTemplates");
const { MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_PARTNER_CODE, MOMO_ENDPOINT } =
  process.env;

// Create payment
const createPayment = async function (req, res) {
  try {
    const paymentData = req.body;
    const userId = req.user?._id;

    // Kiểm tra payment đã tồn tại cho order này chưa
    const existingPayment = await Payment.findOne({ order: paymentData.order });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already exists for this order",
      });
    }

    // Validation: Amount không được âm
    if (paymentData.amount < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount cannot be negative" });
    }

    // Tìm order và kiểm tra quyền truy cập
    const order = await Order.findById(paymentData.order);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Kiểm tra quyền truy cập
    if (userId && order.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access to this order" });
    }

    if (paymentData.paymentMethod !== order.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: `Payment method (${paymentData.paymentMethod}) does not match the order payment method (${order.paymentMethod})`,
      });
    }

    // Cập nhật giá trong order.items và tính lại tổng tiền
    for (const item of order.items) {
      const phone = await mongoose.model("Phone").findById(item.phone);
      if (!phone) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.phone}`,
        });
      }
      const phonePrice = phone.finalPrice || phone.price;
      if (item.price !== phonePrice) {
        console.log(
          `Updating price for product ${phone.name}: from ${item.price} to ${phonePrice}`
        );
        item.price = phonePrice;
      }
    }

    // Tính lại subTotal
    order.subTotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Gán totalCartPrice bằng subTotal
    order.totalCartPrice = order.subTotal;

    // Gán totalAmount bằng subTotal
    order.totalAmount = order.subTotal;

    // Áp dụng discount nếu có
    if (order.discount) {
      const discount = await mongoose
        .model("Discount")
        .findById(order.discount);
      if (discount && discount.isCurrentlyActive) {
        const minOrderValue = discount.minOrderValue || 0;
        if (order.totalAmount >= minOrderValue) {
          if (discount.discountType === "percentage") {
            order.discountAmount =
              (order.totalAmount * discount.discountValue) / 100;
          } else {
            order.discountAmount = discount.discountValue;
          }
          order.totalAmount -= order.discountAmount;
          order.totalCartPrice = order.totalAmount; // Đồng bộ totalCartPrice
        } else {
          order.discount = null;
          order.discountAmount = 0;
        }
      } else {
        order.discount = null;
        order.discountAmount = 0;
      }
    } else {
      order.discountAmount = 0;
    }

    // Cộng phí vận chuyển vào totalAmount
    order.totalAmount += order.shippingFee || 0;

    // Tính lại loyaltyPoints (1đ = 2 điểm)
    order.loyaltyPoints = Math.floor(order.totalAmount * 2);

    // Validation: Kiểm tra amount sau khi cập nhật
    if (paymentData.amount !== order.totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${paymentData.amount} ${paymentData.currency}) does not match updated order total (${order.totalAmount} ${paymentData.currency}). Expected amount: ${order.totalAmount}`,
      });
    }

    // Validation: Kiểm tra currency từ items
    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order has no items to determine currency",
      });
    }

    // Kiểm tra tất cả items có cùng currency không
    const firstItemCurrency = order.items[0].currency;
    const allItemsSameCurrency = order.items.every(
      (item) => item.currency === firstItemCurrency
    );
    if (!allItemsSameCurrency) {
      return res.status(400).json({
        success: false,
        message: "Items in the order have different currencies",
      });
    }

    // So sánh currency từ items với paymentData.currency
    if (paymentData.currency !== firstItemCurrency) {
      return res.status(400).json({
        success: false,
        message: `Payment currency (${paymentData.currency}) does not match order items currency (${firstItemCurrency})`,
      });
    }

    // Gán user từ order nếu không có trong paymentData
    paymentData.user = paymentData.user || order.user;
    // Validation: Kiểm tra transactionId và gatewayResponse chỉ cho non-COD
    // if (paymentData.paymentMethod !== "Cash on Delivery") {
    //   if (!paymentData.transactionId) {
    //     return res.status(400).json({
    //       success: false,
    //       message:
    //         "Transaction ID is required for non-cash on delivery payments",
    //     });
    //   }
    //   if (!paymentData.gatewayResponse) {
    //     return res.status(400).json({
    //       success: false,
    //       message:
    //         "Gateway response is required for non-cash on delivery payments",
    //     });
    //   }
    //   if (
    //     !paymentData.gatewayResponse.status ||
    //     !paymentData.gatewayResponse.message
    //   ) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Gateway response must contain status and message",
    //     });
    //   }

    //   // Kiểm tra tính duy nhất của transactionId
    //   const existingTransaction = await Transaction.findOne({
    //     transactionId: paymentData.transactionId,
    //   });
    //   if (existingTransaction) {
    //     return res.status(400).json({
    //       success: false,
    //       message: `Transaction ID ${paymentData.transactionId} already exists`,
    //     });
    //   }
    // }

    // Lấy danh sách phương thức thanh toán từ enum của model
    const paymentMethods = Order.schema.path("paymentMethod").enumValues;
    // Xác định directPaymentMethods dựa trên logic (có thể mở rộng từ model)
    const directPaymentMethods = paymentMethods.filter((method) =>
      ["Cash on Delivery", "In-Store"].includes(method)
    );

    // Validation: Kiểm tra transactionId và gatewayResponse chỉ cho non-direct methods
    if (!directPaymentMethods.includes(paymentData.paymentMethod)) {
      if (!paymentData.transactionId) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID is required for non-direct payment methods",
        });
      }
      if (!paymentData.gatewayResponse) {
        return res.status(400).json({
          success: false,
          message:
            "Gateway response is required for non-direct payment methods",
        });
      }
      if (
        !paymentData.gatewayResponse.status ||
        !paymentData.gatewayResponse.message
      ) {
        return res.status(400).json({
          success: false,
          message: "Gateway response must contain status and message",
        });
      }

      // Kiểm tra tính duy nhất của transactionId
      const existingTransaction = await Transaction.findOne({
        transactionId: paymentData.transactionId,
      });
      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: `Transaction ID ${paymentData.transactionId} already exists`,
        });
      }
    }

    // Validation: Kiểm tra clientIp nếu paymentMethod là VNPay
    if (paymentData.paymentMethod === "VNPay") {
      const clientIp =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      if (!clientIp) {
        return res.status(400).json({
          success: false,
          message: "Client IP is required for VNPay payments",
        });
      }
      if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(clientIp)) {
        return res.status(400).json({
          success: false,
          message: "Invalid client IP address format",
        });
      }
      paymentData.clientIp = clientIp;
    }

    // Tạo Payment trước để có paymentId
    paymentData.transactions = []; // Tạm thời để rỗng, sẽ cập nhật sau
    const payment = new Payment(paymentData);
    await payment.save();

    // Tạo Transaction và gán vào payment.transactions
    const transactionData = {
      user: paymentData.user,
      order: paymentData.order,
      paymentId: payment._id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: "Pending",
      paymentMethod: paymentData.paymentMethod,
      transactionId:
        paymentData.transactionId ||
        (paymentData.paymentMethod === "Cash on Delivery"
          ? `COD-${payment._id.toString().substring(0, 8)}`
          : paymentData.transactionId), // Tạo ID duy nhất cho COD
      transactionDate: new Date(),
      description: `Transaction for order ${paymentData.order}`,
      initiator: "user",
    };

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Cập nhật mảng transactions của Payment
    payment.transactions = [transaction._id];
    await payment.save();

    // Thêm payment vào mảng payments của Order
    order.payments = order.payments || [];
    order.payments.push(payment._id);
    await order.save();

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      payment: payment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all payments
const getAllPayments = async function (req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const payments = await Payment.find()
      .populate("user", "username email")
      .populate("order", "totalAmount paymentMethod orderStatus")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalPayments = await Payment.countDocuments();

    res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      data: {
        payments,
        pagpagination: {
          total: totalPayments,
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payment by ID
const getPaymentById = async function (req, res) {
  try {
    const id = req.params.id;
    const payment = await Payment.findById(id)
      .populate("user", "username email")
      .populate("order", "totalAmount paymentMethod orderStatus")
      .populate("transactions", "transactionId status createdAt")
      .populate("phone", "name price imageUrl specifications stock");

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({
      success: true,
      message: "Payment retrieved successfully",
      payment: payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update payment
const updatePayment = async function (req, res) {
  try {
    const id = req.params.id;
    const paymentData = req.body;
    const userId = req.user?._id;

    const restrictedFields = ["transactionId", "isRefunded", "refundedAt"];
    for (const field of restrictedFields) {
      if (paymentData[field] !== undefined) {
        return res.status(400).json({
          success: false,
          message: `Cannot update field: ${field}. Use refund endpoint instead`,
        });
      }
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    // Kiểm tra quyền truy cập
    if (userId && payment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this payment",
      });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(id, paymentData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      payment: updatedPayment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete payment
const deletePayment = async function (req, res) {
  try {
    const id = req.params.id;
    const userId = req.user?._id;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    // Kiểm tra quyền truy cập
    if (userId && payment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this payment",
      });
    }

    // Xóa payment khỏi mảng payments của Order
    const order = await Order.findById(payment.order);
    if (order && order.payments) {
      order.payments = order.payments.filter(
        (paymentId) => paymentId.toString() !== id
      );
      await order.save();
    }

    await Payment.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const refundPayment = async function (req, res) {
  try {
    const id = req.params.id;
    const { refundAmount, refundAt } = req.body;
    const userId = req.user?._id;

    const payment = await Payment.findById(id).populate("order");
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    // Kiểm tra quyền truy cập
    if (userId && payment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this payment",
      });
    }

    if (payment.isRefunded && payment.paymentStatus === "Refunded") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been fully refunded",
      });
    }

    if (
      payment.paymentStatus !== "Completed" &&
      payment.paymentStatus !== "Partially Refunded"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only completed or partially refunded payments can be refunded",
      });
    }

    if (!refundAmount || refundAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Refund amount must be positive" });
    }

    const remainingAmount = payment.amount - payment.refundAmount;
    if (refundAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (${refundAmount}) cannot exceed the remaining payment amount (${remainingAmount})`,
      });
    }

    if (refundAt && new Date(refundAt) > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Refund date cannot be in the future",
      });
    }

    payment.refundAmount += refundAmount;
    payment.isRefunded = true;
    payment.refundedAt = refundAt || new Date();
    payment.paymentStatus =
      payment.refundAmount === payment.amount
        ? "Refunded"
        : "Partially Refunded";
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment refunded successfully",
      refundAmount: refundAmount,
      remainingAmount: payment.amount - payment.refundAmount,
    });
  } catch (error) {
    console.error("❌ Refund Payment Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const createPayPalOrder = asyncHandler(async (req, res) => {
  try {
    const { userId, orderId, amount, currency } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!userId || !orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Thiếu các trường bắt buộc: userId, orderId, amount",
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount phải là số dương hợp lệ",
      });
    }

    const decimalPlaces = parsedAmount.toString().includes(".")
      ? parsedAmount.toString().split(".")[1].length
      : 0;
    if (decimalPlaces > 2) {
      return res.status(400).json({
        success: false,
        message: "Amount chỉ được có tối đa 2 chữ số thập phân",
      });
    }

    // Kiểm tra đơn hàng và người dùng
    const order = await Order.findById(orderId).populate("items.phone");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // // Kiểm tra quyền truy cập
    // const isAdmin =
    //   req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    // if (order.user.toString() !== userId && !isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Không có quyền truy cập đơn hàng này",
    //   });
    // }

    if (order.paymentMethod !== "PayPal") {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán của đơn hàng không phải PayPal",
      });
    }

    // Kiểm tra xem Payment đã tồn tại chưa
    const existingPayment = await Payment.findOne({ order: orderId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Thanh toán cho đơn hàng này đã tồn tại",
        paymentId: existingPayment._id,
        paymentMethod: existingPayment.paymentMethod,
      });
    }

    // Kiểm tra tồn kho và đồng bộ giá sản phẩm
    for (const item of order.items) {
      const product = item.phone;
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Sản phẩm không tồn tại: ${item.phone}`,
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Không đủ tồn kho cho sản phẩm: ${product.name}`,
        });
      }
      // Đồng bộ giá sản phẩm
      if (product.price !== item.originalPrice) {
        item.originalPrice = product.price;
        item.price = product.price;
      }
    }

    let orderTotal = order.totalAmount;
    let orderCurrency = order.items[0]?.currency || "VND";

    // Kiểm tra currency của các items
    const itemCurrencies = order.items.map((item) => item.currency || "VND");
    const uniqueCurrencies = [...new Set(itemCurrencies)];
    if (uniqueCurrencies.length > 1) {
      return res.status(400).json({
        success: false,
        message: `Tất cả sản phẩm trong đơn hàng phải có cùng đơn vị tiền tệ. Tìm thấy: ${uniqueCurrencies.join(
          ", "
        )}`,
      });
    }

    // Kiểm tra đơn vị tiền tệ thực tế dựa trên giá trị số
    if (orderTotal > 1000000 && orderCurrency === "USD") {
      orderCurrency = "VND";
    }

    let finalAmount = parsedAmount;
    let finalCurrency = currency || "VND";

    if (orderCurrency === "VND") {
      orderTotal = await convertVNDToUSD(orderTotal);
      orderCurrency = "USD";

      order.subTotal = await convertVNDToUSD(order.subTotal);
      order.discountAmount = await convertVNDToUSD(order.discountAmount || 0);
      order.shippingFee = await convertVNDToUSD(order.shippingFee || 0);
      order.totalAmount = orderTotal;
      for (const item of order.items) {
        item.originalPrice = await convertVNDToUSD(item.originalPrice);
        item.price = item.originalPrice;
        item.currency = "USD";
      }
      console.log("Converted values:", {
        subTotalUSD: order.subTotal,
        discountAmountUSD: order.discountAmount,
        shippingFeeUSD: order.shippingFee,
        orderTotal,
      });
    } else if (orderCurrency !== "USD") {
      return res.status(400).json({
        success: false,
        message: `Đơn vị tiền tệ không được hỗ trợ: ${orderCurrency}. Chỉ hỗ trợ VND và USD.`,
      });
    }

    // Nếu amount gửi lên là VND, chuyển đổi sang USD
    if (finalCurrency === "VND") {
      finalAmount = await convertVNDToUSD(parsedAmount);
      finalCurrency = "USD";
    } else if (finalCurrency !== "USD") {
      return res.status(400).json({
        success: false,
        message: `Đơn vị tiền tệ thanh toán không được hỗ trợ: ${finalCurrency}. Chỉ hỗ trợ VND và USD.`,
      });
    }

    if (Math.abs(orderTotal - finalAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Số tiền thanh toán (${finalAmount.toFixed(
          2
        )} ${finalCurrency}) không khớp với tổng đơn hàng (${orderTotal.toFixed(
          2
        )} ${orderCurrency})`,
      });
    }

    // Kiểm tra BASE_URL
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error("BASE_URL chưa được định nghĩa trong biến môi trường");
    }

    // Tạo đơn hàng trên PayPal
    const paypalResponse = await createPayPalPayment(
      finalAmount,
      "USD",
      `${baseUrl}/api/payment/success`,
      `${baseUrl}/api/payment/cancel`
    );

    const { transactionId, approvalUrl, gatewayResponse } = paypalResponse;
    if (!transactionId || !gatewayResponse) {
      throw new Error("Thiếu transactionId hoặc gatewayResponse từ PayPal");
    }

    // Tạo Payment
    let newPayment = new Payment({
      user: userId,
      order: orderId,
      paymentMethod: "PayPal",
      paymentStatus: "Pending",
      amount: finalAmount,
      currency: "USD",
      transactionId,
      transactions: [],
      gatewayResponse,
    });

    newPayment = await newPayment.save();

    const existingTransaction = await Transaction.findOne({ transactionId });
    if (existingTransaction) {
      throw new Error(`Transaction ID ${transactionId} already exists`);
    }

    // Tạo Transaction
    let newTransaction = new Transaction({
      paymentId: newPayment._id,
      payment: newPayment._id,
      transactionId, // Sử dụng transactionId từ PayPal
      transactionRef: transactionId,
      amount: finalAmount,
      currency: "USD",
      status: "Pending",
      order: orderId,
      user: userId,
      paymentMethod: "PayPal",
    });

    newTransaction = await newTransaction.save();

    // Cập nhật Payment với transaction
    newPayment.transactions.push(newTransaction._id);
    await newPayment.save();

    // Cập nhật đơn hàng với payment
    order.payments.push(newPayment._id);
    await order.save();

    res.status(200).json({
      success: true,
      orderID: transactionId,
      paymentId: newPayment._id,
      approvalUrl,
      payment: newPayment,
    });
  } catch (error) {
    console.error("PayPal Order Creation Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Không thể tạo đơn hàng PayPal",
      error: error.message,
    });
  }
});

const capturePayPalOrder = asyncHandler(async (req, res) => {
  try {
    // const { orderID, PayerID } = req.query;
    const { orderID } = req.query; // PayerID không cần thiết cho API capture

    // 📌 Kiểm tra dữ liệu đầu vào
    // if (!orderID || !PayerID) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Missing orderID or PayerID in query params",
    //   });
    // }
    if (!orderID) {
      return res.status(400).json({
        success: false,
        message: "Missing orderID in query params",
      });
    }

    // 📌 Tìm bản ghi Payment hiện có
    const payment = await Payment.findOne({ transactionId: orderID })
      .populate("user", "email")
      .populate({
        path: "order",
        populate: { path: "items.phone", select: "stock name" },
      });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // 📌 Kiểm tra user và order trong database
    // const user = await User.findById(payment.user);
    const user = payment.user;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // const order = await Order.findById(payment.order).populate("items.phone");
    const order = payment.order;
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 📌 Kiểm tra quyền truy cập
    const userId = req.user?._id;
    if (
      userId &&
      payment.user.toString() !== userId.toString() &&
      (!req.user.role || req.user.role.roleName.toLowerCase() !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this payment",
      });
    }

    // 📌 Kiểm tra trạng thái Payment
    if (payment.paymentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Payment is already in ${payment.paymentStatus} status`,
      });
    }

    // 📌 Kiểm tra trạng thái đơn hàng PayPal
    const accessToken = await getPayPalAccessToken();
    const orderDetails = await axios.get(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${orderID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Kiểm tra trạng thái VOIDED (đơn hàng hết hạn)
    if (orderDetails.data.status === "VOIDED") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã hết hạn. Vui lòng tạo đơn hàng mới.",
      });
    }

    if (orderDetails.data.status !== "APPROVED") {
      const approvalUrl = orderDetails.data.links.find(
        (link) => link.rel === "approve"
      )?.href;
      return res.status(400).json({
        success: false,
        message: "Vui lòng hoàn tất thanh toán trên PayPal.",
        approval_url: approvalUrl || null,
      });
    }

    // 📌 Xác nhận thanh toán (capture)
    const captureResponse = await capturePayPalPayment(orderID);
    // await updateOrderPaymentStatus(order._id, "PAID", orderID, payment.amount, "PayPal", captureResponse, user._id);

    // 📌 Cập nhật bản ghi Payment
    payment.paymentStatus = "Completed";
    payment.gatewayResponse = captureResponse;
    await payment.save();

    // 📌 Đồng bộ trạng thái Order
    order.paymentStatus = "Completed";
    if (order.orderStatus === "Pending") {
      order.orderStatus = "processing";
    }
    await order.save();

    // 📌 Gửi email xác nhận
    await sendPaymentConfirmationEmail(user.email, {
      amount: payment.amount,
      currency: payment.currency,
      transactionId: payment.transactionId,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
    });

    // 📌 Trả về phản hồi
    res.json({
      success: true,
      status: captureResponse.status,
      message: "Payment successful!",
      // payment,
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        paymentStatus: payment.paymentStatus,
        amount: payment.amount,
        currency: payment.currency,
        order: payment.order._id,
      },
    });
  } catch (error) {
    console.error("❌ PayPal Capture Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to capture PayPal order",
      error: error.message,
      details: error.response?.data || error.stack,
    });
  }
});

const handlePayPalWebhook = asyncHandler(async (req, res) => {
  try {
    const isValid = await verifyPaypalWebhook(req.headers, res.body);

    if (!isValid) {
      console.error("❌ PayPal Webhook - Invalid signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body;
    console.log("🔹 PayPal Webhook Event:", event);

    // Lấy event type (ví dụ: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED)
    const eventType = event.event_type;

    // Lấy orderId / resourceId
    const resource = event.resource;
    const orderId =
      resource?.id || resource?.supplementary_data?.related_ids?.order_id;

    const payment = await Payment.findOne({ transactionId: orderId }).populate(
      "user order"
    );
    if (!payment) {
      console.error(`❌ Payment not found for orderId: ${orderId}`);
      return res.status(404).json({ message: "Payment not found" });
    }

    let newStatus = payment.paymentStatus;

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      newStatus = "Pending";
    } else if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      newStatus = "Completed";
    } else if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.REFUNDED"
    ) {
      newStatus = "Failed";
    }

    // Tạo transaction mới
    const transaction = new Transaction({
      user: payment.user._id,
      order: payment.order._id,
      paymentId: payment._id,
      amount: parseFloat(resource?.amount?.value || payment.amount),
      status: newStatus,
      paymentMethod: "PayPal",
      transactionDate: new Date(),
      description: `PayPal Webhook Event: ${eventType}`,
      transactionRef: resource?.id || orderId,
      currency: resource?.amount?.currency_code || "USD",
      initiator: "system",
    });
    await transaction.save();

    await Payment.updateOne(
      {
        _id: payment._id,
      },
      {
        $set: {
          paymentStatus: newStatus,
          gatewayResponse: resource,
        },
        $push: {
          transactions: transaction._id,
        },
      }
    );

    console.log(`✅ Updated PayPal payment ${orderId} -> ${newStatus}`);

    // Phản hồi thành công cho PayPal
    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Error handling PayPal Webhook:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getPaymentReport = async (req, res) => {
  try {
    if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID không hợp lệ" });
    }

    // Tổng doanh thu của các thanh toán thành công
    const totalRevenue = await Payment.aggregate([
      { $match: { paymentStatus: "Completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    // Thống kê số lượng thanh toán theo trạng thái
    const statusReport = await Payment.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
    ]);
    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        statusReport,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const { schedulePaymentExpiry } = require("../services/paymentExpiryService");
const momoConfig = require("../config/momoConfig");

// Hàm tạo đơn hàng (MoMo hoặc VietQR) - Cập nhật để trả về link cho MoMo và hình ảnh cho VietQR
const createMomoOrder = async (req, res) => {
  try {
    const {
      userId,
      orderId,
      amount,
      orderInfo,
      transaction,
      paymentMethod,
      paymentCode,
      orderGroupId = "", // Optional, default to empty string
    } = req.body;

    if (!userId || !orderId || !amount || !orderInfo) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum < 1000) {
      return res.status(400).json({
        success: false,
        message:
          "Amount must be a positive number and greater than or equal to 1,000 VND.",
      });
    }

    const order = await Order.findById(orderId).populate("items.phone");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isAdmin =
      req.user?.role && req.user.role.roleName.toLowerCase() === "admin";
    if (order.user.toString() !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this order",
      });
    }

    const expectedPaymentMethod = paymentMethod || "Momo";
    if (order.paymentMethod !== expectedPaymentMethod) {
      return res.status(400).json({
        success: false,
        message: `Order payment method (${order.paymentMethod}) does not match requested method (${expectedPaymentMethod})`,
      });
    }

    if (amountNum !== order.totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amountNum} VND) does not match order total (${order.totalAmount} VND)`,
      });
    }

    const existingPayment = await Payment.findOne({ order: orderId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment for this order already exists",
        paymentId: existingPayment._id,
        paymentMethod: existingPayment.paymentMethod,
      });
    }

    for (const item of order.items) {
      const product = item.phone;
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.phone}`,
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`,
        });
      }
      if (expectedPaymentMethod === "Momo") {
        if (amountNum < 1000 || amountNum > 50000000) {
          return res.status(400).json({
            success: false,
            message:
              "Payment amount must be between 1,000 VND and 50,000,000 VND for MoMo transactions.",
          });
        }
      }
    }

    let paymentResponse;
    let responsePayload = {
      success: true,
      message: "Payment created successfully",
    };

    let expiresAt;
    if (paymentMethod === "Momo") {
      const { returnUrl, notifyUrl } = momoConfig;

      try {
        paymentResponse = await createMomoRequest(
          orderId,
          amount,
          orderInfo,
          returnUrl,
          notifyUrl,
          paymentCode,
          orderGroupId // Pass the optional orderGroupId
        );
        if (!paymentResponse || !paymentResponse.requestId) {
          return res.status(500).json({
            success: false,
            message: "Failed to create MoMo request: Invalid response",
          });
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to create MoMo request",
          error: error.message,
        });
      }

      const currentTime = Date.now();
      expiresAt = new Date(currentTime + 15 * 60 * 1000);

      if (currentTime > expiresAt.getTime()) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction has expired. Please create a new payment request.",
        });
      }

      responsePayload.paymentUrl =
        paymentResponse.shortLink || paymentResponse.payUrl;
      responsePayload.expiresAt = expiresAt;
    } else if (paymentMethod === "VietQR") {
      try {
        paymentResponse = await createVietQRRequest(orderId, amount, orderInfo);
      } catch (error) {
        console.error("❌ VietQR Error Details:", {
          message: error.message,
          response: error.response?.data,
        });
        return res.status(503).json({
          success: false,
          message:
            "Hệ thống VietQR đang gặp sự cố. Vui lòng thử lại sau hoặc chọn phương thức thanh toán MoMo.",
        });
      }
      expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      responsePayload.qrCodeImage = paymentResponse.qrCodeImage;
      responsePayload.expiresAt = expiresAt;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method" });
    }

    const transactionsArray = transaction ? [transaction] : [];

    const newPayment = new Payment({
      user: userId,
      order: orderId,
      paymentMethod: expectedPaymentMethod,
      paymentStatus: "Pending",
      amount: amount,
      currency: "VND",
      transactionId: paymentResponse.requestId || paymentResponse.orderId,
      transactions: transactionsArray,
      gatewayResponse: paymentResponse,
      orderInfo: orderInfo,
      returnUrl: momoConfig.returnUrl,
      notifyUrl: momoConfig.notifyUrl,
      createdAt: new Date(),
      expiresAt: expiresAt || null,
    });

    let savedPayment;
    try {
      savedPayment = await newPayment.save();
    } catch (error) {
      console.error("❌ Error saving payment:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to save payment",
        error: error.message,
      });
    }

    try {
      await schedulePaymentExpiry(savedPayment);
      order.payments.push(savedPayment._id);
      await order.save();
    } catch (error) {
      console.error("❌ Error updating order:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to update order with payment",
        error: error.message,
      });
    }

    responsePayload.payment = savedPayment;
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error("❌ Error in createMomoOrder:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Hàm tạo yêu cầu VietQR với VietQR.io Quick Link
const createVietQRRequest = async (orderId, amount, orderInfo) => {
  const vietQRConfig = {
    bankId: process.env.BANK_ID,
    accountNo: process.env.ACCOUNT_NO,
    accountName: process.env.ACCOUNT_NAME,
    template: process.env.TEMPLATE || "compact",
  };

  if (!vietQRConfig.bankId) {
    throw new Error("Missing BANK_ID in environment variables");
  }
  if (!vietQRConfig.accountNo) {
    throw new Error("Missing ACCOUNT_NO in environment variables");
  }
  if (!vietQRConfig.accountName) {
    throw new Error("Missing ACCOUNT_NAME in environment variables");
  }

  const amountNum = Math.round(Number(amount));
  if (isNaN(amountNum) || amountNum <= 0 || amountNum < 1000) {
    throw new Error(
      "Amount must be a positive number and greater than or equal to 1,000 VND."
    );
  }

  const uniqueOrderId = `${orderId}_${Date.now()}`;

  // Tạo URL Quick Link
  const baseUrl = `https://img.vietqr.io/image/${vietQRConfig.bankId}-${vietQRConfig.accountNo}-${vietQRConfig.template}.png`;
  const queryParams = new URLSearchParams({
    amount: amountNum,
    addInfo: orderInfo || `Thanh toan don hang #${uniqueOrderId}`,
    accountName: vietQRConfig.accountName,
  }).toString();

  const qrCodeUrl = `${baseUrl}?${queryParams}`;

  // Kiểm tra URL có trả về hình ảnh hợp lệ không
  try {
    const response = await axios.get(qrCodeUrl, {
      responseType: "arraybuffer", // Nhận dữ liệu dưới dạng binary (hình ảnh)
    });

    // Kiểm tra Content-Type để đảm bảo trả về hình ảnh
    const contentType = response.headers["content-type"];
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error("VietQR Quick Link did not return an image");
    }

    return {
      qrCodeUrl, // Trả về URL của hình ảnh QR
      orderId: uniqueOrderId,
      amount: amountNum,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
  } catch (error) {
    console.error(
      "Error creating VietQR Quick Link:",
      error.response?.data || error.message
    );
    throw new Error("Failed to create VietQR Quick Link");
  }
};

const returnMomoOrder = async (req, res) => {
  try {
    const {
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
      partnerCode,
    } = req.query;

    if (!orderId || !requestId || !signature) {
      return res
        .status(401)
        .json({ success: false, message: "Missing required fields" });
    }

    const { accessKey, secretKey } = momoConfig; // Use momoConfig
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const computedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    if (computedSignature !== signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const payment = await Payment.findOne({
      transactionId: requestId,
    }).populate("user");
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Payment is already in ${payment.paymentStatus} status`,
      });
    }

    if (resultCode == 1005) {
      payment.paymentStatus = "Expired";
      payment.failureReason = "Transaction expired or did not exist";
      await payment.save();

      const order = await Order.findById(payment.order);
      if (order && order.paymentStatus !== "Expired") {
        order.paymentStatus = "Expired";
        if (order.orderStatus !== "Cancelled") {
          order.orderStatus = "Cancelled";
          const populatedOrder = await Order.findById(payment.order).populate(
            "items.phone"
          );
          for (const item of populatedOrder.items) {
            const product = item.phone;
            if (product) {
              product.stock += item.quantity;
              await product.save();
            }
          }
        }
        await order.save();
      }

      if (payment.user && payment.user.email) {
        await sendPaymentNotification(payment.user.email, payment);
      }

      return res.status(400).json({
        success: false,
        message:
          "Transaction expired or did not exist. Please create a new payment request.",
      });
    }

    payment.paymentStatus = resultCode == 0 ? "Completed" : "Failed";
    payment.gatewayResponse = {
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
      partnerCode,
    };

    payment.transactionId = transId;
    await payment.save();

    if (resultCode == 0) {
      res.status(200).json({
        success: true,
        message: "Momo order status retrieved successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve Momo order status",
      });
    }
  } catch (error) {
    console.error("❌ Error in returnMomoOrder:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
const verifyMomoSignature = async (data) => {
  const { accessKey, secretKey } = momoConfig; // Use correct keys
  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature,
  } = data;

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
  const computedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  return computedSignature === signature;
};

const handleMomoWebhook = async (req, res) => {
  try {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = req.body;

    // Check if responseTime is too old (e.g., older than 1 hour)
    const currentTime = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    if (currentTime - responseTime > maxAge) {
      console.warn("⚠️ Outdated webhook payload:", {
        responseTime,
        currentTime,
      });
      return res.status(400).json({
        success: false,
        message: "Webhook payload is too old",
      });
    }

    if (!orderId || !requestId || !signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const isValidSignature = await verifyMomoSignature(req.body);
    if (!isValidSignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const payment = await Payment.findOne({
      transactionId: requestId,
    }).populate("user");
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    if (payment.paymentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Payment is already in ${payment.paymentStatus} status`,
      });
    }

    if (resultCode == 1005) {
      payment.paymentStatus = "Expired";
      payment.failureReason = "Transaction expired or did not exist";
      await payment.save();

      const order = await Order.findById(payment.order).populate("items.phone");
      if (order && order.paymentStatus !== "Expired") {
        order.paymentStatus = "Expired";
        if (order.orderStatus !== "Cancelled") {
          order.orderStatus = "Cancelled";
          for (const item of order.items) {
            const product = item.phone;
            if (product) {
              product.stock += item.quantity;
              await product.save();
            }
          }
        }
        await order.save();
      }

      if (payment.user && payment.user.email) {
        await sendPaymentNotification(payment.user.email, payment);
      }

      // await updateOrderPaymentStatus(payment.order, "Expired", requestId, amount, "Momo", req.body, payment.user._id);

      return res.status(200).json({
        success: true,
        message: "Payment marked as expired",
        payment,
      });
    }

    payment.paymentStatus = resultCode == 0 ? "Completed" : "Failed";
    payment.gatewayResponse = {
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
      partnerCode,
    };
    payment.transactionId = transId;
    await payment.save();

    const paymentDetails = {
      orderId: payment.order.toString(),
      amount: amount,
      orderInfo: orderInfo,
      transactionId: transId,
      paymentStatus: payment.paymentStatus,
      paymentMethod: payment.paymentMethod,
      gatewayResponse: payment.gatewayResponse,
    };

    const userEmail = payment.user.email;
    if (resultCode == 0) {
      await sendPaymentConfirmationEmail(userEmail, paymentDetails, true);
    } else {
      await sendPaymentNotification(userEmail, payment);
    }

    // await updateOrderPaymentStatus(payment.order, resultCode == 0 ? "PAID" : "FAILED", transId, amount, "Momo", req.body, payment.user._id);

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Momo Webhook Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Xử lý thanh toán
const createZaloPayPayment = async (req, res) => {
  try {
    const {
      userId,
      orderId,
      amount,
      orderInfo,
      returnUrl,
      notifyUrl,
      appUser,
      bankCode,
      paymentMethod,
    } = req.body;

    // Validate input data
    if (
      !userId ||
      !orderId ||
      !amount ||
      !orderInfo ||
      !returnUrl ||
      !notifyUrl
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Validate URL format using validator
    if (
      !validator.isURL(returnUrl, {
        protocols: ["https"],
        require_protocol: true,
      })
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid return URL format. Must be a valid HTTPS URL.",
      });
    }
    if (
      !validator.isURL(notifyUrl, {
        protocols: ["https"],
        require_protocol: true,
      })
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid notify URL format. Must be a valid HTTPS URL.",
      });
    }

    // Từ chối nếu sử dụng localhost
    if (returnUrl.includes("localhost") || notifyUrl.includes("localhost")) {
      return res.status(400).json({
        success: false,
        message:
          "Localhost URLs are not allowed for returnUrl or notifyUrl. Use a public URL instead.",
      });
    }

    // Cảnh báo nếu sử dụng ngrok
    if (returnUrl.includes("ngrok") || notifyUrl.includes("ngrok")) {
      console.warn(
        "🔹 Warning: notifyUrl or returnUrl uses ngrok. Ensure the ngrok tunnel is active to avoid callback failures."
      );
    }
    // Validate ObjectId format
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(orderId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId or orderId format" });
    }

    // Kiểm tra user tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Kiểm tra amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive integer and at least 1,000 VND",
      });
    }

    // Check if the order exists and its payment method matches
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Kiểm tra amount có khớp với totalAmount của order không
    if (parsedAmount !== order.totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${parsedAmount} VND) does not match order total (${order.totalAmount} VND)`,
      });
    }

    const isQR = paymentMethod === "qr";
    const expectedPaymentMethod = isQR ? "ZaloPay-QR" : "ZaloPay";
    if (order.paymentMethod !== expectedPaymentMethod) {
      return res.status(400).json({
        success: false,
        message: `Order payment method (${order.paymentMethod}) does not match requested payment method (${expectedPaymentMethod})`,
      });
    }

    // Check if a payment already exists for this order
    const existingPayment = await Payment.findOne({ order: orderId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: `A payment for order ${orderId} already exists`,
        existingPayment,
      });
    }

    // Create ZaloPay payment request (sử dụng returnUrl và notifyUrl gốc vì đã được validate là HTTPS)
    const response = await createZaloPayRequest(
      orderId,
      amount,
      orderInfo,
      returnUrl,
      notifyUrl,
      appUser || userId,
      bankCode || "",
      isQR
    );

    // Kiểm tra phản hồi từ ZaloPay
    if (response.return_code !== 1) {
      return res.status(500).json({
        success: false,
        message: "ZaloPay request failed",
        error: response.return_message,
      });
    }

    // Kiểm tra xem có order_url hoặc qr_code không
    if (!response.order_url && !response.qr_code) {
      return res.status(500).json({
        success: false,
        message: "ZaloPay response does not contain order_url or qr_code",
      });
    }

    // Save payment information to the database
    const newPayment = new Payment({
      user: userId,
      order: orderId,
      paymentMethod: expectedPaymentMethod,
      paymentStatus: "Pending",
      amount: amount,
      currency: "VND",
      transactionId: response.zp_trans_token || response.appTransId,
      gatewayResponse: response,
      orderInfo: orderInfo,
      returnUrl: returnUrl,
      notifyUrl: notifyUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Set to 15 minutes from now
    });

    const savedPayment = await newPayment.save();

    // const paymentDetails = {
    //   transactionId: savedPayment.transactionId,
    //   amount: savedPayment.amount,
    //   currency: savedPayment.currency,
    //   paymentMethod: savedPayment.paymentMethod,
    //   createdAt: savedPayment.createdAt,
    //   orderId: orderId,
    // };
    // await sendPaymentNotification(user.email, {
    //   ...paymentDetails,
    //   status: "Pending",
    //   message: "Your payment has been created and is awaiting completion.",
    // });

    // console.log(`🔹 Payment creation email sent to ${user.email}`);

    // Schedule payment expiry using Bull queue
    await schedulePaymentExpiry(savedPayment);

    // Update the payments array in the Order
    order.payments.push(savedPayment._id);
    await order.save();

    // Trả về kết quả, bao gồm cả orderUrl và qrCode
    res.status(200).json({
      success: true,
      message: "Payment created successfully",
      payment: savedPayment,
      orderUrl: response.order_url || null, // Luôn trả về orderUrl nếu có
      qrCode: response.qr_code || null, // Luôn trả về qrCode nếu có
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Xử lý notifyUrl (ZaloPay gửi callback về đây để thông báo trạng thái giao dịch)
const handleZaloPayNotify = async (req, res) => {
  try {
    const { data, mac } = req.body;
    if (!data || !mac) {
      return res
        .status(400)
        .json({ return_code: -1, return_message: "Missing data or mac" });
    }

    // Kiểm tra định dạng của data trước khi parse
    if (typeof data !== "string") {
      return res
        .status(400)
        .json({ return_code: -1, return_message: "Data must be a string" });
    }

    // Xác minh chữ ký
    // const isValid = verifyZaloPaySignature(data, mac);
    const isValid = verifyZaloPaySignature(data, mac, zaloPayConfig.key2);

    if (!isValid) {
      return res
        .status(400)
        .json({ return_code: -1, return_message: "Invalid signature" });
    }

    // Parse dữ liệu từ webhook
    const parsedData = JSON.parse(data);
    const { app_trans_id, zp_trans_id, amount, status } = parsedData;

    // Tìm payment trong database
    const payment = await Payment.findOne({
      transactionId: app_trans_id,
    }).populate("user order");
    if (!payment) {
      return res
        .status(404)
        .json({ return_code: -1, return_message: "Payment not found" });
    }

    const newStatus = status === 1 ? "Completed" : "Failed";

    // Tạo bản ghi Transaction mới
    const transaction = new Transaction({
      user: payment.user._id,
      order: payment.order._id,
      paymentId: payment._id,
      amount: parseInt(amount, 10),
      status: newStatus,
      paymentMethod: "ZaloPay",
      transactionDate: new Date(),
      description: `ZaloPay transaction for app_trans_id: ${app_trans_id}`,
      transactionRef: zp_trans_id || app_trans_id,
      transactionId: app_trans_id, // app_trans_id (250424_5998)
      currency: "VND",
      initiator: "system",
    });
    await transaction.save();

    // Cập nhật Payment
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          paymentStatus: newStatus,
          gatewayResponse: parsedData,
          zp_trans_id: zp_trans_id || payment.zp_trans_id,
        },
        $push: {
          transactions: transaction._id,
        },
      }
    );

    // Gửi email xác nhận nếu thanh toán thành công
    if (status === 1) {
      // if (status === 1 && payment.paymentStatus !== "Completed") {
      const paymentDetails = {
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
      };
      await sendPaymentConfirmationEmail(
        payment.user.email,
        paymentDetails,
        true
      );
      await sendPaymentNotification(payment.user.email, payment);
    }

    // Trả về phản hồi cho ZaloPay
    res.status(200).json({ return_code: 1, return_message: "Success" });
  } catch (error) {
    console.error("❌ Error handling ZaloPay notify:", error.message);
    res.status(500).json({ return_code: -1, return_message: error.message });
  }
};

// Xử lý returnUrl (ZaloPay redirect người dùng về đây sau khi thanh toán)
const handleZaloPayReturn = async (req, res) => {
  try {
    const { app_trans_id, status, amount, checksum } = req.query;

    if (!app_trans_id || !status || !amount || !checksum) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameters",
      });
    }

    // Tìm giao dịch trong database
    const payment = await Payment.findOne({
      transactionId: app_trans_id,
    }).populate("user order");
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Xác minh chữ ký từ ZaloPay
    const data = JSON.stringify({
      app_id: zaloPayConfig.appId,
      app_trans_id,
      amount,
      status,
    });
    // const isValidSignature = verifyZaloPaySignature(data, checksum);
    const isValidSignature = verifyZaloPaySignature(
      data,
      checksum,
      zaloPayConfig.key2
    );
    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    // // Cập nhật trạng thái giao dịch (nếu cần)
    // const newStatus = status === "1" ? "Completed" : "Failed";
    // payment.paymentStatus = newStatus;
    // payment.gatewayResponse = {
    //   ...payment.gatewayResponse,
    //   returnResponse: req.query,
    // };
    // await payment.save();
    // Cập nhật trạng thái giao dịch (nếu cần)
    if (payment.paymentStatus === "Pending") {
      const newStatus = status === "1" ? "Completed" : "Failed";
      payment.paymentStatus = newStatus;
      payment.gatewayResponse = {
        ...payment.gatewayResponse,
        returnResponse: req.query,
      };
      await payment.save();

      // Gửi email nếu thanh toán thành công và chưa gửi trước đó
      if (status === "1") {
        const paymentDetails = {
          transactionId: payment.transactionId,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          createdAt: payment.createdAt,
        };
        await sendPaymentConfirmationEmail(
          payment.user.email,
          paymentDetails,
          true
        );
        await sendPaymentNotification(payment.user.email, payment);
      }
    }

    // Redirect người dùng hoặc trả về kết quả
    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Route để gửi lại email thông báo thanh toán (thủ công)
const resendPaymentNotification = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Tìm payment trong database
    const payment = await Payment.findById(paymentId).populate("user");
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }

    // Gửi email thông báo
    await sendPaymentNotification(payment.user.email, payment);

    res.status(200).json({
      success: true,
      message: "Payment notification sent successfully",
    });
  } catch (error) {
    console.error("Error resending payment notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Route để xử lý hoàn tiền (nếu cần)
const refundZaloPayPayment = async (req, res) => {
  try {
    const { paymentId, refundAmount } = req.body;

    // Tìm payment trong database
    const payment = await Payment.findById(paymentId).populate("user");
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }

    // Kiểm tra trạng thái thanh toán
    if (payment.paymentStatus !== "Completed") {
      return res
        .status(400)
        .json({ success: false, error: "Payment is not completed" });
    }

    // Kiểm tra số tiền hoàn
    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        error: "Refund amount exceeds payment amount",
      });
    }

    // Giả lập gọi API hoàn tiền của ZaloPay (thay bằng API thật nếu có)
    const refundResponse = {
      return_code: 1,
      return_message: "Refund successful",
      refund_id: new mongoose.Types.ObjectId().toString(),
    };

    if (refundResponse.return_code !== 1) {
      return res
        .status(400)
        .json({ success: false, error: refundResponse.return_message });
    }

    // Cập nhật trạng thái thanh toán
    payment.paymentStatus = "Refunded";
    payment.refundedAmount = refundAmount;
    payment.refundedAt = new Date();
    await payment.save();

    // Gửi email xác nhận hoàn tiền
    const refundDetails = {
      transactionId: payment.transactionId,
      refundAmount: refundAmount,
      currency: payment.currency,
      refundedAt: payment.refundedAt,
    };
    await sendRefundConfirmationEmail(payment.user.email, refundDetails);

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      refund: {
        transactionId: payment.transactionId,
        refundAmount: refundAmount,
        currency: payment.currency,
        refundedAt: payment.refundedAt,
      },
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const processPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user._id;
  const {
    successUrl = process.env.Success_Url,
    cancelUrl = process.env.Cancel_Url,
  } = req.body;

  const payment = await Payment.findById(paymentId).populate("order");
  if (!payment) {
    return res
      .status(404)
      .json({ success: false, message: "Payment not found" });
  }

  if (payment.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json({ success: false, message: "Unauthorized access to this payment" });
  }

  if (payment.paymentStatus !== "Pending") {
    return res
      .status(400)
      .json({ success: false, message: "Payment is not in a pending state" });
  }

  let paymentUrl = null;
  let transactionId = null;
  let gatewayResponse = null;

  switch (payment.paymentMethod) {
    case "PayPal":
      const paypalResponse = await createPayPalPayment({
        amount: payment.amount,
        currency: payment.currency,
        returnUrl: successUrl,
        cancelUrl: cancelUrl,
      });

      transactionId = paypalResponse.orderID;
      paymentUrl = paypalResponse.approvalUrl;
      gatewayResponse = paypalResponse;

      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();
      break;

    case "VNPay":
      const vnpayResponse = await createVnPayRequest({
        orderId: payment.order._id.toString(),
        amount: payment.amount,
        description: "Thanh toán VNPay",
        successUrl,
      });
      paymentUrl = vnpayResponse.paymentUrl;
      transactionId = vnpayResponse.transactionId;
      gatewayResponse = vnpayResponse;

      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();
      break;

    case "ZaloPay":
      const zalopayResponse = await createZaloPayRequest({
        orderId: payment.order._id.toString(),
        amount: payment.amount,
        description: "Thanh toán ZaloPay",
      });
      paymentUrl = zalopayResponse.paymentUrl;
      transactionId = zalopayResponse.transactionId;
      gatewayResponse = zalopayResponse;

      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();
      break;

    case "Momo":
      const momoResponse = await createMomoRequest({
        orderId: payment.order._id.toString(),
        amount: payment.amount,
        description: "Thanh toán Momo",
        successUrl,
        cancelUrl,
      });
      paymentUrl = momoResponse.paymentUrl;
      transactionId = momoResponse.transactionId;
      gatewayResponse = momoResponse;

      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();
      break;

    case "Stripe":
      const stripeResponse = await createStripePaymentIntent({
        amount: payment.amount,
        currency: payment.currency,
        successUrl,
        cancelUrl,
      });
      paymentUrl = stripeResponse.paymentUrl;
      transactionId = stripeResponse.transactionId;
      gatewayResponse = stripeResponse;

      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();
      break;

    case "Credit Card":
      // Giả định Credit Card được xử lý qua Stripe
      const creditCardResponse = await createStripePaymentIntent({
        amount: payment.amount,
        currency: payment.currency,
        successUrl,
        cancelUrl,
      });
      paymentUrl = creditCardResponse.paymentUrl;
      transactionId = creditCardResponse.transactionId;
      gatewayResponse = creditCardResponse;

      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();
      break;

      // case "Bank Transfer":
      //   // Thanh toán qua chuyển khoản ngân hàng
      //   // Trả về thông tin tài khoản ngân hàng để người dùng chuyển khoản
      //   const bankDetails = {
      //     bankName: "TechBank",
      //     accountNumber: "1234567890",
      //     accountHolder: "Your Company Name",
      //     amount: payment.amount,
      //     orderId: payment.order._id.toString(),
      //   };
      //   transactionId = `BANK_TX_${payment.order._id.toString()}`;
      //   gatewayResponse = { bankDetails };

      // payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();

      return res.status(200).json({
        success: true,
        message:
          "Bank Transfer payment initiated. Please transfer the amount to the provided account.",
        bankDetails,
        transactionId,
      });

    case "VietQR":
      // Tạo mã QR để thanh toán qua VietQR
      const vietQRResponse = await vietQRService.createVietQRPayment({
        orderId: payment.order._id.toString(),
        amount: payment.amount,
        description: "Thanh toán VietQR",
      });
      paymentUrl = vietQRResponse.paymentUrl;
      transactionId = vietQRResponse.transactionId;
      gatewayResponse = vietQRResponse;

      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.save();

      return res.status(200).json({
        success: true,
        paymentUrl,
        qrCode: vietQRResponse.qrCode,
        transactionId,
      });

    case "Cash on Delivery":
      payment.paymentStatus = "Completed";
      await payment.save();
      return res.status(200).json({
        success: true,
        message: "COD payment processed successfully",
      });

    case "In-Store":
      payment.paymentStatus = "Completed";
      await payment.save();
      return res.status(200).json({
        success: true,
        message: "In-Store payment processed successfully",
      });

    default:
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ",
      });
  }

  res.status(200).json({
    success: true,
    paymentUrl,
    transactionId,
  });
});

const createVnPayOrder = asyncHandler(async (req, res) => {
  try {
    const { orderId, amount, orderInfo, returnUrl } = req.body;
    let clientIp = req.ip || req.connection.remoteAddress || "127.0.0.1";

    if (clientIp.startsWith("::ffff:")) {
      clientIp = clientIp.replace("::ffff:", "");
    }

    if (!orderId || !amount || !orderInfo) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const { paymentUrl, signData, vnp_SecureHash, params, transactionInfo } =
      await createVnPayWalletRequest(
        orderId,
        amount,
        orderInfo,
        clientIp,
        returnUrl
      );

    const isValid = verifySignature(params, vnpayConfig.secretKey);

    return res.status(200).json({
      success: true,
      message: "Payment URL created successfully",
      paymentUrl,
      verified: isValid,
      signData,
      checksum: vnp_SecureHash,
      transactionInfo,
    });
  } catch (error) {
    console.error("Error creating VNPay order:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const vnpayIpn = asyncHandler(async (req, res) => {
  try {
    const params = req.query;
    if (!params || Object.keys(params).length === 0) {
      return res.status(200).json({
        RspCode: "97",
        Message: "Invalid request: No query parameters",
      });
    }

    const isValid = verifySignature(params, vnpayConfig.secretKey);
    if (!isValid) {
      return res.status(200).json({
        RspCode: "97",
        Message: "Invalid signature",
      });
    }

    const vnp_ResponseCode = params.vnp_ResponseCode;
    const vnp_TxnRef = params.vnp_TxnRef;
    const orderId = params.vnp_OrderId || "";

    // Tìm đơn hàng để lấy userId
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(200).json({
        RspCode: "01",
        Message: "Order not found",
      });
    }

    if (vnp_ResponseCode === "00") {
      await updateOrderPaymentStatus(
        orderId,
        "PAID",
        vnp_TxnRef,
        params.vnp_Amount / 100,
        "VNPay",
        params,
        order.user
      );
    } else {
      await updateOrderPaymentStatus(
        orderId,
        "FAILED",
        vnp_TxnRef,
        params.vnp_Amount / 100,
        "VNPay",
        params,
        order.user
      );
    }

    return res.status(200).json({
      RspCode: "00",
      Message: "Confirm success",
    });
  } catch (error) {
    console.error("Error processing VNPay IPN:", error.message);
    return res.status(200).json({
      RspCode: "99",
      Message: "Unknown error",
    });
  }
});

const vnpayReturn = asyncHandler(async (req, res) => {
  try {
    const params = req.query;
    if (!params || Object.keys(params).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No query parameters received from VNPay",
      });
    }

    const isValid = verifySignature(params, vnpayConfig.secretKey);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    const vnp_ResponseCode = params.vnp_ResponseCode;
    const vnp_TxnRef = params.vnp_TxnRef;
    const orderId = params.vnp_OrderId || "";

    // Tìm đơn hàng để lấy userId
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(400).json({
        success: false,
        message: "Order not found",
      });
    }

    if (vnp_ResponseCode === "00") {
      await updateOrderPaymentStatus(
        orderId,
        "PAID",
        vnp_TxnRef,
        params.vnp_Amount / 100,
        "VNPay",
        params,
        order.user
      );
      return res.redirect(
        `http://localhost:8080/payment/success?orderId=${orderId}&amount=${
          params.vnp_Amount / 100
        }`
      );
    } else {
      await updateOrderPaymentStatus(
        orderId,
        "FAILED",
        vnp_TxnRef,
        params.vnp_Amount / 100,
        "VNPay",
        params,
        order.user
      );
      const status = await queryTransaction(
        orderId,
        vnp_TxnRef,
        params.vnp_CreateDate
      );
      console.log("🔹 Transaction Status (querydr):", status);
      return res.redirect("http://localhost:8080/payment/failed");
    }
  } catch (error) {
    console.error("Error processing VNPay Return:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

const checkTransactionStatus = asyncHandler(async (req, res) => {
  try {
    const { orderId, txnRef, createDate, userEmail } = req.body;
    if (!orderId || !txnRef || !createDate) {
      return res.status(400).json({
        success: false,
        message: "Missing orderId, txnRef, or createDate",
      });
    }

    // Tìm đơn hàng để lấy userId
    // const order = await Order.findOne({ orderId }); // Sửa từ { order: orderId } thành { orderId }
    const order = await Order.findOne({ orderId }); // Sửa từ { order: orderId } thành { orderId }
    if (!order) {
      return res
        .status(400)
        .json({ success: false, message: "Order not found" });
    }

    const status = await queryTransaction(orderId, txnRef, createDate);

    if (
      status.vnp_ResponseCode === "00" &&
      status.vnp_TransactionStatus === "00"
    ) {
      await updateOrderPaymentStatus(
        orderId,
        "PAID",
        txnRef,
        status.vnp_Amount / 100,
        "VNPay",
        status,
        order.user
      );
      if (userEmail) {
        await sendPaymentConfirmationEmail(userEmail, {
          amount: status.vnp_Amount / 100,
          currency: "VND",
          transactionId: txnRef,
          paymentMethod: "VNPay",
          createdAt: new Date(),
        });
      }
    } else {
      await updateOrderPaymentStatus(
        orderId,
        "FAILED",
        txnRef,
        status.vnp_Amount / 100,
        "VNPay",
        status,
        order.user
      );
    }

    return res.status(200).json({
      success: true,
      message: "Transaction status retrieved",
      status,
    });
  } catch (error) {
    console.error("Error checking transaction status:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const confirmPayment = async function (req, res) {
  let payment, transaction, order, user;
  const stockUpdates = [];
  let userNotificationId,
    adminNotificationIds = [];
  let adminRole;
  try {
    const { paymentId } = req.params;
    const userId = req.user?._id;

    // Tìm payment
    payment = await Payment.findById(paymentId).populate("order");
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Kiểm tra quyền truy cập
    if (
      userId &&
      payment.user.toString() !== userId.toString() &&
      req.user.role.roleName !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this payment",
      });
    }

    // Kiểm tra trạng thái hiện tại
    if (payment.paymentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Payment is not in Pending status",
      });
    }

    // Kiểm tra order trước khi tạo transaction
    order = payment.order;
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this payment",
      });
    }

    if (!order.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Order does not have a payment method defined",
      });
    }

    if (payment.paymentMethod !== order.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method does not match the order payment method",
      });
    }

    // Tìm hoặc tạo transaction
    transaction = await Transaction.findOne({
      paymentId: payment._id,
      status: "Pending",
    });

    if (!transaction) {
      const existingTransaction = await Transaction.findOne({
        paymentId: payment._id,
      });

      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: `Transaction is not in Pending status. Current status: ${existingTransaction.status}`,
        });
      }

      try {
        transaction = await Transaction.create({
          paymentId: payment._id,
          status: "Pending",
          amount: payment.amount,
          transactionId: payment.transactionId || `TX_${Date.now()}`,
          paymentMethod: payment.paymentMethod,
          order: order._id,
          user: payment.user,
          currency: "VND",
        });
      } catch (createError) {
        console.error("Error creating transaction:", createError);
        return res.status(500).json({
          success: false,
          message: "Failed to create transaction",
          error: createError.message,
        });
      }

      try {
        await Payment.updateOne(
          { _id: payment._id },
          { $push: { transactions: transaction._id } }
        );
      } catch (updateError) {
        console.error("Error updating Payment:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update Payment with new transaction",
          error: updateError.message,
        });
      }
    }

    // Kiểm tra tồn kho
    for (const item of order.items) {
      const phone = await Phone.findById(item.phone);
      if (!phone) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.phone}`,
        });
      }
      if (phone.stock < item.quantity) {
        const template = notificationTemplates.paymentFailedOutOfStock;
        const userNotification = {
          user: payment.user,
          title: template.title,
          message: template.message({
            productName: phone.name,
            orderId: order._id,
          }),
          type: template.type,
          priority: template.priority,
          scheduledAt: new Date(),
          meta: {
            actionUrl: template.actionUrl({ orderId: order._id }),
            data: { orderId: order._id, paymentId: payment._id },
          },
        };

        const userNotificationResponse = await createNotification(
          userNotification
        );
        if (
          !userNotificationResponse.success ||
          !userNotificationResponse.data?._id
        ) {
          throw new Error(
            userNotificationResponse.error ||
              "Failed to create user notification for out of stock"
          );
        }
        userNotificationId = userNotificationResponse.data._id;

        const updateResult = await User.updateOne(
          { _id: payment.user },
          { $push: { notifications: userNotificationId } }
        );
        if (updateResult.modifiedCount === 0) {
          throw new Error(
            "Failed to update user notifications for out of stock"
          );
        }

        order.orderStatus = "Cancelled";
        await order.save();

        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${phone.name}`,
        });
      }
      stockUpdates.push({ phone, quantity: item.quantity });
    }

    // Cập nhật trạng thái
    payment.paymentStatus = "Completed";
    transaction.status = "Completed";
    transaction.completedAt = new Date();
    order.orderStatus = "processing";

    // Giảm tồn kho
    for (const { phone, quantity } of stockUpdates) {
      phone.stock -= quantity;
      await phone.save();
    }

    // Cộng điểm tích lũy
    if (order.loyaltyPoints && order.useLoyaltyPoints === false) {
      user = await User.findById(payment.user);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      user.loyaltyPoints = (user.loyaltyPoints || 0) + order.loyaltyPoints;
      await user.save();
    }

    // Lưu các thay đổi
    await payment.save();
    await transaction.save();
    await order.save();

    // Kiểm tra và khởi tạo mảng transaction nếu cần
    user = await User.findById(payment.user);
    if (user.transaction === null || user.transaction === undefined) {
      await User.updateOne(
        { _id: payment.user },
        { $set: { transaction: [] } }
      );
    }

    // Cập nhật mảng transaction của user
    await User.updateOne(
      { _id: payment.user },
      { $push: { transaction: transaction._id } }
    );

    // Tạo thông báo cho người dùng
    const userTemplate = notificationTemplates.paymentSuccess;
    const userNotification = {
      user: payment.user,
      title: userTemplate.title,
      message: userTemplate.message({
        amount: payment.amount,
        orderId: order._id,
      }),
      type: userTemplate.type,
      priority: userTemplate.priority,
      scheduledAt: new Date(),
      meta: {
        actionUrl: userTemplate.actionUrl({ orderId: order._id }),
        data: {
          orderId: order._id,
          paymentId: payment._id,
          transactionId: transaction._id,
        },
      },
    };

    const userNotificationResponse = await createNotification(userNotification);
    if (
      !userNotificationResponse.success ||
      !userNotificationResponse.data?._id
    ) {
      throw new Error(
        userNotificationResponse.error ||
          "Failed to create user notification for payment success"
      );
    }
    userNotificationId = userNotificationResponse.data._id;

    // Kiểm tra và khởi tạo mảng notifications nếu cần
    if (user.notifications === null || user.notifications === undefined) {
      await User.updateOne(
        { _id: payment.user },
        { $set: { notifications: [] } }
      );
    }

    const updateResult = await User.updateOne(
      { _id: payment.user },
      { $push: { notifications: userNotificationId } }
    );
    if (updateResult.modifiedCount === 0) {
      throw new Error(
        "Failed to update user notifications for payment success"
      );
    }

    // Tạo thông báo cho admin
    const Role = mongoose.model("Role");
    adminRole = await Role.findOne({ roleName: "admin" });
    if (!adminRole) {
      throw new Error("Admin role not found");
    }

    const admins = await User.find({ role: adminRole._id });
    if (admins.length > 0) {
      const adminTemplate = notificationTemplates.newOrderForAdmin;
      const adminNotification = {
        userIds: admins.map((admin) => admin._id),
        title: adminTemplate.title,
        message: adminTemplate.message({
          orderId: order._id,
          amount: payment.amount,
        }),
        type: adminTemplate.type,
        priority: adminTemplate.priority,
        scheduledAt: new Date(),
        meta: {
          actionUrl: adminTemplate.actionUrl({ orderId: order._id }),
          data: {
            orderId: order._id,
            paymentId: payment._id,
            transactionId: transaction._id,
          },
        },
      };

      const adminNotificationResponse = await createBulkNotifications(
        adminNotification
      );
      if (
        !adminNotificationResponse.success ||
        !adminNotificationResponse.data
      ) {
        throw new Error(
          adminNotificationResponse.error ||
            "Failed to create admin notifications"
        );
      }
      adminNotificationIds =
        adminNotificationResponse.data.map((notif) => notif._id) || [];

      for (let i = 0; i < admins.length; i++) {
        const adminId = admins[i]._id;
        const notificationId = adminNotificationIds[i];
        const adminUser = await User.findById(adminId);
        if (
          adminUser.notifications === null ||
          adminUser.notifications === undefined
        ) {
          await User.updateOne(
            { _id: adminId },
            { $set: { notifications: [] } }
          );
        }
        await User.updateOne(
          { _id: adminId },
          { $push: { notifications: notificationId } }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      payment,
    });
  } catch (error) {
    if (payment && payment.paymentStatus === "Completed") {
      payment.paymentStatus = "Pending";
      await payment.save();
    }
    if (transaction && transaction.status === "Completed") {
      transaction.status = "Pending";
      transaction.completedAt = null;
      await transaction.save();
    }
    if (order && order.orderStatus === "processing") {
      order.orderStatus = "Pending";
      await order.save();
    }
    for (const { phone, quantity } of stockUpdates) {
      if (phone.stock !== undefined) {
        phone.stock += quantity;
        await phone.save();
      }
    }
    if (user && user.loyaltyPoints !== undefined) {
      user.loyaltyPoints -= order.loyaltyPoints;
      await user.save();
    }
    if (userNotificationId) {
      await mongoose
        .model("Notification")
        .findByIdAndDelete(userNotificationId);
      await User.updateOne(
        { _id: payment.user },
        { $pull: { notifications: userNotificationId } }
      );
    }
    if (adminNotificationIds.length > 0) {
      await mongoose
        .model("Notification")
        .deleteMany({ _id: { $in: adminNotificationIds } });
      const admins = await User.find({ role: adminRole?._id });
      for (const admin of admins) {
        await User.updateOne(
          { _id: admin._id },
          { $pull: { notifications: { $in: adminNotificationIds } } }
        );
      }
    }

    console.error("Error confirming payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm payment",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  refundPayment,
  createPayPalOrder,
  capturePayPalOrder,
  getPaymentReport,
  createMomoOrder,
  returnMomoOrder,
  // checkMomoTransaction,
  // initiateMomoPayment,
  handleMomoWebhook,
  handlePayPalWebhook,
  processPayment,
  createZaloPayPayment,
  handleZaloPayNotify,
  resendPaymentNotification,
  refundZaloPayPayment,
  createVnPayOrder,
  vnpayReturn,
  vnpayIpn,
  checkTransactionStatus,
  confirmPayment,
  handleZaloPayReturn,
};
