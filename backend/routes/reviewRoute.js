const express = require("express");
const multer = require("multer");
const {
  createReview,
  getReviewsByPhone,
  getReviewsByUser,
  updateReview,
  deleteReview,
  reviewRateLimiter,
  getReviewsSummary,
  toggleLikeReview,
} = require("../controller/reviewController");

const router = express.Router();

const { protect, adminMiddleware } = require("../middleware/authMiddleware");

// Cấu hình multer cho upload ảnh (tối đa 3 ảnh, lưu vào thư mục uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Thư mục lưu ảnh (tạo thư mục này nếu chưa có)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Tên file unique
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 5MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh!"), false);
    }
  },
}).array("images", 3); // Tối đa 3 ảnh, tên field "images"

// router.post("/add", protect, createReview);
// POST /add - Tạo review mới (bảo vệ bằng protect, rate limit, và upload ảnh)
router.post("/add", protect, reviewRateLimiter, upload, createReview);

// router.get("/by-phone/:phoneId", getReviewsByPhone);
router.get("/by-phone/:id", getReviewsByPhone);

router.get("/by-user/:userId", getReviewsByUser);

router.put("/update/:id", protect, updateReview);

router.delete("/delete/:id", protect, deleteReview);

router.post("/reviews", reviewRateLimiter);

router.get("/summary/:id", getReviewsSummary);

router.post("/:id/like", protect, toggleLikeReview);
module.exports = router;
