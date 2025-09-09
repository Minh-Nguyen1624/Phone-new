const Review = require("../model/reviewModel");
const Phone = require("../model/phoneModel");
const redis = require("redis");
const mongoose = require("mongoose");

// Khởi tạo Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

(async () => {
  client.on("error", (err) => console.error("Redis Client Error:", err));
  await client.connect(); // Kết nối trước khi sử dụng
})();

// Hàm tính lại rating và tổng số review
const recalcPhoneRating = async (phoneId) => {
  console.log("Recalculating rating for phone:", phoneId);
  try {
    const stats = await Review.aggregate([
      {
        $match: {
          phone: new mongoose.Types.ObjectId(phoneId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          totalRating: { $sum: "$rating" },
        },
      },
    ]);

    const updateData =
      stats.length > 0
        ? {
            averageRating: Number(
              (stats[0].totalRating / stats[0].totalReviews).toFixed(1)
            ),
            totalReviews: stats[0].totalReviews,
          }
        : { averageRating: 0, totalReviews: 0 };

    console.log("Update data:", updateData);
    await Phone.findByIdAndUpdate(phoneId, updateData, { new: true });
    if (client.isOpen) {
      await client.del(`review_summary:${phoneId}`);
    }
    return updateData;
  } catch (error) {
    console.error(`Error recalculating rating for phone ${phoneId}:`, error);
    throw error;
  }
};

// Hàm lấy tóm tắt đánh giá với caching
const getReviewSummary = async (phoneId) => {
  const cacheKey = `review_summary:${phoneId}`;
  const cached = await client.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const stats = await Review.aggregate([
      {
        $match: {
          phone: new mongoose.Types.ObjectId(phoneId),
          isDeleted: false,
        },
      },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]);

    const response = {
      success: true,
      data:
        !stats || stats.length === 0
          ? {
              averageRating: 0,
              totalReviews: 0,
              distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            }
          : {
              averageRating: Number(
                (
                  stats.reduce((acc, cur) => acc + cur._id * cur.count, 0) /
                  stats.reduce((acc, cur) => acc + cur.count, 0)
                ).toFixed(1)
              ),
              totalReviews: stats.reduce((acc, cur) => acc + cur.count, 0),
              distribution: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                ...Object.fromEntries(stats.map((s) => [s._id, s.count])),
              },
            },
    };

    if (client.isOpen) {
      await client.setEx(cacheKey, 300, JSON.stringify(response)); // Cache 5 phút
    }
    return response;
  } catch (error) {
    console.error(`Error fetching review summary for phone ${phoneId}:`, error);
    throw error;
  }
};

module.exports = { recalcPhoneRating, getReviewSummary };
