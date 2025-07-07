const Analytics = require("../model/analyticsModel");
const Order = require("../model/orderModel");
const Payment = require("../model/paymentModel");
const asyncHandler = require("express-async-handler");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

// Tạo mới một bản ghi phân tích
const createAnalytics = async (req, res) => {
  try {
    console.log("Creating analytics record:", req.body);
    const analyticsData = req.body;

    // Kiểm tra và chuẩn hóa dữ liệu
    if (
      !analyticsData.sessionId ||
      !/^[a-z0-9-]{36}$/i.test(analyticsData.sessionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Session ID là bắt buộc và phải là UUID hợp lệ (36 ký tự).",
      });
    }

    if (!analyticsData.page) {
      return res.status(400).json({
        success: false,
        message: "Page là bắt buộc.",
      });
    }

    const analytics = await Analytics(analyticsData);
    const savedAnalytics = await analytics.save();

    res.status(201).json({
      success: true,
      message: "Tạo bản ghi phân tích thành công.",
      data: savedAnalytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating analytics",
      error: error.message,
    });
  }
};

const getAllAnalytics = async (req, res) => {
  try {
    const {
      sessionId,
      user,
      action,
      page,
      geoCountry,
      geoCity,
      deviceType,
      referrer,
      startDate,
      endDate,
      sortBy = "timestamp",
      order = "desc",
      limit = 10,
      pageNumber = 1,
    } = req.params;

    // Lọc dữ liệu dựa trên query params
    const filters = {};
    if (sessionId) filters.sessionId = sessionId;
    if (user) filters.user = user;
    if (action) filters.action = action;
    if (page) filters.page = page;

    // Lọc theo GeoIP
    if (geoCountry) filters["geoLocation.country"] = geoCountry;
    if (geoCity) filters["geoLocation.city"] = geoCity;

    // Lọc theo thiết bị
    if (deviceType) filters.deviceType = deviceType;

    // Lọc theo nguồn truy cập
    if (referrer) filters.referrer = referrer;

    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const skip = (pageNumber - 1) * limit;

    const analyticsList = await Analytics.find(filters)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 }) // Sắp xếp
      .limit(Number(limit))
      .skip(Number(skip))
      .populate("user", "username email") // Lấy thông tin người dùng
      // .populate("product", "name price")
      .populate("phone", "name price")
      // .populate("cartId", "total items")
      .populate("cart", "total items")
      .populate({
        path: "order", // Populate order
        select: "orderStatus items user shippingInfo totalAmount", // Lấy các trường cần thiết từ order
        populate: [
          {
            path: "items.phone", // Populate chi tiết sản phẩm (phone) trong order
            select: "name brand price imageUrl", // Các trường cụ thể trong phone
          },
          {
            path: "user", // Populate thông tin người dùng từ order
            select: "username email", // Các trường cụ thể trong user
          },
        ],
      });

    const totalRecords = await Analytics.countDocuments(filters); // Tổng số bản ghi

    res.status(200).json({
      success: true,
      message: "Lấy danh sách phân tích thành công.",
      data: analyticsList,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: Number(pageNumber),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting analytics",
      error: error.message,
    });
  }
};

// Lấy chi tiết một bản ghi phân tích theo ID
const getAnalyticsById = async (req, res) => {
  try {
    const { id } = req.params;
    const analytics = await Analytics.findById(id)
      .populate("user", "username email")
      .populate("phone", "name price specifications")
      .populate("cart", "total items")
      // .populate("order", "status total");
      .populate({
        path: "order", // Populate order
        select: "orderStatus items user shippingInfo totalAmount", // Lấy các trường cần thiết từ order
        populate: [
          {
            path: "items.phone", // Populate chi tiết sản phẩm (phone) trong order
            select: "name brand price imageUrl", // Các trường cụ thể trong phone
          },
          {
            path: "user", // Populate thông tin người dùng từ order
            select: "username email", // Các trường cụ thể trong user
          },
        ],
      });

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bản ghi phân tích.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy thông tin phân tích thành công.",
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin phân tích.",
      error: error.message,
    });
  }
};

