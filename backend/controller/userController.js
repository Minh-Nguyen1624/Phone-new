require("dotenv").config();
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const validator = require("validator"); // ✅ Thêm dòng này để tránh lỗi
const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const Address = require("../model/addressModel");
const Role = require("../model/roleModel");
const User = require("../model/userModel");
const Order = require("../model/orderModel");
const Cart = require("../model/cartModel");
const Review = require("../model/reviewModel");
const Notification = require("../model/notificationModel");
const Transaction = require("../model/transactionModel");
const mongoose = require("mongoose");
// const sendEmail = require("../utils/email");
const { sendEmail } = require("../utils/email");
const passport = require("passport");
// Validation middleware
const validateRegistration = [
  body("username")
    .isString()
    .withMessage("Username must be a string")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .matches(/^[a-zA-Z0-9_]+$/) // Chỉ chấp nhận chữ cái, số và dấu gạch dưới
    .withMessage("Username must not contain special characters or spaces"),
  body("email")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .custom(async (value) => {
      const user = await User.findOne({ email: value });
      if (user) {
        throw new Error("Email already exists");
      }
      return true;
    }),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[\W_]/)
    .withMessage("Password must contain at least one special character"),
  body("phone")
    .matches(/^\d{10,15}$/)
    .withMessage(
      "Phone number must be between 10 to 15 digits, and may include a country code"
    ),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("Invalid date of birth format (must be in YYYY-MM-DD format)")
    .toDate()
    .custom((value) => {
      const age = new Date().getFullYear() - value.getFullYear();
      if (age < 18) {
        throw new Error("You must be at least 18 years old");
      }
      return true;
    }),
  body("gender")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be 'male', 'female', or 'other'"),
  body("address.street")
    .optional()
    .isString()
    .withMessage("Street address must be a string")
    .notEmpty()
    .withMessage("Street address cannot be empty"),
  body("address.district")
    .optional()
    .isString()
    .withMessage("District must be a string")
    .notEmpty()
    .withMessage("District cannot be empty"),
  body("address.city")
    .optional()
    .isString()
    .withMessage("City must be a string")
    .notEmpty()
    .withMessage("City cannot be empty"),
  body("address.country")
    .optional()
    .isString()
    .withMessage("Country must be a string")
    .notEmpty()
    .withMessage("Country cannot be empty"),
  // body("role")
  //   .optional()
  //   .isIn(["user", "admin"])
  //   .withMessage("Invalid role value"),
  // body("role")
  //   .optional()
  //   .custom(validateObjectId)
  //   .custom(async (value) => {
  //     const role = await Role.findById(value);
  //     if (!role) {
  //       throw new Error("Role not found");
  //     }
  //     return true;
  //   }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateLogin = [
  body("email").trim().isEmail().withMessage("Invalid email format"),
  body("password").trim().notEmpty().withMessage("Password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const registerUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      phone,
      address,
      dateOfBirth,
      gender,
      role,
      order,
      cart,
      review,
      transaction,
      notifications,
      emailNotifications,
      smsNotifications,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email đã được sử dụng. Vui lòng dùng email khác." });
    }

    const validateObjectId = async (model, id) => {
      if (id && mongoose.Types.ObjectId.isValid(id)) {
        const doc = await model.findById(id);
        return doc ? id : null;
      }
      return null;
    };

    const userAddress = await validateObjectId(Address, address);
    let userRole = await validateObjectId(Role, role);
    if (!userRole) {
      const defaultRole = await Role.findOne({ name: "user" });
      if (!defaultRole) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy vai trò mặc định 'user'." });
      }
      userRole = defaultRole._id;
    }

    const userOrder = await validateObjectId(Order, order);
    const userCart = await validateObjectId(Cart, cart);
    const userReview = await validateObjectId(Review, review);
    let userTransaction = [];
    if (transaction && Array.isArray(transaction)) {
      for (let trans of transaction) {
        const validTransaction = await validateObjectId(Transaction, trans);
        if (validTransaction) userTransaction.push(validTransaction);
      }
    }

    const userNotifications = [];
    if (notifications && Array.isArray(notifications)) {
      for (let notif of notifications) {
        const validNotif = await validateObjectId(Notification, notif);
        if (validNotif) userNotifications.push(validNotif);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(20).toString("hex");
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      gender,
      address: userAddress,
      role: userRole,
      order: userOrder,
      cart: userCart,
      review: userReview,
      transaction: userTransaction,
      notifications: userNotifications,
      emailNotifications: emailNotifications ?? true,
      smsNotifications: smsNotifications ?? true,
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 86400000, // Đồng bộ 24 giờ
    });

    const savedUser = await user.save();

    // const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
    // const verificationUrl = `http://localhost:5173/verify-email?token=${user.verificationToken}`;
    // Xác định URL xác minh dựa trên nguồn request
    const clientType = req.headers["x-client-type"] || "api"; // Mặc định là 'api' nếu không có header
    const baseUrl =
      clientType === "frontend"
        ? "http://localhost:5173"
        : "http://localhost:8080";
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    try {
      await sendEmail(
        email,
        "Xác minh email",
        `Vui lòng nhấp vào liên kết để xác minh email: ${verificationUrl}`,
        `<p>Vui lòng <a href="${verificationUrl}">nhấp vào đây</a> để xác minh email. Liên kết sẽ hết hạn sau 24 giờ.</p>`
      );
      console.log("Verification email sent successfully");
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return res.status(500).json({
        message:
          "Đăng ký thành công nhưng không thể gửi email xác minh. Vui lòng liên hệ hỗ trợ để nhận lại email xác minh.",
      });
    }

    // res.status(201).json({
    //   message:
    //     "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập. Nếu không nhận được email, kiểm tra thư mục spam hoặc liên hệ hỗ trợ.",
    //   user: {
    //     _id: savedUser._id,
    //     username: savedUser.username,
    //     email: savedUser.email,
    //     phone: savedUser.phone,
    //     dateOfBirth: savedUser.dateOfBirth,
    //     gender: savedUser.gender,
    //     address: savedUser.address,
    //     role: savedUser.role,
    //     order: savedUser.order,
    //     cart: savedUser.cart,
    //     review: savedUser.review,
    //     transaction: savedUser.transaction,
    //     notifications: savedUser.notifications,
    //     emailNotifications: savedUser.emailNotifications,
    //     smsNotifications: savedUser.smsNotifications,
    //     isActive: savedUser.isActive,
    //     isLocked: savedUser.isLocked,
    //     emailVerified: savedUser.emailVerified,
    //     twoFactorEnabled: savedUser.twoFactorEnabled,
    //     lastLogin: savedUser.lastLogin,
    //   },
    // });
    // Phản hồi linh hoạt
    if (clientType === "frontend") {
      // Redirect hoặc trả về JSON với thông báo để frontend xử lý
      return res.status(201).json({
        message:
          "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
        redirect: verificationUrl, // Frontend có thể tự redirect
      });
    } else {
      // Trả về JSON cho API
      return res.status(201).json({
        message:
          "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập. Nếu không nhận được email, kiểm tra thư mục spam hoặc liên hệ hỗ trợ.",
        user: {
          _id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          phone: savedUser.phone,
          dateOfBirth: savedUser.dateOfBirth,
          gender: savedUser.gender,
          address: savedUser.address,
          role: savedUser.role,
          order: savedUser.order,
          cart: savedUser.cart,
          review: savedUser.review,
          transaction: savedUser.transaction,
          notifications: savedUser.notifications,
          emailNotifications: savedUser.emailNotifications,
          smsNotifications: savedUser.smsNotifications,
          isActive: savedUser.isActive,
          isLocked: savedUser.isLocked,
          isVerified: savedUser.isVerified,
        },
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi đăng ký người dùng", error: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        message:
          "JWT_SECRET chưa được cấu hình trong biến môi trường. Vui lòng kiểm tra file .env.",
      });
    }

    // Populate role để lấy roleName
    const user = await User.findOne({ email })
      .select("+password")
      .populate("role", "roleName");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    if (!user.password) {
      return res
        .status(500)
        .json({ message: "Mật khẩu người dùng bị thiếu trong cơ sở dữ liệu." });
    }

    if (user.isLocked) {
      return res
        .status(403)
        .json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ." });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.",
      });
    }

    // if (!user.isVerified) {
    //   return res.status(403).json({
    //     message:
    //       "Tài khoản chưa được xác minh. Vui lòng kiểm tra email để xác minh tài khoản.",
    //   });
    // }

    const isPasswordValid = await user.comparePassword(password.trim());
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Mật khẩu không đúng." });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, name: user.username, role: user.role._id },
      jwtSecret,
      { expiresIn: "24h" }
    );

    const clientType = req.headers["x-client-type"] || "api";
    let redirectPath = "/";
    if (user.role && user.role.roleName === "admin") {
      redirectPath = "/admin";
    }

    if (clientType === "frontend") {
      return res.status(200).json({
        message: "Đăng nhập thành công.",
        token,
        redirect: redirectPath,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role.roleName, // Trả về roleName (ví dụ: "admin" hoặc "user")
          emailNotifications: user.emailNotifications,
          smsNotifications: user.smsNotifications,
          lastLogin: user.lastLogin,
        },
      });
    } else {
      return res.status(200).json({
        message: "Đăng nhập thành công.",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role.roleName,
          emailNotifications: user.emailNotifications,
          smsNotifications: user.smsNotifications,
          lastLogin: user.lastLogin,
        },
      });
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({
      message: "Lỗi khi đăng nhập",
      error: error.message,
    });
  }
};

