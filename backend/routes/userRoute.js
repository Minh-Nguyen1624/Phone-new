const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");
// const adminMiddleware = require("../middleware/adminMiddleware");
const {
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
} = require("../controller/userController");

const passport = require("../config/passportConfig");
const router = express.Router();

// router.get("/public-data", (req, res) => {
//   res.json({ message: "This is a public route" });
// });
// Route cho phép cả user và admin truy cập
// router.get(
//   "/user-profile",
//   authMiddleware,
//   adminMiddleware(["user", "admin"]),

// );

router.post("/register", validateRegistration, registerUser);
router.post("/login", validateLogin, loginUser);
// router.get("/", getUserAll);
router.get("/", authMiddleware, adminMiddleware, getUserAll);
router.get(
  "/auth/google",
  (req, res, next) => {
    console.log("Google Auth Request:", req.query);
    googleAuth(req, res, next);
  }
  // googleAuth
);
router.get("/auth/google/callback", googleAuthCallback);
// router.get("/current-user", getCurrentUser);
router.get("/current-user", authMiddleware, getCurrentUser);
router.get("/auth/github", githubAuth);
router.get("/auth/github/callback", githubAuthCallback);
router.get("/auth/facebook", facebookAuth);
router.get("/auth/facebook/callback", facebookAuthCallback);
router.get("/auth/twitter", twitterAuth);
router.get("/auth/twitter/callback", twitterAuthCallback);
// Xử lý lỗi từ TikTok
router.get(
  "/auth/tiktok/callback",
  (req, res, next) => {
    const error = req.query.error;
    if (error) {
      console.log("Error from TikTok:", req.query);
      return res
        .status(400)
        .send(
          `Authentication failed: ${
            req.query.error_description || "Unknown error"
          } (Error Code: ${req.query.errCode})`
        );
    }
    tiktokAuthCallback(req, res, next);
  },
  completeProfileCheck
);

// Định nghĩa route cho /oauth
router.get("/oauth", tiktokAuth);

// Định nghĩa route cho /api/users
// router.get("/api/users", (req, res) => {
//   console.log(
//     "Accessing /api/users route, User:",
//     req.user ? req.user.username : "No user"
//   );
//   if (!req.user) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }
//   res.json({
//     id: req.user._id,
//     tiktokId: req.user.tiktokId,
//     username: req.user.username,
//     isProfileComplete: req.user.isProfileComplete,
//   });
// });
router.get("/api/users", authMiddleware, (req, res) => {
  res.json({
    id: req.user._id,
    tiktokId: req.user.tiktokId,
    username: req.user.username,
    isProfileComplete: req.user.isProfileComplete,
  });
});
// router.get("/get-user-profile", authMiddleware, getUserProfile);
router.get("/get-user-profile", protect, getUserProfile);
// router.get("/:id", getUserById);
router.get("/:id", authMiddleware, getUserById);

// router.put("/update/:id", updateUser);
router.put("/update/:id", authMiddleware, updateUser);

// router.delete("/delete/:id", deleteUser);
router.delete("/delete/:id", authMiddleware, adminMiddleware, deleteUser);

router.post("/user-forgotPassword", forgotPassword);
router.post("/user-resetPassword", resetPassword);
router.get("/verify-email/:token", verifyEmail);

// router.put("/update-profile/:id", updateProfile);
router.put("/update-profile/:id", authMiddleware, updateProfile);

// router.post("/logout/:id", logoutUser);
// router.post("/logout/:id", authMiddleware, logoutUser);
router.post("/logout/", protect, logoutUser);
// Logout from all devices (optionally for another user, admin-only)
router.post("/logout-all/:id?", protect, adminMiddleware, logoutAllDevices);

router.put("/update-notifications/:id", authMiddleware, updateNotifications);
// Route: GET /verify-email/:token
// router.put("/update-profile/", updateProfile);
// router.get("/", authMiddleware, getUserAll);
// router.get("/:id", authMiddleware, getUserById);
// router.put("/update/:id", authMiddleware, adminMiddleware(["admin"]), updateUser);
// router.delete("/delete/:id", authMiddleware, adminMiddleware(["admin"]), deleteUser);
// router.get("/google", googleAuth);

// router.get("/get-user-profile", authMiddleware, getUserProfile);

module.exports = router;
