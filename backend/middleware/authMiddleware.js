// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");
const asyncHandler = require("express-async-handler");
const Permission = require("../model/permissionModel");
const admin = require("firebase-admin");
// const asyncHandler = require("express-async-handler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Access denied, no token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
  console.log("Extracted Token:", token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    // const user = await User.findById(decoded.id).select("-password");
    const user = await User.findById(decoded.userId)
      .select("-password")
      .populate("role");
    console.log("User found:", user);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Kiểm tra trạng thái tài khoản
    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.",
      });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Tài khoản chưa được xác minh. Vui lòng kiểm tra email để xác minh tài khoản.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token đã hết hạn. Vui lòng đăng nhập lại.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ.",
      });
    }
    console.error("⚠️ Lỗi xác thực JWT:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi xác thực token",
      error: error.message,
    });
  }
});

const adminMiddleware = asyncHandler(async (req, res, next) => {
  if (
    !req.user ||
    !req.user.role ||
    req.user.role.roleName.toLowerCase() !== "admin"
  ) {
    return res
      .status(403)
      .json({ success: false, message: "Bạn không có quyền truy cập" });
  }
  next();
});

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded); // Log để debug
      // const user = await User.findById(decoded.id)
      const user = await User.findById(decoded.userId)
        .select("-password")
        .populate("role");
      if (!user) {
        // console.log(`User not found for ID: ${decoded.id}`); // Log để debug
        console.log(`User not found for ID: ${decoded.userId}`); // Log để debug
        return res.status(401).json({ message: "User not found" });
      }
      req.user = user;
      next();
    } catch (error) {
      console.log("Token verification failed:", error.message); // Log để debug
      // return res.status(401).json({ message: "Not authorized, token failed" });
      return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
});

const checkPermission = (permissionName) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền truy cập" });
    }

    const permission = await Permission.findOne({
      permissionName,
      isActive: true,
    });
    if (!permission) {
      return res.status(403).json({
        success: false,
        message: `Quyền ${permissionName} không tồn tại hoặc không hoạt động`,
      });
    }

    const hasPermission = req.user.role.permissions.some((permId) =>
      permId.equals(permission._id)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền ${permissionName}`,
      });
    }

    next();
  });
};

const verifyFirebaseToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization Header (JWT):", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No valid Authorization header found");
    return res
      .status(401)
      .json({ success: false, message: "Access denied, no token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Extracted JWT Token:", token.substring(0, 20) + "...");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Thay bằng secret key của bạn
    console.log("Successfully decoded JWT:", decoded);

    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error("User not found:", decoded.userId);
      return res.status(401).json({ success: false, message: "Invalid user" });
    }

    req.user = user; // Gán thông tin user vào req.user
    console.log("User assigned to req.user:", { userId: req.user._id });
    next();
  } catch (error) {
    console.error("JWT verification failed:", {
      message: error.message,
      code: error.name || "N/A",
      stack: error.stack || "N/A",
      tokenPreview: token.substring(0, 20) + "...",
    });
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
});
// const combinedAuthMiddleware = asyncHandler(async (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   console.log("Authorization Header:", authHeader);

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res
//       .status(401)
//       .json({ success: false, message: "Access denied, no token provided" });
//   }

//   const token = authHeader.split(" ")[1];
//   console.log("Extracted Token:", token);

//   let firebaseDecoded = null;
//   let jwtDecoded = null;
//   let user = null;

//   try {
//     // Thử xác thực Firebase Token
//     try {
//       firebaseDecoded = await admin.auth().verifyIdToken(token);
//       console.log("Decoded Firebase Token:", firebaseDecoded);
//     } catch (firebaseError) {
//       console.warn(
//         "Firebase Token verification failed:",
//         firebaseError.message
//       );
//     }

//     // Thử xác thực JWT
//     try {
//       jwtDecoded = jwt.verify(token, process.env.JWT_SECRET);
//       console.log("Decoded JWT Token:", jwtDecoded);
//     } catch (jwtError) {
//       console.warn("JWT Token verification failed:", jwtError.message);
//     }

//     // Yêu cầu ít nhất một trong hai token phải hợp lệ
//     if (!firebaseDecoded && !jwtDecoded) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid token: Neither Firebase nor JWT token is valid",
//       });
//     }

//     // Tìm người dùng trong MongoDB
//     const userId = firebaseDecoded?.uid || jwtDecoded?.userId;
//     if (!userId) {
//       return res
//         .status(401)
//         .json({ success: false, message: "No user ID found in token" });
//     }

//     user = await User.findById(userId).select("-password").populate("role");
//     if (!user) {
//       console.log(`User not found for ID: ${userId}`);
//       return res
//         .status(401)
//         .json({ success: false, message: "User not found" });
//     }

//     req.user = {
//       firebase: firebaseDecoded || null,
//       jwt: jwtDecoded || null,
//       dbUser: user,
//     };
//     next();
//   } catch (error) {
//     console.error("Token verification failed:", {
//       message: error.message,
//       stack: error.stack || "N/A",
//     });
//     return res.status(401).json({ success: false, message: "Invalid token" });
//   }
// });

module.exports = {
  authMiddleware,
  adminMiddleware,
  protect,
  verifyFirebaseToken,
  checkPermission,
  // combinedAuthMiddleware,
};
