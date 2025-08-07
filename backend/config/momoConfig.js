require("dotenv").config();

const momoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint:
    process.env.MOMO_MODE === "production"
      ? process.env.MOMO_ENDPOINT_PRODUCTION
      : process.env.MOMO_ENDPOINT_SANDBOX,
  contentType: process.env.MOMO_CONTENT_TYPE,
  timeoutGeneral: parseInt(process.env.MOMO_TIMEOUT_GENERAL, 10) * 1000, // Chuyển giây thành milliseconds
  timeoutTokenization:
    parseInt(process.env.MOMO_TIMEOUT_TOKENIZATION, 10) * 1000, // Chuyển giây thành milliseconds
  returnUrl: process.env.MOMO_RETURN,
  notifyUrl: process.env.MOMO_NOTIFYURL,
};

// Kiểm tra các biến môi trường
const requiredEnvVars = [
  "MOMO_PARTNER_CODE",
  "MOMO_ACCESS_KEY",
  "MOMO_SECRET_KEY",
  "MOMO_ENDPOINT_SANDBOX",
  "MOMO_RETURN",
  "MOMO_NOTIFYURL",
  "MOMO_CONTENT_TYPE",
  "MOMO_TIMEOUT_GENERAL",
  "MOMO_TIMEOUT_TOKENIZATION",
];
if (process.env.MOMO_MODE === "production") {
  requiredEnvVars.push("MOMO_ENDPOINT_PRODUCTION");
}

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

// console.log("🔹 Momo Config Loaded:", {
//   partnerCode: momoConfig.partnerCode,
//   accessKey: momoConfig.accessKey,
//   endpoint: momoConfig.endpoint,
//   mode: process.env.MOMO_MODE || "sandbox",
//   returnUrl: momoConfig.returnUrl,
//   notifyUrl: momoConfig.notifyUrl,
// });

module.exports = momoConfig;
