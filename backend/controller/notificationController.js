const Notification = require("../model/notificationModel");
const User = require("../model/userModel");
// const { io } = require("../server");
const cron = require("node-cron");
const i18n = require("i18n");
const mongoose = require("mongoose");

// Create a new notification
const createNotification = async (notificationData) => {
  try {
    // Kiểm tra các trường bắt buộc trước khi tạo
    const { user, title, message, scheduledAt } = notificationData;
    if (!mongoose.Types.ObjectId.isValid(user)) {
      throw new Error("Invalid user ObjectId");
    }
    if (!title || typeof title !== "string" || title.length > 100) {
      throw new Error(
        "Title is required and must be a string with max length 100"
      );
    }
    if (!message || typeof message !== "string" || message.length > 500) {
      throw new Error(
        "Message is required and must be a string with max length 500"
      );
    }
    if (!scheduledAt || isNaN(new Date(scheduledAt).getTime())) {
      throw new Error("scheduledAt is required and must be a valid date");
    }

    const notification = await Notification.create(notificationData);
    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create notification",
      error: error.message,
    };
  }
};

// Lấy thông báo của người dùng (hỗ trợ filter và giới hạn số lượng)
const getUserNotifications = async (req, res) => {
  try {
    // Lấy userId từ các nguồn khác nhau
    const userId =
      req.user?._id || req.params.userId || req.query.userId || req.body.user;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    const { isRead, limit = 50 } = req.query; // Lấy query string để filter và giới hạn số lượng

    const filter = { user: userId };
    if (isRead !== undefined) {
      filter.isRead = isRead === "true"; // Chuyển đổi isRead từ chuỗi sang boolean
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 }) // Thông báo mới nhất trước
      .limit(parseInt(limit)); // Giới hạn số lượng thông báo

    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

// Delete expired notifications
// Xoá thông báo hết hạn
const deleteExpiredNotifications = async (req, res) => {
  try {
    const now = new Date();
    const result = await Notification.deleteMany({ expiresAt: { $lte: now } });

    res.status(200).json({
      success: true,
      message: "Expired notifications deleted successfully",
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete expired notifications",
      error: error.message,
    });
  }
};

// Send global notification
const createGlobalNotification = async (req, res) => {
  try {
    const { title, message, type, priority, expiresAt, meta } = req.body;

    const notification = new Notification({
      isGlobal: true,
      title,
      message,
      type,
      priority,
      expiresAt,
      meta,
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: "Global notification created successfully",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create global notification",
      error: error.message,
    });
  }
};

const updateNotification = async (req, res) => {
  try {
    // Lấy ID thông báo từ params
    const { notificationId } = req.params;

    // Lọc các trường hợp lệ được phép cập nhật
    const allowedFields = [
      "title",
      "message",
      "type",
      "priority",
      "expiresAt",
      "meta",
    ];
    const updateData = Object.keys(req.body)
      .filter((key) => allowedFields.includes(key)) // Chỉ giữ các trường hợp lệ
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    // Nếu không có trường hợp lệ để cập nhật
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // // Cập nhật thông báo trong MongoDB
    // const notification = await Notification.findByIdAndUpdate(
    //   notificationId, // ID của thông báo cần cập nhật
    //   { $set: updateData }, // Sử dụng $set để chỉ cập nhật các trường chỉ định
    //   { new: true, runValidators: true } // Trả về tài liệu sau khi cập nhật, bật validate
    // );
    // Cập nhật thông báo trong MongoDB
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { $set: updateData }, // Chỉ cập nhật các trường trong `updateData`
      { new: true, runValidators: true }
    );

    // Kiểm tra nếu thông báo không tồn tại
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Trả về kết quả thành công
    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: notification,
    });
  } catch (error) {
    // Xử lý lỗi và trả về phản hồi
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

const getGlobalNotifications = async (req, res) => {
  try {
    // Lấy tham số phân trang từ query
    const {
      page = 1,
      limit = 50,
      sort = "-createdAt",
    } = req.query || req.body || req.params;
    // Tìm thông báo toàn hệ thống
    const notifications = await Notification.find({ isGlobal: true })
      .sort(sort) // Sắp xếp, mặc định là mới nhất trước
      .skip((page - 1) * limit) // Bỏ qua số lượng thông báo tương ứng với trang trước
      .limit(parseInt(limit)); // Giới hạn số lượng thông báo mỗi trang

    // Đếm tổng số thông báo toàn hệ thống
    const total = await Notification.countDocuments({ isGlobal: true });

    // Trả kết quả
    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching global notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch global notifications",
    });
  }
};

const getUserNotificationsWithPagination = async (req, res) => {
  try {
    const userId =
      req.user?._id || req.params.userId || req.query.userId || req.body.user;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    const { isRead, page = 1, limit = 50 } = req.query;

    // Bộ lọc tìm kiếm
    const filter = { user: userId }; // Tìm thông báo của user cụ thể
    if (isRead !== undefined) {
      filter.isRead = isRead === "true"; // Thêm điều kiện lọc thông báo đã đọc/chưa đọc
    }

    // Log thông tin gỡ lỗi
    // console.log("User ID:", userId);
    // console.log("Filter:", filter);
    // console.log("Pagination:", { page, limit });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit) // Bỏ qua các thông báo trước đó
      .limit(parseInt(limit))
      .populate("user", "username email"); // Thêm thông tin người dùng tương ứng

    // Tổng số thông báo (để hỗ trợ giao diện phân trang)
    const totalNotifications = await Notification.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: notifications,
      meta: {
        total: totalNotifications,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

const createBulkNotifications = async (notificationData) => {
  try {
    const { userIds, title, message, scheduledAt, ...rest } = notificationData;

    // Kiểm tra các trường bắt buộc
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("userIds must be a non-empty array");
    }
    for (const userId of userIds) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(`Invalid user ObjectId: ${userId}`);
      }
    }
    if (!title || typeof title !== "string" || title.length > 100) {
      throw new Error(
        "Title is required and must be a string with max length 100"
      );
    }
    if (!message || typeof message !== "string" || message.length > 500) {
      throw new Error(
        "Message is required and must be a string with max length 500"
      );
    }
    if (!scheduledAt || isNaN(new Date(scheduledAt).getTime())) {
      throw new Error("scheduledAt is required and must be a valid date");
    }

    const notifications = await Promise.all(
      userIds.map(async (userId) => {
        return await Notification.create({
          ...rest,
          user: userId,
          title,
          message,
          scheduledAt,
        });
      })
    );
    return {
      success: true,
      data: notifications,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create bulk notifications",
      error: error.message,
    };
  }
};

const markNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};
const updateBulkNotifications = async (req, res) => {
  try {
    const { notificationIds, updateData } = req.body;

    // Validate input
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Notification IDs are required and must be an array",
      });
    }

    const allowedFields = [
      "title",
      "message",
      "type",
      "priority",
      "expiresAt",
      "meta",
    ];
    const validUpdateData = Object.keys(updateData)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    if (Object.keys(validUpdateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: validUpdateData }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications updated successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
      error: error.message,
    });
  }
};

const getAdvancedNotifications = async (req, res) => {
  try {
    const userId = req.params._id || req.params.userId;
    // console.log(userId);
    const {
      isRead,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      order = "desc",
      search,
    } = req.query;

    const filter = { user: userId };
    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }
    if (search) {
      // filter.$text = { $search: search };
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { meta: { $regex: search, $options: "i" } },
      ];
    }

    // Gỡ lỗi bộ lọc
    // console.log("Filter:", filter);

    const notifications = await Notification.find(filter)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    //.populate('user', 'name email');

    // Gỡ lỗi kết quả trả về
    // console.log("Notifications:", notifications);

    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch advanced notifications",
      error: error.message,
    });
  }
};

const getNotificationStats = async (req, res) => {
  try {
    // const userId = req.user.id || req.params || req.body || req.query;
    const userId =
      req.user?._id || req.params.userId || req.query.userId || req.body.user;
    console.log(userId);
    const total = await Notification.countDocuments({ user: userId });
    console.log("Total notifications:", total);
    const read = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });
    console.log("Unread notifications:", read);
    const byType = await Notification.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      message: "Notification stats retrieved successfully",
      data: { total, read, byType },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification stats",
      error: error.message,
    });
  }
};

const scheduleNotification = async (req, res) => {
  const { user, title, message, type, priority, sendAt } = req.body;

  try {
    const notification = new Notification({
      user,
      title,
      message,
      type,
      priority,
      isScheduled: true,
      sendAt,
    });
    await notification.save();

    // Lên lịch gửi thông báo
    cron.schedule(new Date(sendAt), async () => {
      notification.isScheduled = false;
      notification.isSent = true;
      await notification.save();

      // Gửi thông báo qua socket hoặc email tại đây
    });

    res.status(201).json({
      success: true,
      message: "Scheduled notification created successfully",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to schedule notification",
      error: error.message,
    });
  }
};

const getNotificationStatistics = async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const readNotifications = await Notification.countDocuments({
      isRead: true,
    });
    const unreadNotifications = totalNotifications - readNotifications;
    const expiredNotifications = await Notification.countDocuments({
      expiresAt: { $lte: new Date() },
    });

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        totalNotifications,
        readNotifications,
        unreadNotifications,
        expiredNotifications,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
    });
  }
};

const createRecurringNotification = async (req, res) => {
  try {
    const { user, title, message, type, priority, meta, frequency } = req.body;

    if (!frequency || !user) {
      return res
        .status(400)
        .json({ error: "Frequency and User ID are required" });
    }

    const scheduledAt = new Date();

    // Tạo thông báo ban đầu
    const notification = new Notification({
      user,
      title,
      message,
      type,
      priority,
      isGlobal: false,
      meta,
      scheduledAt,
    });

    await notification.save();

    // Lập lịch thông báo định kỳ
    cron.schedule(frequency, async () => {
      const recurringNotification = new Notification({
        user,
        title,
        message,
        type,
        priority,
        isGlobal: false,
        meta,
        scheduledAt: new Date(),
      });

      await recurringNotification.save();
      console.log(`Recurring notification sent to user: ${user}`);
    });

    res.status(201).json({
      message: "Recurring notification created successfully",
      notification,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendLocalizedNotification = async (req, res) => {
  const { locale, user, titleKey, messageKey } = req.body;

  i18n.setLocale(locale); // Đặt ngôn ngữ cho thông báo

  const title = i18n.__(titleKey); // Lấy tiêu đề thông báo từ các tệp ngôn ngữ
  const message = i18n.__(messageKey); // Lấy nội dung thông báo từ các tệp ngôn ngữ

  const notification = new Notification({ user, title, message });
  await notification.save();

  res.status(201).json({
    success: true,
    message: "Localized notification sent",
    data: notification,
  });
};

module.exports = {
  createNotification,
  updateNotification,
  deleteNotification,
  getGlobalNotifications,
  getUserNotificationsWithPagination,
  createBulkNotifications,
  markNotificationsAsRead,
  getUserNotifications,
  markNotificationAsRead,
  updateBulkNotifications,
  deleteExpiredNotifications,
  createGlobalNotification,
  getAdvancedNotifications,
  getNotificationStats,
  createRecurringNotification,
  scheduleNotification,
  getNotificationStatistics,
  sendLocalizedNotification,
};
