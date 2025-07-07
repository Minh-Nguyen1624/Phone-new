const express = require("express");
const {
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
  scheduleNotification,
  getNotificationStatistics,
  sendLocalizedNotification,
} = require("../controller/notificationController");
const router = express.Router();
const app = express();

router.post("/add", createNotification);
// router.put("/update/:id", updateNotification);
router.put("/update/:notificationId", updateNotification);

router.put("/update/bulk", updateBulkNotifications);

router.delete("/delete/:notificationId", deleteNotification);
// router.delete("/delete/:id", deleteNotification);

router.get("/global", getGlobalNotifications);

router.get("/", getUserNotificationsWithPagination);
// router.get("/user/:userId", getUserNotificationsWithPagination);

router.post("/bulk", createBulkNotifications);

router.patch("/mark-many-as-read", markNotificationsAsRead);
// router.patch("/mark-as-read/:userId", markNotificationsAsRead);

router.get("/user/:userId/all", getUserNotifications);

router.patch("/mark-as-read/:notificationId", markNotificationAsRead);
// router.patch("/read/:userId/:notificationId", markNotificationAsRead);

router.delete("/expired", deleteExpiredNotifications);

router.post("/global/add", createGlobalNotification);

router.get("/advanced/:_id", getAdvancedNotifications);
// router.get("/advanced/:userId", getAdvancedNotifications);

router.get("/stats/:userId?", getNotificationStats);

router.post("/schedule", scheduleNotification);
// router.post("/schedule/:userId", scheduleNotification);

router.get("/statistics", getNotificationStatistics);
// router.get("/statistics/:userId", getNotificationStatistics);

router.post("/send-localized", sendLocalizedNotification);

module.exports = router;
