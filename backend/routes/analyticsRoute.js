const express = require("express");
const {
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
} = require("../controller/analyticsController");
const router = express.Router();

const {
  adminMiddleware,
  protect,
  checkPermission,
} = require("../middleware/authMiddleware");

router.get("/", protect, adminMiddleware, getAllAnalytics);

router.post("/add", protect, createAnalytics);

router.put("/update/:id", protect, adminMiddleware, updateAnalytics);

router.delete("/delete/:id", protect, adminMiddleware, deleteAnalytics);

// router.get("/revenue-stats", getRevenueStats);
// router.get("/revenue-stats/:id", getRevenueStats);
router.get("/revenue-stats", protect, adminMiddleware, getRevenueStats);
// http://localhost:8080/api/analytics/revenue-stats?startDate=2025-06-01&endDate=2025-06-08

router.get("/:id", protect, adminMiddleware, getAnalyticsById);

// router.get("/stats/overview/:id", protect, adminMiddleware, getAnalyticsStats);
// http://localhost:8080/api/analytics/stats?startDate=2025-06-01&endDate=2025-06-08
router.get("/stats/overview", protect, adminMiddleware, getAnalyticsStats);
// router.get("/stats/overview", getAnalyticsStats);

// router.get("/advanced-stats/:id", protect, getAdvancedStats);
router.get("/advanced-stats", protect, adminMiddleware, getAdvancedStats);
// router.get("/advanced-stats", getAdvancedStats);

// router.post("/sync-session/:id", syncSessionWithUser);
// http://localhost:8080/api/analytics/sync-session
router.post("/sync-session", protect, adminMiddleware, syncSessionWithUser);
// router.post("/sync-session", syncSessionWithUser);

// router.get("/anomalies/detect", detectAnomalies);
// router.get("/detect-anomalies/:id", detectAnomalies);
router.get("/detect-anomalies", protect, adminMiddleware, detectAnomalies);

// // router.get("/revenue-stats", getRevenueStats);
// // router.get("/revenue-stats/:id", getRevenueStats);
// router.get("/revenue-stats", protect, adminMiddleware, getRevenueStats);
// // http://localhost:8080/api/analytics/revenue-stats?startDate=2025-06-01&endDate=2025-06-08

// // router.get("/best-selling-products", getBestSellingProducts);
// // router.get("/best-selling-products/:id", getBestSellingProducts);
router.get(
  "/best-selling-products",
  protect,
  adminMiddleware,
  getBestSellingProducts
);
// http://localhost:8080/api/analytics/best-selling-products?startDate=2025-06-01&endDate=2025-06-08

module.exports = router;
