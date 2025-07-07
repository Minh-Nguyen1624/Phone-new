const Review = require("../model/reviewModel");
const rateLimit = require("express-rate-limit");
const Phone = require("../model/phoneModel");
const User = require("../model/userModel");

// Rate limiter to prevent spamming (maximum 5 requests per hour per IP)
const reviewRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message:
    "Too many review submissions from this IP, please try again after an hour",
});

// Tạo một review mới
const createReview = async (req, res) => {
  try {
    const { phone, user, rating, content } = req.body;

    // Kiểm tra xem user đã review sản phẩm này chưa
    const existingReview = await Review.findOne({
      phone,
      user,
      isDeleted: false,
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    // Kiểm tra nội dung review có quá giống nhau không
    const similarReview = await Review.findOne({ user, content });
    if (similarReview) {
      return res.status(400).json({
        success: false,
        message: "Duplicate review content detected",
      });
    }
    const newReview = await Review.create({
      phone,
      user,
      rating,
      content,
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: newReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy tất cả review của một sản phẩm (phone)
const getReviewsByPhone = async (req, res) => {
  try {
    const { phoneId } = req.params; // Lấy `phoneId` từ params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Lấy `limit` từ query parameters (default: 100)
    const skip = (page - 1) * limit; // Tính offset để skip bao nhiêu dữ liệu
    const reviews = await Review.findByPhone(phoneId)
      .sort({ createdAt: -1 }) // Sắp xếp theo th��i gian tạo (mới nhất đầu)
      .skip(skip)
      .limit(limit) // Lấy bao nhiêu dữ liệu tương ứng với `limit`
      .lean(); // Gọi phương thức `findByPhone`

    const totalReviews = await Review.countDocuments({
      phone: phoneId,
      isDelete: false,
    });

    res.status(200).json({
      success: true,
      message: `Reviews for phone ${phoneId}`,
      data: reviews,
      pagination: {
        totalReviews,
        page,
        limit,
        totalPages: Math.ceil(totalReviews / limit),
      },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy tất cả review của một người dùng
const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params; // Lấy `userId` từ params
    const reviews = await Review.findByUser(userId); // Gọi phương thức `findByUser`

    res.status(200).json({
      success: true,
      message: `Reviews for user ${userId}`,
      data: reviews,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Cập nhật một review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params; // Lấy `reviewId` từ params
    const { rating, content } = req.body;

    // Find the review
    const review = await Review.findById(reviewId);
    if (review.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot update a deleted review",
      });
    }

    // Update the review
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { rating, content, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updatedReview) {
      throw new Error("Review not found");
    }

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: updatedReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Xóa mềm một review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params; // Lấy `reviewId` từ params
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error("Review not found");
    }

    await review.deleteReview(); // Gọi phương thức `deleteReview` của model

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createReview,
  getReviewsByPhone,
  getReviewsByUser,
  updateReview,
  deleteReview,
  reviewRateLimiter, // Apply rate limiter to createReview route
};