const getUserAll = async (req, res) => {
  try {
    const users = await User.find()
      .populate(
        "address"
        // "street district ward city country province"
      )
      .populate({
        path: "role",
        select: "roleName permissions description",
        populate: {
          path: "permissions",
          select: "permissionName description",
        },
      });
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("address", "street district ward city country province")
      // .populate({
      //   path: "role",
      //   select: "roleName permissions description",
      //   populate: { path: "permissions", select: "permissionName description" },
      // });
      .populate({
        path: "role",
        select: "roleName permissions description",
        populate: {
          path: "permissions", // Populate the permissions field in the Role model
          select: "permissionName description", // Specify the fields to return from the Permission model
        },
      })
      .populate("order", "orderNumber orderDate orderStatus")
      .populate("cart", "items")
      .populate("review", "reviewTitle reviewContent rating")
      .populate(
        "transaction",
        "paymentMethod transactionDate description currency transactionFee"
      )
      .populate("notifications", "title message meta");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
};

// const updateUser = async (req, res) => {
//   try {
//     const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//     }).populate("address", "street district ward city country province");
//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     res.status(200).json({ message: "User updated successfully", updatedUser });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error updating user", error: error.message });
//   }
// };

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Kiểm tra xem id người dùng đã tồn tại hay chưa
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Kiểm tra xem người dùng có quyền cập nhật hay không
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cập nhật từng trường, chỉ cập nhật nếu có giá trị hợp lệ
    if (updateData.username) user.username = updateData.username;
    if (updateData.email) user.email = updateData.email;
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(updateData.password, salt);
    }
    if (updateData.phone) user.phone = updateData.phone;
    if (updateData.dateOfBirth) user.dateOfBirth = updateData.dateOfBirth;
    if (updateData.gender) user.gender = updateData.gender;
    if (updateData.address) user.address = updateData.address;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;
    if (updateData.isLocked !== undefined) user.isLocked = updateData.isLocked;
    if (updateData.emailVerified !== undefined)
      user.emailVerified = updateData.emailVerified;
    if (updateData.twoFactorEnabled !== undefined)
      user.twoFactorEnabled = updateData.twoFactorEnabled;
    if (updateData.lastLogin) user.lastLogin = updateData.lastLogin;
    if (updateData.role) user.role = updateData.role;
    if (updateData.order) user.order = updateData.order;
    if (updateData.cart) user.cart = updateData.cart;
    if (updateData.review) user.review = updateData.review;
    if (updateData.notifications) user.notifications = updateData.notifications;
    // if (updateData.transaction) user.transaction = updateData.transaction;
    // Transaction giờ là mảng
    if (updateData.transaction) {
      if (Array.isArray(updateData.transaction)) {
        user.transaction = updateData.transaction;
      } else {
        return res
          .status(400)
          .json({ message: "Transaction must be an array" });
      }
    }
    if (updateData.emailNotifications !== undefined)
      user.emailNotifications = updateData.emailNotifications;
    if (updateData.smsNotifications !== undefined)
      user.smsNotifications = updateData.smsNotifications;

    await user.save();

    // Populate địa chỉ nếu có
    user = await user
      .populate("address", "street district ward city country province")
      .populate({
        path: "role",
        select: "roleName permissions description",
        populate: {
          path: "permissions", // Populate the permissions field in the Role model
          select: "permissionName description", // Specify the fields to return from the Permission model
        },
      })
      .populate("order", "orderNumber orderDate orderStatus")
      .populate("cart", "items")
      .populate("review", "reviewTitle reviewContent rating")
      .populate(
        "transaction",
        "paymentMethod transactionDate description currency transactionFee"
      )
      .populate("notifications", "title message meta");
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra xem email có được gửi lên không
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Tìm user dựa vào email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Kiểm tra nếu tài khoản đã bị khóa
    if (user.isLocked) {
      return res
        .status(403)
        .json({ message: "Account is locked. Please contact support." });
    }

    // Tạo token reset mật khẩu
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetTokenExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Tạo link reset mật khẩu
    // const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
    const subject = "Reset Password";
    const text = `Click vào link sau để đặt lại mật khẩu: ${resetUrl}`;
    const html = `
      <h2>Đặt lại mật khẩu</h2>
      <p>Vui lòng click vào link sau để đặt lại mật khẩu của bạn:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Link này sẽ hết hạn sau 1 giờ.</p>
    `;

    // Gửi email
    await sendEmail(user.email, subject, text, html);

    res
      .status(200)
      .json({ message: "Password reset link sent to email", resetToken });
  } catch (error) {
    res.status(500).json({
      message: "Error sending password reset link",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Kiểm tra nếu không có token hoặc password
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Kiểm tra độ mạnh của mật khẩu
    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minNumbers: 1,
        minUppercase: 1,
      })
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include at least one uppercase letter and one number",
      });
    }

    // Hash lại token để kiểm tra trong database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      // resetToken: crypto
      //   .createHash("sha256")
      //   .update(token)
      //   .digest("hex"),
      resetToken: hashedToken,
      resetTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    // user.password = password;
    // user.resetToken = undefined;
    // user.resetTokenExpires = undefined;
    // Cập nhật mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Xóa token sau khi dùng xong
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Email đã được xác minh thành công." });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi xác minh email", error: err.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    // kiểm tra người dùng đã được xác thực chưa
    if (!req.user || !req.user._id) {
      return res.status(401).join({
        success: false,
        message: "Bạn chưa đăng nhập",
      });
    }
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("role", "roleName description") // Populate trường role
      .populate("address", "street district ward city country province") // Populate địa chỉ
      .populate("order", "orderNumber orderDate orderStatus") // Populate đơn hàng
      .populate("cart", "items") // Populate giỏ hàng
      .populate("review", "reviewTitle reviewContent rating") // Populate đánh giá
      .populate(
        "transaction",
        "paymentMethod transactionDate description currency transactionFee"
      ) // Populate giao dịch
      .populate("notifications", "title message meta"); // Populate thông báo

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản của bạn đã bị khóa",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản của bạn đã bị vô hiệu hóa",
      });
    }

    // // kiểm tra xác minh email
    // if (!user.isVerified) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Bạn cần xác minh email",
    //   });
    // }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      username,
      email,
      phone,
      // address = {},
      address,
      gender,
      dateOfBirth,
    } = req.body;

    // Kiểm tra quyền: Chỉ cho phép người dùng cập nhật hồ sơ của chính họ
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        message: "Access denied: You can only update your own profile",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Xác thực dữ liệu đầu vào
    const errors = {};
    if (username && (username.length < 3 || username.length > 50)) {
      errors.username = "Username must be between 3 and 50 characters";
    }
    if (email && !validator.isEmail(email)) {
      errors.email = "Invalid email format";
    }
    if (phone && !validator.isMobilePhone(phone)) {
      errors.phone = "Invalid phone number";
    }
    if (gender && !["male", "female", "other"].includes(gender)) {
      errors.gender = "Gender must be 'male', 'female', or 'other'";
    }
    if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
      errors.dateOfBirth = "Invalid date of birth";
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation error", errors });
    }

    // Kiểm tra email trùng lặp
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update user fields if provided
    user.username = username || user.username;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.gender = gender || user.gender;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;

    // // Kiểm tra nếu address được gửi trong request
    // if (address) {
    //   const existingAddress = await Address.findById(user.address);
    //   if (existingAddress) {
    //     // Cập nhật address hiện tại
    //     existingAddress.street = address.street || existingAddress.street;
    //     existingAddress.district = address.district || existingAddress.district;
    //     existingAddress.city = address.city || existingAddress.city;
    //     existingAddress.country = address.country || existingAddress.country;
    //     await existingAddress.save();
    //   } else {
    //     // Tạo mới address
    //     const newAddress = new Address(address);
    //     await newAddress.save();
    //     user.address = newAddress._id;
    //   }
    // }

    // Xử lý address (mảng các ObjectId)
    if (address) {
      // Giả sử chỉ làm việc với địa chỉ đầu tiên trong mảng
      const addressId = user.address.length > 0 ? user.address[0] : null;
      if (addressId) {
        const existingAddress = await Address.findById(addressId);
        if (existingAddress) {
          // Cập nhật địa chỉ hiện tại
          existingAddress.street = address.street || existingAddress.street;
          existingAddress.district =
            address.district || existingAddress.district;
          existingAddress.city = address.city || existingAddress.city;
          existingAddress.country = address.country || existingAddress.country;
          await existingAddress.save();
        }
      } else {
        // Tạo địa chỉ mới và thêm vào mảng
        const newAddress = new Address(address);
        await newAddress.save();
        user.address = [newAddress._id];
      }
    }

    // Lưu user sau khi cập nhật
    const updatedUser = await user.save();

    // Trả về phản hồi với các trường được chọn lọc
    res.status(200).json({
      message: "Profile updated successfully",
      updatedUser: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth,
        address: updatedUser.address,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
};

const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  await User.findByIdAndUpdate(req.user._id, { lastLogin: null });

  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Chỉ gửi cookie qua HTTPS trong môi trường sản xuất
    sameSite: "Strict", // Chỉ gửi cookie trong cùng một trang web
  });

  // Destroy session for social logins (Google, Facebook, TikTok, Twitter)
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("⚠️ Error destroying session:", err);
        return res
          .status(500)
          .json({ success: false, message: "Failed to destroy session" });
      }
      // Clear session cookie
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    });
  } else {
    // If no session (e.g., JWT-only), just clear cookie and respond
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  }
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: "No user is authenticated" });
  }

  // Invalidate tokens by clearing resetToken and verificationToken
  await User.findByIdAndUpdate(req.user._id, {
    lastLogin: null,
    resetToken: null,
    resetTokenExpires: null,
    verificationToken: null,
    verificationTokenExpires: null,
  });

  // Clear JWT cookie
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  // Destroy session
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("⚠️ Error destroying session:", err);
        return res
          .status(500)
          .json({ success: false, message: "Failed to destroy session" });
      }
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return res.status(200).json({
        success: true,
        message: "Logged out from all devices successfully",
      });
    });
  } else {
    return res.status(200).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  }
});

