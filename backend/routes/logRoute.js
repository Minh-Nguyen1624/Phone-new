const express = require("express");
const {
  createdLog, // Tạo log mới
  getAllLogs, // Lấy tất cả logs
  getLogById, // Lấy log theo id
  updateLogById, // Cập nhật log
  deleteBlogById, // Xóa log
  filterLogs, // Lọc logs
  exportLogs, // Xuất logs ra file csv
  deleteLogsByDate, // Xóa logs theo ngày
  getPaginatedLogs, // Lấy logs theo trang
  markLogAsResolved, // Đánh dấu log đã giải quyết
  aggregateLogs, // Tổng hợp logs
  searchLogs, // Tìm kiếm logs
} = require("../controller/logController");
const router = express.Router();

router.get("/", getAllLogs);
router.get("/:id", getLogById);
router.post("/add", createdLog);
router.put("/update/:id", updateLogById);
router.delete("/delete/:id", deleteBlogById);
router.get("/filter", filterLogs);
router.get("/export", exportLogs);
// router.get('/page/:page/limit/:limit', getPaginatedLogs);
router.delete("/delete-by-date", deleteLogsByDate);
router.get("/paginate", getPaginatedLogs);
router.put("/mark-resolved/:id", markLogAsResolved);
router.get("/aggregate", aggregateLogs);
router.get("/search/:keywords", searchLogs);

module.exports = router;
