const Review = require("../model/reviewModel");
const rateLimit = require("express-rate-limit");
const Phone = require("../model/phoneModel");
const User = require("../model/userModel");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const {
  recalcPhoneRating,
  getReviewSummary,
} = require("../services/ratingService");
const {
  validateContent,
  advancedValidateContent,
  validateConsent,
  queueModeration,
  getAsync,
  setExAsync,
} = require("../utils/reviewUtils");

// Rate limiter to prevent spamming (maximum 5 requests per hour per IP)
const reviewRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message:
    "Too many review submissions from this IP, please try again after an hour",
});

// Tạo một review mới
const createReview = asyncHandler(async (req, res) => {
  const { phone, user, rating, content, consent, agreeRecommend } = req.body;

  if (!mongoose.isValidObjectId(phone) || !mongoose.isValidObjectId(user)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone or user ID" });
  }

  const phoneExists = await Phone.exists({ _id: phone });
  if (!phoneExists)
    return res.status(404).json({ success: false, message: "Phone not found" });
  const userExists = await User.exists({ _id: user });
  if (!userExists)
    return res.status(404).json({ success: false, message: "User not found" });

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

  try {
    await validateContent(content); // Kiểm tra ban đầu
    validateConsent(consent); // Kiểm tra đồng ý
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const cacheKey = `user_status:${user}`;
  const cachedStatus = await getAsync(cacheKey);
  let userDoc;
  if (cachedStatus) {
    userDoc = JSON.parse(cachedStatus);
  } else {
    userDoc = await User.findById(user);
    await setExAsync(cacheKey, 3600, JSON.stringify(userDoc)); // Cache 1 giờ
  }
  if (userDoc.isBanned) {
    return res.status(403).json({
      success: false,
      message: `Your account is banned: ${userDoc.banReason}`,
    });
  }

  const images = req.files ? req.files.map((file) => file.path) : [];

  // const newReview = await Review.create({
  //   phone,
  //   user,
  //   rating,
  //   content,
  //   consent,
  //   images,
  // }); // Lưu consent
  const reviewData = {
    phone,
    user,
    rating,
    content,
    consent,
    agreeRecommend: agreeRecommend !== undefined ? agreeRecommend : false, // Default to false if not provided
    images,
  };
  const newReview = await Review.create(reviewData);

  queueModeration(newReview._id, user, phone);

  await recalcPhoneRating(phone);

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    data: newReview,
  });
});

// Lấy tất cả review của một sản phẩm (phone)
const getReviewsByPhone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, page = 1, limit = 10 } = req.query;

  // Kiểm tra id hợp lệ
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid phone ID",
    });
  }

  // Tạo filter
  let filter = { phone: new mongoose.Types.ObjectId(id), isDeleted: false };
  if (rating) filter.rating = Number(rating);

  // Tính tổng review
  const totalReviews = await Review.countDocuments(filter);

  // Lấy review theo filter + phân trang
  const reviews = await Review.find(filter)
    .populate("user", "username email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    message: "Reviews fetched successfully",
    data: reviews,
    pagination: {
      totalReviews,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalReviews / limit),
    },
  });
});

// Lấy tất cả review của một người dùng
const getReviewsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const filter = {
    user: new mongoose.Types.ObjectId(userId),
    isDeleted: false,
  };
  const totalReviews = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .populate("phone", "name brand")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    message: `Reviews for user ${userId}`,
    data: reviews,
    pagination: {
      totalReviews,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalReviews / limit),
    },
  });
});

// Cập nhật một review
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, content, consent, agreeRecommend, images } = req.body;

  const review = await Review.findById(id);
  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }
  if (review.isDeleted) {
    return res.status(400).json({
      success: false,
      message: "Cannot update a deleted review",
    });
  }

  // Handle updated images
  const updatedImages = images || review.images;

  // Prepare update data
  const updateData = {
    rating,
    content,
    consent: consent !== undefined ? consent : review.consent, // Keep existing if not provided
    agreeRecommend:
      agreeRecommend !== undefined ? agreeRecommend : review.agreeRecommend, // Keep existing if not provided
    images: updatedImages,
    updatedAt: Date.now(),
  };

  const updatedReview = await Review.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedReview) {
    throw new Error("Review not found");
  }

  await recalcPhoneRating(updatedReview.phone);

  res.status(200).json({
    success: true,
    message: "Review updated successfully",
    data: updatedReview,
  });
});

// Xóa mềm một review
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const review = await Review.findById(reviewId);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  await review.deleteReview();
  await recalcPhoneRating(review.phone);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
    data: review,
  });
});

// Lấy tóm tắt đánh giá của một sản phẩm
const getReviewsSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone ID" });
  }

  const summary = await getReviewSummary(id); // Gọi từ service
  res.status(200).json(summary);
});

const toggleLikeReview = asyncHandler(async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res
        .status(400)
        .json({ success: false, message: "Review not found" });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }
    const likeIndex = review.likedBy.indexOf(userId);
    let message = "";

    if (likeIndex > -1) {
      review.likedBy.splice(likeIndex, 1);
      review.likes -= 1;
      message = "Toggled unlike on review successfully";
    } else {
      review.likedBy.push(userId);
      review.likes += 1;
      message = "Toggled like on review successfully";
    }

    review.likes = review.likedBy.length;

    const savedReview = await review.save();

    const populatedReview = await Review.findById(savedReview._id).populate(
      "likedBy",
      "username email"
    );

    res.status(200).json({
      success: true,
      message: message,
      data: populatedReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling like on review",
      error: error.message,
    });
  }
});

module.exports = {
  createReview,
  getReviewsByPhone,
  getReviewsByUser,
  updateReview,
  deleteReview,
  reviewRateLimiter,
  getReviewsSummary,
  toggleLikeReview,
};