const updateNotifications = async (req, res) => {
  try {
    // Kiểm tra xem người dùng đã được xác thực chưa
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Không được phép truy cập. Vui lòng đăng nhập.",
      });
    }

    // Kiểm tra quyền: Chỉ cho phép cập nhật thông báo của chính người dùng
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Bạn chỉ có thể cập nhật thông báo của chính mình.",
      });
    }

    const { emailNotifications, smsNotifications } = req.body;

    // Tìm user theo ID từ token (được gán từ middleware auth)
    // const user = await User.findById(req.user._id);
    // const user = await User.findById(req.user.id);
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // // Kiểm tra xác minh email
    // if (!user.isVerified) {
    //   return res.status(403).json({
    //     success: false,
    //     message:
    //       "Tài khoản chưa được xác minh. Vui lòng kiểm tra email để xác minh tài khoản.",
    //   });
    // }

    // Cập nhật cài đặt thông báo
    if (emailNotifications !== undefined) {
      if (typeof emailNotifications !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "emailNotifications phải là giá trị boolean.",
        });
      }
      user.emailNotifications = emailNotifications;
    }
    if (smsNotifications !== undefined) {
      if (typeof smsNotifications !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "smsNotifications phải là giá trị boolean.",
        });
      }
      user.smsNotifications = smsNotifications;
    }

    // Cập nhật thông báo nếu có giá trị mới
    if (emailNotifications !== undefined) {
      user.emailNotifications = emailNotifications;
    }
    if (smsNotifications !== undefined) {
      user.smsNotifications = smsNotifications;
    }

    // user.emailNotifications =
    //   emailNotifications !== undefined
    //     ? emailNotifications
    //     : user.emailNotifications;
    // user.smsNotifications =
    //   smsNotifications !== undefined ? smsNotifications : user.smsNotifications;
    await user.save();
    res.status(201).json({
      message: "Notifications updated successfully",
      user: {
        _id: user._id,
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating notifications", error: error.message });
  }
};

// Google OAuth
const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});
// const googleAuthCallback = passport.authenticate("google", {
//   successRedirect: "/",
//   // failureRedirect: "/login",
//   failureRedirect: "http://localhost:8080/login",
// });
const googleAuthCallback = async (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false },
    async (err, user, info) => {
      if (err) {
        return res.status(401).json({ message: err.message });
      }

      if (!user) {
        return res.status(401).json({ message: "Xác thực Google thất bại." });
      }

      if (!user.isVerified) {
        return res.status(403).json({
          message:
            "Tài khoản chưa được xác minh. Vui lòng kiểm tra email để xác nhận danh tính trước khi đăng nhập qua Google. Nếu không nhận được email, kiểm tra thư mục spam hoặc liên hệ hỗ trợ.",
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return res.status(500).json({
          message:
            "JWT_SECRET chưa được cấu hình trong biến môi trường. Vui lòng kiểm tra file .env.",
        });
      }

      const token = jwt.sign(
        { userId: user._id, name: user.username, role: user.role?.name },
        jwtSecret,
        { expiresIn: "24h" }
      );

      res.status(200).json({
        message: "Đăng nhập qua Google thành công.",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role?.name,
          emailNotifications: user.emailNotifications,
          smsNotifications: user.smsNotifications,
          lastLogin: user.lastLogin,
        },
      });
    }
  )(req, res, next);
};