// Cập nhật một bản ghi phân tích
const updateAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedAnalytics = await Analytics.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedAnalytics) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bản ghi phân tích để cập nhật.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật bản ghi phân tích thành công.",
      data: updatedAnalytics,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Lỗi khi cập nhật bản ghi phân tích.",
      error: error.message,
    });
  }
};

// Xóa một bản ghi phân tích
const deleteAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAnalytics = await Analytics.findByIdAndDelete(id);

    if (!deletedAnalytics) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bản ghi phân tích để xóa.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa bản ghi phân tích thành công.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa bản ghi phân tích.",
      error: error.message,
    });
  }
};

// Thống kê tổng quan (thống kê các hành động phổ biến, số lượt truy cập, v.v.)
const getAnalyticsStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const stats = await Analytics.aggregate([
      { $match: filters },
      {
        $group: {
          _id: "$action",
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      message: "Thống kê phân tích thành công.",
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi thống kê phân tích.",
      error: error.message,
    });
  }
};

const detectAnomalies = async () => {
  try {
    const threshold = 100; // Số hành động/ngưỡng bất thường
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const anomalies = await Analytics.aggregate([
      { $match: { timestamp: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: "$ipAddress",
          totalActions: { $sum: 1 },
        },
      },
      { $match: { totalActions: { $gte: threshold } } },
    ]);

    if (anomalies.length > 0) {
      console.log("Phát hiện bất thường:", anomalies);
      // Gửi thông báo qua email/slack nếu cần
    }
  } catch (error) {
    console.error("Lỗi phát hiện bất thường:", error.message);
  }
};

// Đặt lịch chạy cron job
setInterval(detectAnomalies, 60 * 60 * 1000); // Mỗi giờ chạy một lần

const getAdvancedStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "action" } = req.query;

    const filters = {};
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const stats = await Analytics.aggregate([
      { $match: filters },
      {
        $group: {
          _id: `$${groupBy}`, // Nhóm theo action, deviceType, geoLocation.country
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      message: "Thống kê nâng cao thành công.",
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi thống kê nâng cao.",
      error: error.message,
    });
  }
};

const syncSessionWithUser = async (req, res) => {
  try {
    const { sessionId, userId } = req.body;

    const updated = await Analytics.updateMany(
      { sessionId },
      { $set: { user: userId } }
    );

    const formattedData = {
      n: updated.matchedCount,
      nModified: updated.modifiedCount,
      ok: updated.acknowledged,
    };
    res.status(200).json({
      success: true,
      message: "Đồng bộ session với user thành công.",
      // data: updated,
      data: formattedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi đồng bộ session với user.",
      error: error.message,
    });
  }
};

const WebSocketServer = new WebSocket.Server({ port: 8081 });

WebSocketServer.on("connection", (socket) => {
  console.log("Kết nối WebSocket thành công.");

  socket.on("message", async (message) => {
    try {
      const analytics = JSON.parse(message);

      // Kiểm tra dữ liệu hợp lệ
      if (!analytics.sessionId) {
        return socket.send(
          JSON.stringify({ type: "error", message: "Session ID là bắt buộc." })
        );
      }

      const newAnalytics = new Analytics(analytics);
      const savedAnalytics = await newAnalytics.save();

      WebSocketServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({ type: "new_analytics", data: savedAnalytics })
          );
        }
      });
    } catch (error) {
      console.error("Lỗi khi xử lý WebSocket message:", error.message);
      socket.send(JSON.stringify({ type: "error", message: error.message }));
    }
  });
});

