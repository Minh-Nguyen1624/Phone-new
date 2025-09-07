const express = require("express");
const { body } = require("express-validator");
const moment = require("moment");
const crypto = require("crypto");
const { sendPaymentNotification } = require("../utils/email");
const { verifyZaloPaySignature } = require("../services/zalopayService");
const Payment = require("../model/paymentModel");
const Transaction = require("../model/transactionModel");
const User = require("../model/userModel");
const zaloPayConfig = require("../config/zalopayConfig");
const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");
const {
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
  // initiateMomoPayment,
  // checkMomoTransaction,
  handleMomoWebhook,
  processPayment,
  createZaloPayPayment,
  handleZaloPayNotify,
  resendPaymentNotification,
  refundZaloPayPayment,
  createVnPayOrder,
  // createPaymentUrl,
  vnpayIpn,
  vnpayReturn,
  checkTransactionStatus,
  confirmPayment,
  handleZaloPayReturn,
  handlePayPalWebhook,
} = require("../controller/paymentController");

// const app = express();
const router = express.Router();

// router.get("/", getAllPayments);
// Route để lấy tất cả payments (chỉ admin)
router.get("/", protect, authMiddleware, adminMiddleware, getAllPayments);

// router.post("/add", createPayment);
// Tạo payment (chỉ admin)
router.post(
  "/add",
  protect,
  adminMiddleware,
  [
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("Amount must be greater than 0"),
    body("orderId").notEmpty().withMessage("Order ID is required"),
    body("paymentMethod").notEmpty().withMessage("Payment method is required"),
  ],
  createPayment
);

// router.get("/report", getPaymentReport);
// Route để lấy báo cáo thanh toán (chỉ admin)
// router.get("/report/:id?", protect, admin, getPaymentReport);
router.get("/report", protect, adminMiddleware, getPaymentReport);

// router.get("/vnpay_return", vnpayReturn);

// Lấy chi tiết payment theo ID (yêu cầu đăng nhập)
// router.get("/:id", getPaymentById);
router.get("/:id", protect, getPaymentById);

// router.put("/update/:id", updatePayment);
// Cập nhật payment (chỉ admin)
router.put(
  "/update/:id",
  protect,
  adminMiddleware,
  [
    body("paymentStatus")
      .optional()
      .isIn(["Pending", "Completed", "Failed", "Refunded"])
      .withMessage("Invalid payment status"),
  ],
  updatePayment
);

// Xóa payment (chỉ admin)
// router.delete("/delete/:id", deletePayment);
router.delete("/delete/:id", protect, adminMiddleware, deletePayment);

// Hoàn tiền payment (chỉ admin)
router.post(
  "/refund/:id",
  protect,
  adminMiddleware,
  [
    body("refundAmount")
      .isFloat({ gt: 0 })
      .withMessage("Refund amount must be greater than 0"),
    body("refundAt")
      .optional()
      .isISO8601()
      .withMessage("Refund date must be a valid ISO8601 date"),
  ],
  refundPayment
);

// router.post("/paypal/createOrder", createPayPalOrder);
// Route để tạo đơn hàng PayPal (yêu cầu đăng nhập)
// router.post("/paypal/createOrder", protect, createPayPalOrder);
router.post("/paypal/createOrder", protect, createPayPalOrder);
// router.post("/paypal/captureOrder", capturePayPalOrder);

router.get("/paypal/captureOrder", capturePayPalOrder);
// router.post("/paypal/captureOrder", protect, capturePayPalOrder);
// router.get("/report", getPaymentReport);

// router.post("/momo/createMomoOrder", createMomoOrder);
// Route để tạo đơn hàng Momo hoặc VietQR (yêu cầu đăng nhập)
router.post("/momo/createMomoOrder", protect, createMomoOrder);

router.get("/momo/returnMomoOrder", returnMomoOrder);

router.post("/momo/momoWebhook", handleMomoWebhook);

// router.post("/zalopay/createZaloPayPayment", createZaloPayPayment);
// Route để tạo thanh toán ZaloPay (yêu cầu đăng nhập)
router.post("/zalopay/createZaloPayPayment", protect, createZaloPayPayment);

router.post("/zalopay/handleZaloPayNotify", handleZaloPayNotify);

router.get("/zalopay/handZaloPayReturn", handleZaloPayReturn);

