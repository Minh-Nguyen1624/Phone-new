require("dotenv").config();
const i18n = require("i18n");
const express = require("express");
const session = require("express-session");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const {
  createVnPayRequest,
  verifySignature,
  createVnPayQRRequest,
} = require("./services/vnpayService");
const {
  createZaloPayRequest,
  verifyZaloPaySignature,
} = require("./services/zalopayService");
const Payment = require("./model/paymentModel");
const momoConfig = require("../backend/config/momoConfig");
const vnpayConfig = require("../backend/config/vnpayConfig");
const zaloPayConfig = require("../backend/config/zalopayConfig");
const { setIo } = require("../backend/controller/chatBoxController");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const cookieParser = require("cookie-parser");
const mySQL = require("mysql2");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

console.log(
  "OPENAI_API_KEY:",
  process.env.OPENAI_API_KEY ? "Loaded ✅" : "Missing ❌"
);

// Import Passport config
const passport = require("passport");
require("./config/passportConfig");

i18n.configure({
  locales: ["en", "vi"],
  directory: path.join(__dirname, "locales"),
  // defaultLocale: "en",
  defaultLocale: "vi",
  objectNotation: true,
});

app.use(cookieParser());

app.use(i18n.init);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Import routes
const userRoutes = require("./routes/userRoute");
const phoneRoutes = require("./routes/phoneRoute");
const cartRoutes = require("./routes/cartRoute");
const orderRoutes = require("./routes/orderRoute");
const discountRoutes = require("./routes/discountRoute");
const categoryRoutes = require("./routes/categoryRoute");
const reportRoutes = require("./routes/reportRoute");
const paymentRoutes = require("./routes/paymentRoute");
const commentRoutes = require("./routes/commentRoute");
const blogRoutes = require("./routes/blogRoute");
const voucherController = require("./routes/voucherRoute");
const inventoriesRoute = require("./routes/inventoryRoute");
const analyticsRoute = require("./routes/analyticsRoute");
const addressRoute = require("./routes/addressRoute");
const notificationRoute = require("./routes/notificationRoute");
const logRoute = require("./routes/logRoute");
const campaignRoute = require("./routes/campaignRoute");
const contentRoute = require("./routes/contentRoute");
const folderRoute = require("./routes/folderRoute");
const fileRoute = require("./routes/fileRoute");
const permissionRoute = require("./routes/permissionRoute");
const roleRoute = require("./routes/roleRoute");
const transactionRoute = require("./routes/transactionRoute");
const reviewRoute = require("./routes/reviewRoute");
const reportRoute = require("./routes/reportRoute");
const chatBoxRoute = require("./routes/chatBoxRoute");

// Debug: Confirm chatBoxRoute import
// console.log("chatBoxRoute imported:", chatBoxRoute);

// Import and connect to database
const connectDB = require("./config/db");
connectDB();

// Import middleware
const authMiddleware = require("./middleware/authMiddleware");
const adminMiddleware = require("./middleware/adminMiddleware");

// Set port from environment variables
const PORT = process.env.NODE_LOCAL_PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use((req, res, next) => {
  if (!req.session.sessionId) {
    req.session.sessionId = uuidv4(); // Generate a new session ID if it doesn't exist
    res.cookie("sessionId", req.session.sessionId, {
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: false, // Set to true if using HTTPS
      // secure: process.env.NODE_ENV, // Set to true if using HTTPS
    });
    // console.log("New session created:", req.session.sessionId);
  }
  req.body.sessionId = req.session.sessionId; // Attach sessionId to request body
  // console.log("Session ID:", req.session.sessionId);
  next();
});

app.use(passport.session());

const fs = require("fs");
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use("/files", express.static(path.join(__dirname, "../files")));

app.get("/login", (req, res) => {
  res.send("Login failed. Please try again.");
});

app.get("/complete-profile", (req, res) => {
  if (!req.user) return res.redirect("/login");
  res.send("Please complete your profile.");
});

app.get("/", (req, res) => {
  if (!req.user) return res.redirect("/login");
  res.send(`Welcome, ${req.user.username}!`);
});

