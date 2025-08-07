const mongoose = require("mongoose");
const Reporter = require("../model/reportModel");
const User = require("../model/userModel");
const Product = require("../model/phoneModel");
const nodemailer = require("nodemailer");
const Order = require("../model/orderModel");
const Review = require("../model/reviewModel");
// const reportModel = require("../model/reportModel");
// const sendNotifications = require("../utils/sendNotification");
// require("dotenv").config({ path: "../.env" }); // Load biến môi trường từ .env
require("dotenv").config(); // Load biến môi trường từ .env

const reportReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { subject, details, priority, category } = req.body;

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }
    const userId = req.user.id;

    // Kiểm tra xem review có tồn tại không
    const review = await Review.findById(reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    // Tạo báo cáo mới
    const report = new Reporter({
      reportedBy: userId,
      subject,
      details,
      status: "open",
      priority,
      category,
      reportedReview: reviewId,
      reportedModel: "Review",
    });

    const savedReport = await report.save();

    // Thông báo người báo cáo
    const user = await User.findById(userId);
    if (user) {
      await sendNotification(
        user.email,
        "New report created",
        `You have received a new report: ${savedReport.subject}`
      );
    }

    return res.status(201).json({
      success: true,
      message: "Report created successfully",
      data: savedReport,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create report",
      error: error.message,
    });
  }
};
// Hàm gửi email thông báo
const sendNotification = async (email, subject, message) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Missing email credentials");
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      // from: '"Your App" <your-email@gmail.com>',
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: message,
      html: `<p>${message}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification sent to ${email}`);
  } catch (error) {
    console.error("Failed to send email:", error.message);
    throw new Error("Unable to send email notification.");
  }
};

const createReport = async (req, res) => {
  try {
    const {
      reportedBy,
      subject,
      details,
      status,
      priority,
      category,
      reportedSubject,
      reportedModel,
    } = req.body;

    // Kiểm tra người báo cáo có tồn tại
    const user = await User.findById(reportedBy);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Reporter not found.",
      });
    }

    // Kiểm tra giá trị hợp lệ của reportedModel
    if (!["Product", "Order", "User", "Other"].includes(reportedModel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reportedModel.",
      });
    }

    // Kiểm tra giá trị hợp lệ của reportedModel
    const validModels = ["Product", "Order", "User", "Other", "Review"];
    if (!validModels.includes(reportedModel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reportedModel.",
      });
    }

    // Define model mapping
    const modelMapping = {
      Product: Product, // Product is imported from phoneModel
      User: User,
      // 'Order': Order,  // Uncomment and add Order model if needed
      Review: Review, // Review is imported from reviewModel
    };

    // Kiểm tra đối tượng báo cáo nếu `reportedModel` không phải là "Other"
    if (reportedModel !== "Other") {
      if (!reportedSubject) {
        return res.status(400).json({
          success: false,
          message: "reportedSubject is required.",
        });
      }
      const Model = modelMapping[reportedModel];

      // Check if model exists in mapping
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: `Model ${reportedModel} is not configured in the system.`,
        });
      }

      // // Validate reportedSubject
      // if (!reportedSubject) {
      //   return res.status(400).json({
      //     success: false,
      //     message:
      //       "reportedSubject is required when reportedModel is not 'Other'.",
      //   });
      // }

      // Check if the reported entity exists
      const reportedEntity = await Model.findById(reportedSubject);
      if (!reportedEntity) {
        return res.status(404).json({
          success: false,
          message: `${reportedModel} with ID ${reportedSubject} not found.`,
        });
      }
    }

    // Validate required fields
    if (!subject || !details || !category) {
      return res.status(400).json({
        success: false,
        message: "Subject, details, and category are required fields.",
      });
    }

    // Set default values if not provided
    const defaultStatus = "pending";
    const defaultPriority = "medium";

    const report = new Reporter({
      reportedBy,
      subject,
      details,
      // status,
      // priority,
      // status: status || defaultStatus,
      status: status || "open",
      // priority: priority || defaultPriority,
      priority: priority || "medium",
      category,
      // reportedSubject,
      reportedSubject: reportedModel === "Other" ? null : reportedSubject,
      reportedModel,
    });

    await report.save();
    res.status(201).json({
      success: true,
      message: "Report created successfully.",
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to create report. Please check the inputs and try again.",
      error: error.message,
    });
  }
};

