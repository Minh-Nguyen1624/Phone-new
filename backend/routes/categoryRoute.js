const express = require("express");
const {
  getAllCategory,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} = require("../controller/categoryController");

const router = express.Router();

router.get("/all", getAllCategory);
router.get("/:id", getCategoryById);
router.post("/add", createCategory);
router.put("/update/:id", updateCategory);
router.delete("/deleted/:id", deleteCategory);
router.patch("/toggle/:id", toggleCategoryStatus);

module.exports = router;
