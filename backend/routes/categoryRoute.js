const express = require("express");
const {
  getAllCategory,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  addMultipleCategory,
  getCategoryBySlug,
} = require("../controller/categoryController");

const {
  protect,
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

// router.get("/all", getAllCategory);
// router.get("/:id", getCategoryById);
// router.post("/add", protect, adminMiddleware, createCategory);
// router.put("/update/:id", updateCategory);
// router.delete("/deleted/:id", deleteCategory);
// router.patch("/toggle/:id", toggleCategoryStatus);

router.get("/all", getAllCategory);
// router.get("/categorySlug", getCategoryBySlug);
// Route để lấy danh mục theo slug (công khai)
router.get("/category/:categorySlug", getCategoryBySlug); // Đặt trước để ưu tiên khớp
router.get("/:id", protect, adminMiddleware, getCategoryById);
router.post("/add", protect, adminMiddleware, createCategory);
router.put("/update/:id", protect, adminMiddleware, updateCategory);
router.delete("/deleted/:id", protect, adminMiddleware, deleteCategory);
router.patch("/toggle/:id", protect, adminMiddleware, toggleCategoryStatus);
router.post("/add-multiple", protect, adminMiddleware, addMultipleCategory);

module.exports = router;
