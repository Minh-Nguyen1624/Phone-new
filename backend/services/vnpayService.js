const querystring = require("querystring");
const crypto = require("crypto");
const moment = require("moment");
const axios = require("axios");
const vnpayConfig = require("../config/vnpayConfig");

const generateTxnRef = (orderId) => {
  const timer = Date.now();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `order_${timer}_${orderId}_${randomNum}`;
};

const safeTrim = (value, defaultValue = "") => {
  return value ? value.toString().trim() : defaultValue;
};

const getPublicIp = async () => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    return response.data.ip;
  } catch (error) {
    console.error("Error fetching public IP:", error.message);
    return "127.0.0.1";
  }
};

const normalizeString = (str) => {
  return encodeURIComponent(str.replace(/\s+/g, " ").trim()).replace(
    /%20/g,
    "+"
  );
};

const createVnPayWalletRequest = async (
  orderId,
  amount,
  orderInfo,
  clientIp,
  returnUrl = vnpayConfig.returnUrl
) => {
  const parsedAmount = Number(amount);
  const vnp_Amount = Math.round(parsedAmount * 100); // Convert to smallest currency unit
  if (isNaN(vnp_Amount) || vnp_Amount <= 0) {
    throw new Error("Invalid amount. Must be a positive number.");
  }

  let vnp_IpAddr = safeTrim(clientIp, "127.0.0.1");
  if (vnp_IpAddr.startsWith("::ffff:")) {
    vnp_IpAddr = vnp_IpAddr.replace("::ffff:", "");
  }
  if (
    vnp_IpAddr === "127.0.0.1" ||
    vnp_IpAddr === "::1" ||
    vnp_IpAddr.length < 7 ||
    vnp_IpAddr.length > 45
  ) {
    vnp_IpAddr = await getPublicIp();
  }

  const vnp_CreateDate = moment().format("YYYYMMDDHHmmss");
  const vnp_ExpireDate = moment().add(15, "minutes").format("YYYYMMDDHHmmss");
  const vnp_TxnRef = generateTxnRef(orderId);

  const vnp_Params = {
    vnp_Amount: vnp_Amount.toString(),
    vnp_Command: vnpayConfig.command,
    vnp_CreateDate,
    vnp_ExpireDate,
    vnp_CurrCode: vnpayConfig.currencyCode,
    vnp_IpAddr,
    vnp_Locale: vnpayConfig.locale,
    vnp_OrderInfo: safeTrim(orderInfo, "Payment for order")
      .replace(/\s+/g, " ")
      .trim(),
    vnp_OrderType: vnpayConfig.orderType,
    vnp_ReturnUrl: returnUrl,
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_TxnRef,
    vnp_Version: vnpayConfig.version,
  };

  if (vnpayConfig.bankCode) {
    vnp_Params.vnp_BankCode = vnpayConfig.bankCode;
  }

  // Sort parameters alphabetically
  const sortedKeys = Object.keys(vnp_Params).sort();
  const signData = sortedKeys
    .map((key) => {
      const value =
        key === "vnp_OrderInfo"
          ? normalizeString(vnp_Params[key])
          : encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+");
      return `${key}=${value}`;
    })
    .join("&");

  // console.log("🔹 Sign Data (create):", signData);

  const vnp_SecureHash = crypto
    .createHmac("sha512", vnpayConfig.secretKey)
    .update(signData)
    .digest("hex");

  // console.log("🔹 Generated vnp_SecureHash (create):", vnp_SecureHash);

  // Create paymentUrl with properly encoded parameters
  const urlParams = {};
  sortedKeys.forEach((key) => {
    const value =
      key === "vnp_OrderInfo"
        ? normalizeString(vnp_Params[key])
        : encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+");
    urlParams[key] = value;
  });
  const queryString = sortedKeys
    .map((key) => `${key}=${urlParams[key]}`)
    .join("&");
  const paymentUrl = `${vnpayConfig.endpoint}?${queryString}&vnp_SecureHash=${vnp_SecureHash}`;
  // console.log("🔹 Payment URL:", paymentUrl);

  const paramsForVerification = { ...vnp_Params, vnp_SecureHash };

  return {
    paymentUrl,
    signData,
    vnp_SecureHash,
    params: paramsForVerification,
    transactionInfo: {
      orderId,
      txnRef: vnp_TxnRef,
      createDate: vnp_CreateDate,
    },
  };
};

const verifySignature = (params, secretKey) => {
  if (!params || !params.vnp_SecureHash) {
    // console.log("🔹 Error: Missing vnp_SecureHash in parameters");
    return false;
  }

  const vnp_SecureHash = params.vnp_SecureHash;
  const paramsForSign = { ...params };
  delete paramsForSign.vnp_SecureHash; // Exclude the hash from the signing process

  const sortedKeys = Object.keys(paramsForSign).sort();
  const signData = sortedKeys
    .map((key) => {
      const value = decodeURIComponent(paramsForSign[key]);
      const encodedValue =
        key === "vnp_OrderInfo"
          ? normalizeString(value)
          : encodeURIComponent(value).replace(/%20/g, "+");
      return `${key}=${encodedValue}`;
    })
    .join("&");

  // console.log("🔹 Verify Sign Data:", signData);

  const computedHash = crypto
    .createHmac("sha512", secretKey)
    .update(signData)
    .digest("hex");

  // console.log("🔹 Computed Hash:", computedHash);
  // console.log("🔹 Received vnp_SecureHash:", vnp_SecureHash);

  return computedHash === vnp_SecureHash;
};

const queryTransaction = async (orderId, txnRef, createDate) => {
  const params = {
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_TxnRef: txnRef,
    vnp_OrderId: orderId,
    vnp_TransactionDate: createDate,
    vnp_Command: "querydr",
    vnp_Version: vnpayConfig.version,
    vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
    vnp_IpAddr: await getPublicIp(),
  };

  const sortedKeys = Object.keys(params).sort();
  const signData = sortedKeys
    .map(
      (key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`
    )
    .join("&");
  const vnp_SecureHash = crypto
    .createHmac("sha512", vnpayConfig.secretKey)
    .update(signData)
    .digest("hex");
  params.vnp_SecureHash = vnp_SecureHash;

  try {
    const response = await axios.post(
      vnpayConfig.apiUrl,
      querystring.stringify(params),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    // console.log("🔹 Transaction Status:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error checking transaction status:", error.message);
    throw error;
  }
};

module.exports = {
  createVnPayWalletRequest,
  verifySignature,
  queryTransaction,
};
