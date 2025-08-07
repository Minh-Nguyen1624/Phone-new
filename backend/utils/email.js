require("dotenv").config();
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const winston = require("winston");
const validator = require("validator");

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

// Thiết lập logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // new winston.transports.Console(),
    // new winston.transports.File({
    //   filename: path.join(__dirname, "../logs/email.log"),
    //   level: "info",
    // }),
    new winston.transports.File({ filename: "logs/email.log" }),
    new winston.transports.Console(),
  ],
});

// Khởi tạo transporter một lần duy nhất
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
});

// Hàm tạo file PDF (nếu cần đính kèm)
const generatePaymentReceiptPDF = (paymentDetails, userEmail) => {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(
      __dirname,
      `../receipts/receipt-${paymentDetails.transactionId}.pdf`
    );
    const receiptsDir = path.join(__dirname, "../receipts");
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir);
    }

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(20).text("Biên Lai Thanh Toán", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Xin chào ${userEmail},`, { align: "left" });
    doc.moveDown();
    doc.text(
      "Cảm ơn bạn đã thanh toán qua ZaloPay. Dưới đây là thông tin chi tiết:"
    );
    doc.moveDown();

    doc.fontSize(12).text(`Mã giao dịch: ${paymentDetails.transactionId}`);
    doc.text(`Số tiền: ${paymentDetails.amount} ${paymentDetails.currency}`);
    doc.text(
      `Thời gian: ${new Date(paymentDetails.createdAt).toLocaleString()}`
    );
    doc.text(`Phương thức thanh toán: ${paymentDetails.paymentMethod}`);
    doc.moveDown();

    doc.text("Trân trọng,", { align: "left" });
    doc.text("Đội ngũ hỗ trợ", { align: "left" });

    doc.end();

    stream.on("finish", () => {
      resolve(pdfPath);
    });
    stream.on("error", (error) => {
      reject(error);
    });
  });
};

/**
 * Hàm gửi email chung
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} text - Nội dung email dạng text
 * @param {string} [html] - Nội dung email dạng HTML (tùy chọn)
 * @param {Object} [attachment] - File đính kèm (tùy chọn)
 */
const sendEmail = async (to, subject, text, html = null, attachment = null) => {
  try {
    // Kiểm tra email hợp lệ
    if (
      !to ||
      (Array.isArray(to)
        ? to.some((email) => !validator.isEmail(email))
        : !validator.isEmail(to))
    ) {
      throw new Error("Invalid email address");
    }

    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
      ...(html && { html }),
      ...(attachment && {
        attachments: [
          {
            filename: attachment.filename,
            path: attachment.path,
          },
        ],
      }),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}: ${info.response}`);
    return info;
  } catch (error) {
    logger.error(`Error sending email to ${to}: ${error.message}`);
    if (error.code === "EAUTH") {
      throw new Error(
        "Email authentication failed. Check EMAIL_USER and EMAIL_PASS."
      );
    }
    if (error.code === "ENOTFOUND") {
      throw new Error("Invalid recipient email domain (DNS error).");
    }
    throw new Error(`Unable to send email: ${error.message}`);
  }
};

/**
 * Gửi email xác nhận thanh toán
 * @param {string} userEmail - Email của khách hàng
 * @param {Object} paymentDetails - Chi tiết thanh toán
 * @param {boolean} attachPDF - Có đính kèm file PDF không
 */
const sendPaymentConfirmationEmail = async (
  userEmail,
  paymentDetails,
  attachPDF = false
) => {
  // Kiểm tra dữ liệu đầu vào
  if (
    !paymentDetails ||
    !paymentDetails.transactionId ||
    !paymentDetails.amount ||
    !paymentDetails.currency ||
    !paymentDetails.paymentMethod
  ) {
    throw new Error("Invalid payment details");
  }

  const subject = "Xác nhận thanh toán";
  const text = `Thanh toán của bạn (${paymentDetails.amount} ${paymentDetails.currency}) đã được xử lý thành công!\nMã giao dịch: ${paymentDetails.transactionId}\nPhương thức thanh toán: ${paymentDetails.paymentMethod}`;

  const html = `
    <h2>Xác nhận thanh toán</h2>
    <p>Thanh toán của bạn đã được xử lý thành công!</p>
    <ul>
      <li><strong>Số tiền:</strong> ${paymentDetails.amount} ${
    paymentDetails.currency
  }</li>
      <li><strong>Mã giao dịch:</strong> ${paymentDetails.transactionId}</li>
      <li><strong>Phương thức thanh toán:</strong> ${
        paymentDetails.paymentMethod
      }</li>
      <li><strong>Thời gian:</strong> ${new Date(
        paymentDetails.createdAt
      ).toLocaleString()}</li>
    </ul>
    ${
      attachPDF
        ? "<p>Vui lòng xem file PDF đính kèm để biết thêm chi tiết.</p>"
        : ""
    }
    <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
    <p>Trân trọng,<br/>Đội ngũ hỗ trợ</p>
  `;
  let attachment = null;
  if (attachPDF) {
    const pdfPath = await generatePaymentReceiptPDF(paymentDetails, userEmail);
    attachment = {
      filename: `receipt-${paymentDetails.transactionId}.pdf`,
      path: pdfPath,
    };
  }
  await sendEmail(userEmail, subject, text, html, attachment);

  // Xóa file PDF nếu có
  if (attachment) {
    fs.unlinkSync(attachment.path);
  }
};

/**
 * Gửi email xác nhận hoàn tiền
 * @param {string} userEmail - Email của khách hàng
 * @param {Object} refundDetails - Chi tiết hoàn tiền
 */
