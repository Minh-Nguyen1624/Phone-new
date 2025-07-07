const express = require("express");

const {
  getAllDiscounts,
  getDiscountById,
  createDiscount,
  deleteDiscount,
  updateDiscount,
  toggleDiscountStatus,
  checkDiscountAvailability,
  applyDiscountToPhones,
} = require("../controller/discountController");

const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");
const router = express.Router();

// Lấy danh sách mã giảm giá (công khai hoặc yêu cầu đăng nhập tùy theo yêu cầu thực tế)
// router.get("/", getAllDiscounts);
router.get("/", protect, getAllDiscounts);

// Lấy chi tiết mã giảm giá theo ID (công khai hoặc yêu cầu đăng nhập tùy theo yêu cầu thực tế)
// router.get("/:id", getDiscountById);
router.get("/:id", protect, getDiscountById);

// Tạo mã giảm giá mới (chỉ admin)
// router.post("/add", createDiscount);
router.post("/add", protect, adminMiddleware, createDiscount);

// Cập nhật mã giảm giá (chỉ admin)
// router.put("/:id", updateDiscount);
router.put("/update/:id", protect, adminMiddleware, updateDiscount);

// Cập nhật mã giảm giá (chỉ admin)
// router.delete("/:id", deleteDiscount);
router.put("/delete/:id", protect, adminMiddleware, updateDiscount);

// Bật/tắt trạng thái mã giảm giá (chỉ admin)
// router.patch("/toggle/:id", toggleDiscountStatus);
router.patch(
  "/toggleStatusDiscount/:id",
  protect,
  adminMiddleware,
  toggleDiscountStatus
);

// Kiểm tra mã giảm giá khả dụng (người dùng đã đăng nhập)
// router.post("/check", checkDiscountAvailability);
router.post("/check", protect, checkDiscountAvailability);

// router.post("/apply-discount", applyDiscountToPhones);
// router.put("/apply-discount/:id", applyDiscountToPhones);
// Áp dụng mã giảm giá cho danh sách sản phẩm (chỉ admin)
router.post(
  "/apply-discount/:id",
  protect,
  adminMiddleware,
  applyDiscountToPhones
);

module.exports = router;