// Facebook OAuth
const facebookAuth = passport.authenticate("facebook", {
  scope: ["email"],
});
// const facebookAuthCallback = passport.authenticate("facebook", {
//   successRedirect: "/",
//   failureRedirect: "/login",
// });
const facebookAuthCallback = passport.authenticate("facebook", {
  successRedirect: (req, res) => {
    if (req.user && !req.user.isProfileComplete) {
      return "/complete-profile";
    }
    return "/";
  },
  failureRedirect: "/login",
});

// Github OAuth
const githubAuth = passport.authenticate("github", { scope: ["user:email"] });
const githubAuthCallback = passport.authenticate("github", {
  successRedirect: "/",
  failureRedirect: "http://localhost:8080/login",
});

// Twitter OAuth
const twitterAuth = passport.authenticate("twitter");
const twitterAuthCallback = passport.authenticate("twitter", {
  successRedirect: "/",
  failureRedirect: "/login",
});

// // Định nghĩa authentication middleware
// const tiktokAuth = passport.authenticate("tiktok", { scope: ["user.info.basic"] });
// const tiktokAuthCallback = passport.authenticate("tiktok", {
//   successRedirect: (req, res) => {
//     if (req.user && !req.user.isProfileComplete) {
//       return res.redirect("/complete-profile");
//     }
//     return res.redirect("/");
//   },
//   failureRedirect: "/login",
// });

