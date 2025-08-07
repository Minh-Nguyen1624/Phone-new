const Queue = require("bull");
const mongoose = require("mongoose");
const Payment = mongoose.model("Payment");
const Order = mongoose.model("Order");
const Phone = mongoose.model("Phone");
const User = mongoose.model("User");
const { sendEmail } = require("../utils/email");

// Khởi tạo queue (cần Redis để chạy bull)
const paymentExpiryQueue = new Queue("payment-expiry", {
  redis: { host: "127.0.0.1", port: 6379 }, // Cấu hình Redis
});

// Mapping thời gian hết hạn cho từng cổng thanh toán (tính bằng phút)
const expiryDurationMap = {
  ZaloPay: 15, // ZaloPay hết hạn sau 15 phút
  VNPay: 15, // VNPay hết hạn sau 15 phút
  Stripe: 30, // Stripe hết hạn sau 30 phút
  PayPal: 30, // PayPal hết hạn sau 30 phút
  Momo: 15, // MoMo hết hạn sau 15 phút (theo tài liệu MoMo sandbox)
  default: 30, // Mặc định 30 phút cho các phương thức khác
};

// Worker để xử lý job hết hạn
paymentExpiryQueue.process(async (job) => {
  const { paymentId } = job.data;
  const payment = await Payment.findById(paymentId).populate("user order");
  if (payment && payment.paymentStatus === "Pending") {
    // Cập nhật trạng thái thanh toán thành "Expired"
    payment.paymentStatus = "Expired";
    await payment.save();

    // Đồng bộ với Order
    const order = await Order.findById(payment.order).populate("items.phone");
    if (order && order.paymentStatus !== "Expired") {
      order.paymentStatus = "Expired";
      if (order.orderStatus !== "Cancelled") {
        order.orderStatus = "Cancelled";
        // Khôi phục tồn kho
        for (const item of order.items) {
          const product = item.phone;
          if (product) {
            product.stock += item.quantity;
            await product.save();
            // console.log(
            //   `Restored stock for product ${product._id}: +${item.quantity}`
            // );
          }
        }
      }
      await order.save();
    }

    // Gửi email thông báo hết hạn
    const user = payment.user;
    if (user && user.email) {
      await sendEmail(
        user.email,
        "Thanh toán của bạn đã hết hạn",
        `Thanh toán của bạn (${payment.transactionId}) đã hết hạn. Vui lòng tạo lại thanh toán.`,
        `<h2>Thanh toán hết hạn</h2>
         <p>Thanh toán của bạn (${payment.transactionId}) đã hết hạn.</p>
         <p>Vui lòng tạo lại thanh toán hoặc liên hệ hỗ trợ.</p>`
      );
      // console.log(`Expiry notification email sent to ${user.email}`);
    }

    // console.log(`Payment expired: ${paymentId}`);
  }
});

// Hàm để thêm payment vào queue khi tạo
const schedulePaymentExpiry = async (payment) => {
  if (payment.paymentStatus === "Pending") {
    const expiryDuration =
      expiryDurationMap[payment.paymentMethod] || expiryDurationMap.default;
    const expiryTime = expiryDuration * 60 * 1000; // Chuyển phút thành milliseconds
    await paymentExpiryQueue.add(
      { paymentId: payment._id },
      { delay: expiryTime }
    );
    // console.log(
    //   `Scheduled expiry for payment ${payment._id} after ${expiryDuration} minutes`
    // );
  }
};

module.exports = { schedulePaymentExpiry };
