const express = require("express");
const {
  createReview,
  getReviewsByPhone,
  getReviewsByUser,
  updateReview,
  deleteReview,
  reviewRateLimiter,
  getReviewsSummary,
} = require("../controller/reviewController");

const router = express.Router();

const { protect, adminMiddleware } = require("../middleware/authMiddleware");
router.post("/add", protect, createReview);

// router.get("/by-phone/:phoneId", getReviewsByPhone);
router.get("/by-phone/:id", getReviewsByPhone);

router.get("/by-user/:userId", getReviewsByUser);

router.put("/update/:id", protect, updateReview);

router.delete("/delete/:id", protect, deleteReview);

router.post("/reviews", reviewRateLimiter);

router.get("/summary/:id", getReviewsSummary);
module.exports = router;