// Middleware để bắt đầu quá trình xác thực TikTok
const tiktokAuth = passport.authenticate("tiktok", {
  scope: "user.info.basic", // Scope cơ bản
});

// Callback xử lý sau khi TikTok trả về
const tiktokAuthCallback = passport.authenticate("tiktok", {
  // successRedirect: '/complete-profile-check', // Chuyển hướng tùy theo trạng thái profile
  failureRedirect: "/login",
});

// // Middleware kiểm tra profile hoàn chỉnh
function completeProfileCheck(req, res, next) {
  console.log(
    "Checking profile completion for user:",
    req.user ? req.user.username : "No user"
  );
  if (req.user && !req.user.isProfileComplete)
    return res.redirect("/complete-profile");
  return res.redirect("/");
}

// Lấy thông tin user hiện tại
const getCurrentUser = (req, res) => {
  if (req.user) {
    return res.status(200).json(req.user);
  } else {
    res.status(401).json({ message: "Chưa đăng nhập" });
  }
};

module.exports = {
  validateLogin,
  validateRegistration,
  registerUser,
  loginUser,
  getUserAll,
  getUserById,
  updateUser,
  deleteUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updateProfile,
  logoutUser,
  logoutAllDevices,
  updateNotifications,
  googleAuth,
  googleAuthCallback,
  facebookAuth,
  facebookAuthCallback,
  githubAuth,
  githubAuthCallback,
  twitterAuth,
  twitterAuthCallback,
  tiktokAuth,
  tiktokAuthCallback,
  completeProfileCheck,
  getCurrentUser,
  getUserProfile,
};
