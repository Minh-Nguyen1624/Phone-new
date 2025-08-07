const { sendEmail } = require("./email");

/**
 * Gửi email xác nhận thanh toán
 * @param {string} recipientEmail - Email của khách hàng
 * @param {string} transactionId - Mã giao dịch
 * @param {string} status - Trạng thái thanh toán
 */

const sendPaymentEmail = async (recipientEmail, transactionId, status) => {
  const subject = `Payment ${status === "success" ? "Success" : "Failed"}`;
  const message = `Your payment with transaction ID ${transactionId} has been ${status}.`;
  await sendEmail(recipientEmail, subject, message);
  // console.log(`Payment email sent to ${recipientEmail}`);
};

module.exports = {
  sendPaymentEmail,
};
