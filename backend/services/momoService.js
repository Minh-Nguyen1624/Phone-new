const axios = require("axios");
const crypto = require("crypto");
const momoConfig = require("../config/momoConfig");

// Kiểm tra cấu hình MoMo
const checkMomoConfig = () => {
  if (!momoConfig) {
    throw new Error(
      "momoConfig is not defined. Please check the configuration file."
    );
  }
  const { partnerCode, accessKey, secretKey, endpoint, returnUrl, notifyUrl } =
    momoConfig;
  const requiredFields = {
    partnerCode,
    accessKey,
    secretKey,
    endpoint,
    returnUrl,
    notifyUrl,
  };
  const missingFields = Object.keys(requiredFields).filter(
    (key) => !requiredFields[key]
  );
  if (missingFields.length > 0) {
    throw new Error(`Missing MoMo config fields: ${missingFields.join(", ")}`);
  }
  if (!endpoint || !endpoint.startsWith("https")) {
    throw new Error("Invalid endpoint URL");
  }
  if (!returnUrl.startsWith("https") || !notifyUrl.startsWith("https")) {
    throw new Error("returnUrl and notifyUrl must start with https");
  }
};

const createMomoRequest = async (
  orderId,
  amount,
  orderInfo,
  returnUrl,
  notifyUrl,
  paymentCode = "",
  orderGroupId = ""
) => {
  checkMomoConfig();
  const { partnerCode, accessKey, secretKey, endpoint, timeoutGeneral } =
    momoConfig;

  const amountNum = Math.round(Number(amount));
  if (isNaN(amountNum) || amountNum <= 0 || amountNum < 1000) {
    throw new Error(
      "Amount must be a positive number and greater than or equal to 1,000 VND."
    );
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(orderId)) {
    throw new Error(
      "orderId must only contain letters, numbers, underscores, or hyphens."
    );
  }

  const requestType = "payWithMethod";
  const extraData = "returnQrCode=true";

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    // Tạo orderId và requestId mới cho mỗi lần thử
    const uniqueOrderId = `${orderId}_${Date.now()}_${attempt}`; // Thêm attempt để đảm bảo tính duy nhất
    const requestId = uniqueOrderId;

    const stringFields = {
      partnerCode,
      requestId,
      orderId: uniqueOrderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: "vi",
      requestType,
      extraData,
    };

    for (const [key, value] of Object.entries(stringFields)) {
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(
          `Field ${key} must be a non-empty string, got: ${value}`
        );
      }
    }

    console.log("🔹 Using Endpoint:", endpoint);
    console.log("🔹 Using returnUrl:", returnUrl);
    console.log("🔹 Using notifyUrl:", notifyUrl);
    console.log(
      `🔹 Attempt ${attempt + 1}/${maxRetries} - Transaction created at:`,
      new Date().toISOString()
    );

    const params = {
      accessKey,
      amount: amountNum,
      extraData,
      ipnUrl: notifyUrl,
      orderId: uniqueOrderId,
      orderInfo,
      partnerCode,
      redirectUrl: returnUrl,
      requestId,
      requestType,
    };

    if (paymentCode) {
      params.paymentCode = paymentCode;
    }

    const rawSignature = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    console.log("🔹 Raw Signature:", rawSignature);

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");
    console.log("🔹 Generated Signature:", signature);

    const request = {
      partnerCode,
      requestId,
      amount: amountNum,
      orderId: uniqueOrderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: "vi",
      requestType,
      autoCapture: true,
      extraData,
      orderGroupId,
      signature,
    };

    if (paymentCode) {
      request.paymentCode = paymentCode;
    }

    console.log("🔹 Full Request Payload:", JSON.stringify(request, null, 2));

    try {
      const response = await axios.post(endpoint, request, {
        headers: { "Content-Type": momoConfig.contentType },
        timeout: timeoutGeneral,
      });
      console.log(
        "✅ Full MoMo Response:",
        JSON.stringify(response.data, null, 2)
      );
      if (response.data.resultCode !== 0) {
        console.error(
          "MoMo API Error:",
          JSON.stringify(response.data, null, 2)
        );
        throw new Error(
          `MoMo error: ${response.data.resultCode} - ${response.data.message}`
        );
      }
      return response.data;
    } catch (error) {
      attempt++;
      console.error(
        `Attempt ${attempt}/${maxRetries} failed:`,
        JSON.stringify(error.response?.data || error.message, null, 2)
      );
      if (attempt === maxRetries) {
        throw new Error(
          error.response?.data?.message || "Failed to create Momo payment"
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Backoff
    }
  }
};
const queryMomoTransaction = async (orderId, requestId) => {
  checkMomoConfig();
  const { partnerCode, accessKey, secretKey, endpoint, timeoutGeneral } =
    momoConfig;
  const baseEndpoint = endpoint.substring(0, endpoint.lastIndexOf("/create"));
  const queryEndpoint = `${baseEndpoint}/query`;
  console.log("🔹 Query Endpoint:", queryEndpoint);

  const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  console.log("🔹 Query Raw Signature:", rawSignature);
  console.log("🔹 Query Signature:", signature);

  const request = {
    partnerCode,
    requestId,
    orderId,
    signature,
    lang: "vi",
  };

  try {
    console.log("🔹 Querying MoMo transaction at:", new Date().toISOString());
    const response = await axios.post(queryEndpoint, request, {
      headers: { "Content-Type": momoConfig.contentType },
      timeout: timeoutGeneral, // Sử dụng timeout từ cấu hình (30 giây)
    });
    console.log("✅ MoMo Query Response:", response.data);

    if (response.data.resultCode === 0 || response.data.resultCode === 1000) {
      return response.data;
    } else if (response.data.resultCode === 1005) {
      throw new Error(
        "Transaction expired or does not exist. Please create a new payment request."
      );
    } else {
      throw new Error(
        `MoMo query error: ${response.data.resultCode} - ${response.data.message}`
      );
    }
  } catch (error) {
    console.error(
      "Error querying MoMo transaction:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || "Failed to query MoMo transaction"
    );
  }
};

module.exports = { createMomoRequest, queryMomoTransaction };
