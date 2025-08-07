require("dotenv").config();

const vnpayConfig = {
  apiUrl:
    process.env.vnp_Api ||
    "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  command: process.env.vnp_Command || "pay",
  currencyCode: process.env.vnp_CurrCode || "VND",
  endpoint:
    process.env.vnp_Url || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  ipnUrl: (
    process.env.vnp_IpnUrl ||
    "https://23fa-2001-ee0-56a3-1130-b923-6b1e-1d63-4062.ngrok-free.app/api/payment/order/vnpay-ipn"
  ).trim(),
  locale: process.env.vnp_Locale || "vn",
  orderType: process.env.vnp_OrderType || "other",
  returnUrl: (
    process.env.vnp_ReturnUrl ||
    "https://23fa-2001-ee0-56a3-1130-b923-6b1e-1d63-4062.ngrok-free.app/api/payment/order/vnpay_return"
  ).trim(),
  secretKey: (
    process.env.vnp_HashSecret || "TL8B2N6E2V2K11OI5RVDR844N999WV3V"
  ).trim(),
  tmnCode: process.env.vnp_TmnCode || "CVWA9LA1",
  version: process.env.vnp_Version || "2.1.0",
  bankCode: process.env.vnp_BankCode || "VNPAY",
};

// console.log("🔹 Loaded VNPAY Config:", {
//   tmnCode: vnpayConfig.tmnCode,
//   secretKey: vnpayConfig.secretKey,
//   endpoint: vnpayConfig.endpoint,
//   returnUrl: vnpayConfig.returnUrl,
//   ipnUrl: vnpayConfig.ipnUrl,
//   version: vnpayConfig.version,
// });

module.exports = vnpayConfig;