// router.post(
//   "/zalopay/resendPaymentNotification/:paymentId",
//   resendPaymentNotification
// );
// Route để gửi lại email thông báo thanh toán (yêu cầu đăng nhập)
router.post(
  "/zalopay/resendPaymentNotification/:paymentId",
  protect,
  resendPaymentNotification
);

// router.post("/zalopay/refundZaloPayPayment", refundZaloPayPayment);
// Route để hoàn tiền ZaloPay (yêu cầu đăng nhập)
// router.post("/zalopay/refundZaloPayPayment", protect, refundZaloPayPayment);
router.post(
  "/zalopay/refundZaloPayPayment",
  protect,
  adminMiddleware,
  refundZaloPayPayment
);
// Endpoint xử lý callback từ ZaloPay (notifyUrl)

router.post("/api/payment/order/ZaloPay_notify", async (req, res) => {
  try {
    console.log("🔹 ZaloPay Notify - Received Callback:", req.body);
    console.log(
      "🔹 ZaloPay Notify - Full Request Body:",
      JSON.stringify(req.body, null, 2)
    );
    console.log("🔹 Request Headers:", JSON.stringify(req.headers, null, 2));
    console.log("🔹 Request Method:", req.method);

    const { data, mac } = req.body;
    if (!data || !mac) {
      console.log("❌ Error: Missing data or mac in ZaloPay callback");
      return res
        .status(400)
        .json({ return_code: -1, return_message: "Missing data or mac" });
    }

    const isValid = verifyZaloPaySignature(data, mac, zaloPayConfig.key2);
    console.log("🔹 Signature Verification:", isValid);

    if (!isValid) {
      console.log("❌ Error: Invalid signature in ZaloPay callback");
      return res
        .status(400)
        .json({ return_code: -1, return_message: "Invalid signature" });
    }

    const parsedData = JSON.parse(data);
    const { app_trans_id, zp_trans_id, amount, status } = parsedData;
    console.log("🔹 Parsed app_trans_id from callback:", app_trans_id);

    const allPayments = await Payment.find({});
    console.log("🔹 All payments in DB:", allPayments);

    const payment = await Payment.findOne({
      transactionId: app_trans_id,
    }).populate("user order");
    console.log("🔹 Payment found in DB:", payment);
    if (!payment) {
      console.log(
        "❌ Error: Payment not found for app_trans_id:",
        app_trans_id
      );
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
      currency: "VND",
      initiator: "system",
    });
    await transaction.save();
    console.log("🔹 Saved transaction to DB:", transaction);

    // Cập nhật Payment với transactionId và các thông tin khác
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          paymentStatus: newStatus,
          gatewayResponse: parsedData,
          zp_trans_id: zp_trans_id || payment.zp_trans_id,
        },
        $push: {
          transactions: transaction._id, // Lưu ObjectId của Transaction
        },
      }
    );

    console.log(
      `✅ Updated payment status for app_trans_id ${app_trans_id}: ${newStatus}`
    );

    res.status(200).json({ return_code: 1, return_message: "Success" });
  } catch (error) {
    console.error("❌ Error handling ZaloPay notify:", error.message);
    res.status(500).json({ return_code: -1, return_message: error.message });
  }
});

// router.post("/vnpay/createVnPayOrder", createVnPayOrder);
router.post("/vnpay/createVnPayOrder", createVnPayOrder);
// router.post('/create_vnpay_order', async (req, res) => {
//   try {
//       const result = await paymentController.createVnPayOrder(req);
//       res.status(200).json(result);
//   } catch (error) {
//       res.status(error.status || 500).json({ success: false, error: error.message });
//   }
// });
// router.get("/vnpay/vnpay-return", vnpayReturn);
router.get("/order/vnpay_return", vnpayReturn);
router.get("/order/vnpay-ipn", vnpayIpn);
router.post("/vnpay/checkTransactionStatus", checkTransactionStatus);
// Route để xử lý thanh toán
router.post("/payment/:paymentId/process", protect, processPayment);
// router.post("/payment/:paymentId/process", processPayment);

router.post("/payment/:paymentId/confirm", confirmPayment);

router.post(
  "/paypal/webhook",
  express.json({ type: "*/*" }),
  handlePayPalWebhook
);

module.exports = router;