app.get("/api/payment/order/vnpay_return", (req, res) => {
  // console.log("🔹 Full Request URL:", req.url);
  // console.log("🔹 Query Parameters:", JSON.stringify(req.query, null, 2));
  // console.log("🔹 Request Headers:", JSON.stringify(req.headers, null, 2));
  // console.log("🔹 Request Method:", req.method);

  if (!req.query || Object.keys(req.query).length === 0) {
    // console.log("❌ Error: No query parameters received from VNPay");
    return res.status(400).json({
      success: false,
      message: "No query parameters received from VNPay",
    });
  }

  if (!req.query.vnp_SecureHash) {
    //   console.log("❌ Error: Missing vnp_SecureHash");
    //   console.log("🔹 Available Query Parameters:", Object.keys(req.query));
    return res
      .status(400)
      .json({ success: false, message: "Missing vnp_SecureHash" });
  }

  const isValid = verifySignature(req.query, vnpayConfig.secretKey);
  // console.log("🔹 Signature Verification:", isValid);

  if (isValid) {
    return res.json({ success: true, message: "Payment successful" });
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Lỗi: Chữ ký không hợp lệ" });
  }
});

app.get("/api/payment/order/vnpay-ipn", (req, res) => {
  // console.log("Received IPN from VNPAY:", req.query);
  res.status(200).send("OK");
});

app.get("/api/payment/order/ZaloPay_return", (req, res) => {
  // console.log("🔹 Full Request URL:", req.url);
  // console.log("🔹 Query Parameters:", JSON.stringify(req.query, null, 2));
  // console.log("🔹 Request Headers:", JSON.stringify(req.headers, null, 2));
  // console.log("🔹 Request Method:", req.method);

  if (!req.query || Object.keys(req.query).length === 0) {
    // console.log("❌ Error: No query parameters received from ZaloPay");
    return res.status(400).json({
      success: false,
      message: "No query parameters received from ZaloPay",
    });
  }

  if (!req.query.mac) {
    // console.log("❌ Error: Missing mac");
    // console.log("🔹 Available Query Parameters:", Object.keys(req.query));
    return res.status(400).json({ success: false, message: "Missing mac" });
  }

  const isValid = verifyZaloPaySignature(req.query, zaloPayConfig.key2);
  // console.log("🔹 Signature Verification:", isValid);

  if (isValid) {
    const status = parseInt(req.query.status, 10);
    if (status === 1) {
      return res.json({ success: true, message: "Payment successful" });
    } else {
      return res.json({
        success: false,
        message: "Payment failed",
        status: status,
      });
    }
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Lỗi: Chữ ký không hợp lệ" });
  }
});

setIo(io);

// Socket.IO connection handling
io.on("connection", (socket) => {
  // console.log("User connected:", socket.id);

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    // console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on("disconnect", () => {
    // console.log("User disconnected:", socket.id);
  });
});

// Initialize chatBoxRoute with io
// console.log("Initializing chatBoxRoute with io");
chatBoxRoute.initializeIo(io); // Call initializeIo before using router
app.use("/api/chatbox", chatBoxRoute.router); // Use chatBoxRoute.router after initialization

// Routes
app.use("/api/users", userRoutes);
app.use("/api/phones", phoneRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/discount", discountRoutes);
app.use("/api/categorys", categoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/vouchers", voucherController);
app.use("/api/inventories", inventoriesRoute);
app.use("/api/analytics", analyticsRoute);
app.use("/api/addresses", addressRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/logs", logRoute);
app.use("/api/campaigns", campaignRoute);
app.use("/api/contents", contentRoute);
app.use("/api/folders", folderRoute);
app.use("/api/files", fileRoute);
app.use("/api/permissions", permissionRoute);
app.use("/api/roles", roleRoute);
app.use("/api/transactions", transactionRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/reports", reportRoute);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log(`API URL: http://localhost:${PORT}/api/`);
  console.log(`API URL: http://localhost:${PORT}/api/`);
});
