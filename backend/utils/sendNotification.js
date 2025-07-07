// // Hàm gửi email thông báo
// const sendNotification = async (email, subject, message) => {
//   try {
//     if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
//       console.warn("Missing email credentials");
//       return;
//     }

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         // user: process.env.EMAIL_USER || "your-email@gmail.com",
//         // pass: process.env.EMAIL_PASS || "your-email-password",
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       // from: '"Your App" <your-email@gmail.com>',
//       from: `"Your App" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: subject,
//       text: message,
//       html: `<p>${message}</p>`,
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`Notification sent to ${email}`);
//   } catch (error) {
//     console.error("Failed to send email:", error.message);
//     throw new Error("Unable to send email notification.");
//   }
// };

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
