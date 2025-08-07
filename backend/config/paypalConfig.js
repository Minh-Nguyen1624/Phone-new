const redis = require("redis");
require("dotenv").config();

// Kiểm tra biến môi trường PayPal
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  throw new Error(
    "Missing PayPal credentials: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required"
  );
}

// Xác định môi trường và base URL cho PayPal
const isSandbox = process.env.PAYPAL_MODE !== "live";
const PAYPAL_API_URL = isSandbox
  ? "https://api.sandbox.paypal.com"
  : "https://api.paypal.com";

// Khởi tạo Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("❌ Redis Client Error:", err));

// Kết nối Redis
redisClient.connect().then(async () => {
  // console.log("✅ Connected to Redis");
  // Lưu token vào Redis ngay khi khởi động
  // storeInitialToken();
  await redisClient.del("paypal_access_token");
  // console.log("✅ Cleared old PayPal access token from Redis");
});

// Đóng Redis khi process kết thúc
process.on("SIGINT", async () => {
  await redisClient.quit();
  // console.log("Redis client disconnected");
  process.exit(0);
});

module.exports = {
  isSandbox,
  PAYPAL_API_URL,
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  redisClient,
};
