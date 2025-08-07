const axios = require("axios");
const crypto = require("crypto");
const zaloPayConfig = require("../config/zalopayConfig");
const Payment = require("../model/paymentModel"); // Import model Payment
const User = require("../model/userModel"); // Import model User
const Order = require("../model/orderModel"); // Import model Order
const mongoose = require("mongoose"); // Import mongoose để kiểm tra ObjectId
const Role = require("../model/roleModel"); // Import model Role
require("dotenv").config();

const generateAppTransId = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${year}${month}${day}_${randomNum}`;
};

const createZaloPayRequest = async (
  orderId,
  amount,
  orderInfo,
  returnUrl,
  notifyUrl,
  appUser = null,
  bankCode = "",
  isQR = false
) => {
  try {
    if (
      !zaloPayConfig.appId ||
      !zaloPayConfig.key1 ||
      !zaloPayConfig.endpoint
    ) {
      throw new Error("ZaloPay configuration is incomplete");
    }

    // Validate amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      throw new Error(
        "Amount must be a positive integer and at least 1,000 VND"
      );
    }

    // Kiểm tra xem orderId có phải là ObjectId hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid orderId format");
    }

    // Kiểm tra xem appUser có phải là ObjectId hợp lệ không
    let userId;
    if (appUser && mongoose.Types.ObjectId.isValid(appUser)) {
      userId = appUser; // Nếu appUser là ObjectId hợp lệ, sử dụng nó
    } else {
      // Danh sách các role ưu tiên (theo tên role)
      const priorityRoleNames = process.env.PRIORITY_ROLES
        ? process.env.PRIORITY_ROLES.split(",")
        : ["admin", "manager", "staff"];

      // Tự động lấy user mặc định từ userModel
      let defaultUser = null;

      // Tìm _id của các role theo thứ tự ưu tiên
      for (const roleName of priorityRoleNames) {
        const role = await Role.findOne({ name: roleName });
        if (role) {
          // Tìm user có role tương ứng
          defaultUser = await User.findOne({ role: role._id });
          if (defaultUser) break; // Nếu tìm thấy user, thoát vòng lặp
        }
      }

      // Nếu không tìm thấy user với các role ưu tiên, lấy user đầu tiên trong database
      if (!defaultUser) {
        defaultUser = await User.findOne().sort({ createdAt: 1 });
        if (!defaultUser) {
          throw new Error("No users found in database to use as default user");
        }
      }

      userId = defaultUser._id;
    }

    // const embedData = isQR
    //   ? { prefer_paymethod: "qr" }
    //   : { merchantinfo: "embeddata123" };
    const embedData = isQR ? { prefer_paymethod: "qr" } : {};
    const items = [];
    const orderTime = Date.now();
    const description = `Thanh toán đơn hàng #${orderId} - ${orderInfo}`;
    const appTransId = generateAppTransId();

    // console.log("ZaloPay Config:", zaloPayConfig);
    // console.log(
    //   "Tạo thanh toán cho đơn hàng:",
    //   orderId,
    //   "với số tiền:",
    //   parsedAmount
    // );
    // console.log("App Trans ID:", appTransId);
    // console.log(
    //   "Phương thức thanh toán:",
    //   isQR ? "QR tự động" : "Thanh toán qua ứng dụng"
    // );

    // Tạo chuỗi dữ liệu để tính mac
    const data = [
      zaloPayConfig.appId,
      appTransId,
      userId.toString(),
      parsedAmount,
      orderTime,
      JSON.stringify(embedData),
      JSON.stringify(items),
    ]
      .map((item) => String(item).trim())
      .join("|");
    // console.log("Chuỗi dữ liệu để tạo mac:", data);

    // Tạo chữ ký (mac) bằng HMAC-SHA256
    const mac = crypto
      .createHmac("sha256", zaloPayConfig.key1)
      .update(data)
      .digest("hex");
    // console.log("Mac tạo ra:", mac);

    // Tạo yêu cầu gửi đến ZaloPay
    const request = {
      app_id: String(zaloPayConfig.appId),
      app_trans_id: appTransId,
      app_user: userId.toString(),
      app_time: String(orderTime),
      amount: String(parsedAmount),
      description,
      embed_data: JSON.stringify(embedData),
      item: JSON.stringify(items),
      bank_code: isQR ? "" : bankCode || zaloPayConfig.bankCode,
      notify_url: notifyUrl,
      redirect_url: returnUrl,
      mac,
    };

    // console.log("Yêu cầu gửi đến ZaloPay:", request);

    // Gửi yêu cầu đến ZaloPay
    const response = await axios.post(zaloPayConfig.endpoint, null, {
      params: request,
    });
    // console.log("Phản hồi từ ZaloPay:", response.data);

    return { ...response.data, appTransId };
  } catch (error) {
    console.error("Lỗi tạo yêu cầu thanh toán ZaloPay:", error.message);
    if (error.response) {
      console.error("Phản hồi lỗi từ ZaloPay:", error.response.data);
      throw new Error(
        `ZaloPay error: ${
          error.response.data.return_message || "Unknown error"
        } (Code: ${error.response.data.return_code})`
      );
    }
    throw error;
  }
};

const verifyZaloPaySignature = (data, receivedMac, key2) => {
  let parsedData;
  try {
    parsedData = JSON.parse(data);
  } catch (error) {
    console.error("🔹 Error parsing data:", error.message);
    return false;
  }

  if (
    !parsedData.app_id ||
    !parsedData.app_trans_id ||
    !parsedData.amount ||
    !parsedData.status
  ) {
    // console.log("🔹 Missing required fields in data");
    return false;
  }

  const signatureData = [
    parsedData.app_id,
    parsedData.app_trans_id,
    parsedData.amount,
    parsedData.status,
  ]
    .map((item) => String(item).trim())
    .join("|");

  // console.log("🔹 Chuỗi dữ liệu để tạo mac:", signatureData);
  const computedMac = crypto
    .createHmac("sha256", key2)
    .update(signatureData)
    .digest("hex");
  // console.log("🔹 Computed Mac:", computedMac);
  // console.log("🔹 Received Mac:", receivedMac);

  return computedMac === receivedMac;
};

module.exports = { createZaloPayRequest, verifyZaloPaySignature };
