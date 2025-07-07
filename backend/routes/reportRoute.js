const express = require("express");
const {
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
} = require("../controller/reportController");
const app = express();
const router = express.Router();

router.get("/", getAllReports);
router.get("/:id", getReportById);
router.post("/add", createReport);
router.put("/update/:id", updateReportStatus);
router.delete("/delete/:id", deleteReport);

// router.post("/:id/review", reportReview);
router.post("/review/:id", reportReview);

router.post("/:id/notification", sendNotification);

router.get("/user/:userId", getReportByUser);

router.get("/stats", generateReportStatistics);

router.post("/automatic", createAutomaticReport);

router.post("/cancelled-order", createCancelledOrderReport);

module.exports = router;
