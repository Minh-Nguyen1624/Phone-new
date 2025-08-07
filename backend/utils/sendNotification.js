const { sendEmail } = require("./email");

/**
 * Gửi email thông báo
 * @param {string} email - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} message - Nội dung email
 */
const sendNotification = async (email, subject, message) => {
  await sendEmail(email, subject, message, `<p>${message}</p>`);
  console.log(`Notification sent to ${email}`);
};

module.exports = { sendNotification };