// Thống kê doanh thu từ Order
// Lấy báo cáo doanh thu tổng quát từ Payment
const getRevenueStats = asyncHandler(async (req, res) => {
  try {
    if (!Order || typeof Order.aggregate !== "function") {
      return res.status(500).json({
        success: false,
        message: "Model Order không được định nghĩa hoặc không hợp lệ.",
      });
    }

    const { startDate, endDate, paymentStatus } = req.query;
    const filters = {};

    // Validate dates
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "startDate không hợp lệ.",
      });
    }
    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "endDate không hợp lệ.",
      });
    }

    // Xử lý paymentStatus, mặc định chỉ lấy Completed
    const validPaymentStatuses = paymentStatus
      ? paymentStatus.split(",").map((status) => status.trim())
      : ["Completed"]; // Changed default to only Completed
    filters.$or = validPaymentStatuses.map((status) => ({
      paymentStatus: status,
    }));

    if (startDate || endDate) {
      filters.estimatedDeliveryDate = {};
      if (startDate) filters.estimatedDeliveryDate.$gte = new Date(startDate);
      if (endDate) filters.estimatedDeliveryDate.$lte = new Date(endDate);
    }

    const revenueStats = await Order.aggregate([
      { $match: filters },
      {
        $project: {
          totalAmount: {
            $subtract: [
              { $add: ["$subTotal", "$shippingFee"] },
              { $ifNull: ["$discountAmount", 0] },
            ],
          },
          totalCost: { $ifNull: ["$totalCost", 0] },
          orderId: "$_id", // Include order ID (replace with '$orderNumber' if needed)
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalCost: { $sum: "$totalCost" },
          totalProfit: { $sum: { $subtract: ["$totalAmount", "$totalCost"] } },
          totalOrders: { $sum: 1 },
          orderIds: { $push: "$orderId" },
        },
      },
    ]).exec();

    const result =
      revenueStats.length > 0
        ? revenueStats[0]
        : {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalOrders: 0,
            orderIds: [],
          };

    res.status(200).json({
      success: true,
      message: "Thống kê doanh thu thành công.",
      data: result,
    });
  } catch (error) {
    console.error("Error in getRevenueStats:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi thống kê doanh thu.",
      error: error.message,
    });
  }
});

const getRevenueReport = async (req, res) => {
  try {
    if (!Payment || typeof Payment.aggregate !== "function") {
      return res.status(500).json({
        success: false,
        message: "Model Payment không được định nghĩa hoặc không hợp lệ.",
      });
    }

    const { startDate, endDate, paymentMethod } = req.query;
    const matchConditions = {
      paymentStatus: "Completed",
      isRefunded: { $ne: true },
    };

    if (startDate && endDate) {
      matchConditions.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      matchConditions.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      matchConditions.createdAt = { $lte: new Date(endDate) };
    }

    if (paymentMethod) {
      matchConditions.paymentMethod = paymentMethod;
    }

    const revenueReport = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            paymentMethod: "$paymentMethod",
          },
          totalRevenue: { $sum: "$amount" },
          refundAmount: { $sum: { $ifNull: ["$refundAmount", 0] } },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.paymentMethod",
          dailyRevenue: { $push: { date: "$_id.day", total: "$totalRevenue" } },
          totalRevenue: { $sum: "$totalRevenue" },
          totalRefund: { $sum: "$refundAmount" },
          netRevenue: {
            $sum: { $subtract: ["$totalRevenue", "$refundAmount"] },
          },
          transactionCount: { $sum: "$transactionCount" },
        },
      },
      {
        $project: {
          paymentMethod: "$_id",
          dailyRevenue: 1,
          totalRevenue: 1,
          totalRefund: 1,
          netRevenue: 1,
          transactionCount: 1,
          _id: 0,
        },
      },
      { $sort: { paymentMethod: 1 } },
    ]);

    const overallRevenue = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalRefund: { $sum: { $ifNull: ["$refundAmount", 0] } },
          netRevenue: {
            $sum: { $subtract: ["$amount", { $ifNull: ["$refundAmount", 0] }] },
          },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: overallRevenue[0] || {
          totalRevenue: 0,
          totalRefund: 0,
          netRevenue: 0,
          transactionCount: 0,
        },
        byPaymentMethod: revenueReport,
      },
      message: "Revenue report retrieved successfully",
    });
  } catch (error) {
    console.error("Error generating revenue report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve revenue report",
      error: error.message,
    });
  }
};