const sendRefundConfirmationEmail = async (userEmail, refundDetails) => {
  if (!userEmail) {
    throw new Error("User email is required");
  }
  if (
    !refundDetails ||
    !refundDetails.transactionId ||
    !refundDetails.refundAmount ||
    !refundDetails.currency
  ) {
    throw new Error("Invalid refund details");
  }

  const statusMap = {
    Refunded: "Refunded",
    Pending: "Pending",
    Success: "Completed",
    Failed: "Failed",
  };

  const paymentStatus =
    statusMap[refundDetails.paymentStatus] ||
    refundDetails.paymentStatus ||
    "Refunded";

  const subject = `Refund Confirmation - Transaction #${refundDetails.transactionId}`;
  const text = `Dear Customer,\n\nYour refund of ${
    refundDetails.refundAmount
  } ${
    refundDetails.currency
  } has been processed successfully.\n\nDetails:\n- Refund Amount: ${
    refundDetails.refundAmount
  } ${refundDetails.currency}\n- Transaction ID: ${
    refundDetails.transactionId
  }\n- Refund Date: ${new Date(
    refundDetails.refundedAt || Date.now()
  ).toLocaleString()}\n- Status: ${paymentStatus}\n\nThank you for using our service!`;
  const html = `
    <h2>Refund Confirmation - Transaction #${refundDetails.transactionId}</h2>
    <p>Dear Customer,</p>
    <p>Your refund of ${refundDetails.refundAmount} ${
    refundDetails.currency
  } has been processed successfully.</p>
    <p><strong>Details:</strong></p>
    <ul>
      <li><strong>Refund Amount:</strong> ${refundDetails.refundAmount} ${
    refundDetails.currency
  }</li>
      <li><strong>Transaction ID:</strong> ${refundDetails.transactionId}</li>
      <li><strong>Refund Date:</strong> ${new Date(
        refundDetails.refundedAt || Date.now()
      ).toLocaleString()}</li>
      <li><strong>Status:</strong> ${paymentStatus}</li>
    </ul>
    <p>Thank you for using our service!</p>
    <p>Best regards,<br/>Support Team</p>
  `;

  await sendEmail(userEmail, subject, text, html);
};

/**
 * Gửi email thông báo thanh toán
 * @param {string} userEmail - Email của khách hàng
 * @param {Object} payment - Chi tiết thanh toán
 */

// // Hàm gửi email thông báo
const sendPaymentNotification = async (userEmail, payment) => {
  // Kiểm tra dữ liệu đầu vào
  if (
    !payment ||
    !payment.order ||
    !payment.paymentStatus ||
    !payment.amount ||
    !payment.currency ||
    !payment.transactionId
  ) {
    throw new Error("Invalid payment data");
  }

  let subject, text, html;
  if (
    payment.paymentStatus === "Failed" ||
    payment.paymentStatus === "Expired"
  ) {
    subject = `Payment Expired - Order #${payment.order}`;
    text = `Dear Customer,\n\nWe regret to inform you that your payment for order #${
      payment.order
    } has expired.\n\nDetails:\n- Amount: ${payment.amount} ${
      payment.currency
    }\n- Transaction ID: ${payment.transactionId}\n- Status: ${
      payment.paymentStatus
    }\n- Expired At: ${new Date(payment.expiresAt).toLocaleString()}\n${
      payment.failureReason ? `- Reason: ${payment.failureReason}\n` : ""
    }Please create a new payment request to complete your order.\n\nBest regards,\nSupport Team`;
    html = `
      <h2>Payment Expired - Order #${payment.order}</h2>
      <p>Dear Customer,</p>
      <p>We regret to inform you that your payment for order #${
        payment.order
      } has expired.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li><strong>Amount:</strong> ${payment.amount} ${payment.currency}</li>
        <li><strong>Transaction ID:</strong> ${payment.transactionId}</li>
        <li><strong>Status:</strong> ${payment.paymentStatus}</li>
        <li><strong>Expired At:</strong> ${new Date(
          payment.expiresAt
        ).toLocaleString()}</li>
        ${
          payment.failureReason
            ? `<li><strong>Reason:</strong> ${payment.failureReason}</li>`
            : ""
        }
      </ul>
      <p>Please create a new payment request to complete your order.</p>
      <p>Best regards,<br/>Support Team</p>
    `;
  } else {
    subject = `Payment Confirmation - Order #${payment.order}`;
    text = `Dear Customer,\n\nYour payment for order #${payment.order} has been ${payment.paymentStatus}.\n\nDetails:\n- Amount: ${payment.amount} ${payment.currency}\n- Transaction ID: ${payment.transactionId}\n- Status: ${payment.paymentStatus}\n\nThank you for your purchase!`;
    html = `
      <h2>Payment Confirmation - Order #${payment.order}</h2>
      <p>Dear Customer,</p>
      <p>Your payment for order #${payment.order} has been ${payment.paymentStatus}.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li><strong>Amount:</strong> ${payment.amount} ${payment.currency}</li>
        <li><strong>Transaction ID:</strong> ${payment.transactionId}</li>
        <li><strong>Status:</strong> ${payment.paymentStatus}</li>
      </ul>
      <p>Thank you for your purchase!</p>
      <p>Best regards,<br/>Support Team</p>
    `;
  }

  await sendEmail(userEmail, subject, text, html);
};

module.exports = {
  sendEmail,
  sendPaymentConfirmationEmail,
  sendRefundConfirmationEmail,
  sendPaymentNotification,
};
