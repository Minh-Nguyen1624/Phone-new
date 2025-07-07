const express = require("express");
const {
  createReview,
  getReviewsByPhone,
  getReviewsByUser,
  updateReview,
  deleteReview,
  reviewRateLimiter,
} = require("../controller/reviewController");

const router = express.Router();
router.post("/add", createReview);

router.get("/by-phone/:phoneId", getReviewsByPhone);

router.get("/by-user/:userId", getReviewsByUser);

router.put("/update/:id", updateReview);

router.delete("/delete/:id", deleteReview);

router.post("/reviews", reviewRateLimiter);
module.exports = router;