// Lấy thống kê doanh thu theo thời gian thực
const getRealTimeRevenue = async (req, res) => {
  try {
    if (!Payment || typeof Payment.aggregate !== "function") {
      return res.status(500).json({
        success: false,
        message: "Model Payment không được định nghĩa hoặc không hợp lệ.",
      });
    }

    const { interval = "daily" } = req.query;
    let groupBy;

    switch (interval.toLowerCase()) {
      case "hourly":
        groupBy = {
          $hour: { $toDate: "$createdAt" },
          $dayOfMonth: { $toDate: "$createdAt" },
          $month: { $toDate: "$createdAt" },
          $year: { $toDate: "$createdAt" },
        };
        break;
      case "monthly":
        groupBy = {
          $month: { $toDate: "$createdAt" },
          $year: { $toDate: "$createdAt" },
        };
        break;
      default:
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const revenueStats = await Payment.aggregate([
      {
        $match: {
          paymentStatus: "Completed",
          isRefunded: { $ne: true },
          createdAt: { $lte: new Date() }, // Đến 01:13 PM, 09/06/2025
        },
      },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: revenueStats,
      message: `Real-time revenue stats by ${interval} interval`,
    });
  } catch (error) {
    console.error("Error generating real-time revenue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve real-time revenue",
      error: error.message,
    });
  }
};

// Lấy thống kê trạng thái thanh toán
const getPaymentStatusStats = async (req, res) => {
  try {
    if (!Payment || typeof Payment.aggregate !== "function") {
      return res.status(500).json({
        success: false,
        message: "Model Payment không được định nghĩa hoặc không hợp lệ.",
      });
    }

    const statusStats = await Payment.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          paymentStatus: "$_id",
          count: 1,
          totalAmount: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: statusStats,
      message: "Payment status statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error generating payment status stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve payment status statistics",
      error: error.message,
    });
  }
};

const getBestSellingProducts = async (req, res) => {
  try {
    // Kiểm tra xem model Order có tồn tại không
    if (!Order) {
      return res.status(500).json({
        success: false,
        message: "Model Order không được định nghĩa hoặc không kết nối.",
      });
    }

    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.timestamp = { $gte: new Date(startDate) };
    if (endDate)
      filters.timestamp = { ...filters.timestamp, $lte: new Date(endDate) };

    // const bestSellingProducts = await Order.aggregate([
    //   { $match: filters },
    //   { $unwind: "$items" }, // Tách từng sản phẩm trong đơn hàng
    //   {
    //     $group: {
    //       _id: "$items.productId",
    //       totalSold: { $sum: "$items.quantity" },
    //     },
    //   },
    //   { $sort: { totalSold: -1 } }, // Sắp xếp sản phẩm bán chạy nhất
    // ]);
    const bestSellingProducts = await Order.aggregate([
      { $match: filters },
      { $unwind: "$items" }, // Tách từng sản phẩm trong mảng items
      {
        $group: {
          _id: "$items.phone", // Sử dụng $items.phone thay vì productId
          totalSold: { $sum: "$items.quantity" },
        },
      },
      {
        $lookup: {
          from: "phones", // Tên collection của Phone
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" }, // Tách mảng productDetails
      {
        $project: {
          productId: "$_id",
          productName: "$productDetails.name",
          productPrice: "$productDetails.price",
          totalSold: 1,
        },
      },
      { $sort: { totalSold: -1 } }, // Sắp xếp sản phẩm bán chạy nhất
      { $limit: 10 }, // Giới hạn top 10
    ]).exec();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm bán chạy thành công.",
      data: bestSellingProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy sản phẩm bán chạy.",
      error: error.message,
    });
  }
};

module.exports = {
  createAnalytics,
  getAllAnalytics,
  getAnalyticsById,
  updateAnalytics,
  deleteAnalytics,
  getAnalyticsStats,
  getAdvancedStats,
  syncSessionWithUser,
  WebSocketServer,
  detectAnomalies,
  getRevenueStats,
  getBestSellingProducts,
};