const getAllReports = async (req, res) => {
  try {
    // const { category, priority, status } = req.query;
    const { category, priority, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    // const limit = parseInt(req.query.limit) || 10; // Số kết quả mỗi trang (mặc định là 10)
    // const page = parseInt(req.query.page) || 1; // Trang hiện tại (mặc định là 1)
    // const reports = await Reporter.find()
    const reports = await Reporter.find(filter)
      .populate("reportedBy", "username email")
      // .populate("reportedSubject")
      // .populate({
      //   path: "reportedSubject",
      //   populate: { path: "reportedBy", select: "username email" }, // Lấy thêm thông tin người báo cáo
      // })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalReports = await Reporter.countDocuments(filter);
    res.status(200).json({
      success: true,
      message: "Reports retrieved successfully.",
      data: reports,
      pagitions: {
        total: totalReports,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalReports / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve reports.",
      error: error.message,
    });
  }
};

const getReportById = async (req, res) => {
  try {
    const id = req.params.id;

    const report = await Reporter.findById(id).populate(
      "reportedBy",
      "username email"
    );
    // .populate("reportedSubject");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Report retrieved successfully.",
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve report.",
      error: error.message,
    });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    // Kiểm tra giá trị status hợp lệ
    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }
    const report = await Reporter.findByIdAndUpdate(
      id,
      {
        status,
      },
      {
        new: true, // Trả về tài liệu đã được cập nhật
        runValidators: true, // Kiểm tra các điều kiện của schema});
      }
    );
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }
    // if (report.status === status) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Report is already in this status.",
    //   });
    // }
    // report.status = status;
    // await report.save();

    // Gửi thông báo cho người báo cáo
    const user = await User.findById(report.reportedBy);
    if (user) {
      await sendNotification(
        user.email,
        "Report Status Updated",
        `Your report is now ${status}.`
      );
    }

    res.status(200).json({
      success: true,
      message: "Report status updated successfully.",
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update report status.",
      error: error.message,
    });
  }
};

const deleteReport = async (req, res) => {
  try {
    const id = req.params.id;
    const report = await Reporter.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete report.",
      error: error.message,
    });
  }
};

const getReportByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const report = await Reporter.find({ reportedBy: userId })
      .populate("reportedBy", "username email")
      .sort({ createdAt: -1 });

    if (!report || report.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No reports found for this user.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Reports retrieved successfully.",
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve reports.",
      error: error.message,
    });
  }
};

const generateReportStatistics = async (req, res) => {
  try {
    const { status, priority, category } = req.params;

    // Tạo bộ lọc cho truy vấn
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    // Thống kê theo trạng thái
    const reportStatusCount = await Reporter.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Thống kê theo nâng cao
    const reportPriorityCount = await Reporter.aggregate([
      { $match: filter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    // Thống kê theo loại báo cáo
    const reportCategoryCount = await Reporter.aggregate([
      { $match: filter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      message: "Report statistics retrieved successfully.",
      data: {
        reportStatusCount,
        reportPriorityCount,
        reportCategoryCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate report statistics.",
      error: error.message,
    });
  }
};

const createAutomaticReport = async (productId) => {
  try {
    const product = await Phone.findById(productId);
    if (!product) {
      console.error("Product not found.");
      return;
    }

    // Giả sử bạn kiểm tra số lượng khiếu nại cho sản phẩm
    const complaintsCount = await Complaint.countDocuments({
      product: productId,
    });

    if (complaintsCount >= 10) {
      // Tạo báo cáo tự động
      const report = new Reporter({
        reportedBy: product.seller,
        reportedSubject: product._id,
        content: `Product "${product.name}" has received too many complaints. Please check and resolve the issue.`,
        status: "open",
        priority: "high",
        category: "product",
      });
      await report.save();
    }
  } catch (error) {
    console.error("Failed to create automatic report:", error.message);
  }
};

const createCancelledOrderReport = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      console.error("Order not found.");
      return;
    }

    if (order.status === "cancelled") {
      // Tạo báo cáo
      const report = new Reporter({
        reportedBy: order.customer,
        reportedSubject: order._id,
        reportedModel: "order",
        subject: `Order ${orderId} has been cancelled`,
        content: `Order "${order.id}" has been cancelled. Please review the issue and resolve it.`,
        status: "open",
        priority: "high",
        category: "order",
        details: `The order has been cancelled due to issues with stock or customer request.`,
      });
      await report.save();
    }
  } catch (error) {
    console.error("Failed to create cancelled order report:", error.message);
  }
};

module.exports = {
  createReport,
  getAllReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  reportReview,
  sendNotification,
  getReportByUser,
  generateReportStatistics,
  createAutomaticReport,
  createCancelledOrderReport,
};
