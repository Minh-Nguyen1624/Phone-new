const express = require("express");
const {
  addPhones,
  getPhones,
  addMultiplePhones,
  getPhoneById,
  updatePhones,
  deletePhones,
  searchPhones,
  filterByCategory,
  // applyDiscountToPhones,
  getStatistics,
  deleteMultiplePhones,
  exportPhones,
  // likePhone,
  // unlikePhone,
  toggleLikePhone,
  purchasePhone,
  getSoldQuantity,
} = require("../controller/phoneController");
const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");
// const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// Thêm một sản phẩm mới
// router.post("/add", addPhones);
router.post("/add", protect, adminMiddleware, addPhones);

// Thêm nhiều sản phẩm cùng lúc
// router.post("/multiple", addMultiplePhones);
router.post("/multiple", protect, adminMiddleware, addMultiplePhones);

router.get("/", getPhones);

// Filter phones by category
//  http://localhost:8080/api/phones/filter?category=Smartphone&name=iPhone
router.get("/filter", filterByCategory);
// router.get("/filter/category", filterByCategory);

// Export phones data
// Xuất dữ liệu sản phẩm
// router.get("/export", exportPhones);
router.get("/export", protect, adminMiddleware, exportPhones);

// Get statistics about phones
// Lấy thống kê về sản phẩm
// router.get("/statistics", getStatistics);
router.get("/statistics", protect, adminMiddleware, getStatistics);

// Search phones by query
router.get("/search", searchPhones);
// router.get("/search/:id", searchPhones);

router.get("/:id", getPhoneById);

// Cập nhật thông tin sản phẩm theo ID
// router.put("/update/:id", updatePhones);
router.put("/update/:id", protect, adminMiddleware, updatePhones);

// Xóa một sản phẩm theo ID
// router.delete("/delete/:id", deletePhones);
router.delete("/delete/:id", protect, adminMiddleware, deletePhones);

// Xóa nhiều sản phẩm cùng lúc
// router.delete("/multiple", deleteMultiplePhones);
router.delete("/multiple", protect, adminMiddleware, deleteMultiplePhones);

// Apply a discount to multiple phones
// router.post("/apply-discount", applyDiscountToPhones);

// router.post("/like/:phoneId", likePhone);
// router.post("/like/:id", likePhone);
// Thích một sản phẩm
// // router.post("/:id/like", authMiddleware, likePhone);
// router.post("/:id/like", protect, likePhone);

// // router.post("/:id/unlike", unlikePhone);
// // Bỏ thích một sản phẩm
// // router.post("/:id/unlike", authMiddleware, unlikePhone);
// router.post("/:id/unlike", protect, unlikePhone);

router.post("/:id/like", protect, toggleLikePhone);

// Mua sản phẩm
// router.post("/:id/purchase", purchasePhone);
router.post("/:id/purchase", protect, purchasePhone);

// router.get("/:id/sold", protect, getSoldQuantity);
router.get("/:id/sold", getSoldQuantity);

module.exports = router;
