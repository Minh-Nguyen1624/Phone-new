const express = require("express");
const {
  createPremission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  bulkCreatePermissions,
} = require("../controller/permissionController");

const router = express.Router();

const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");

// Create a new permission

router.post("/add", protect, createPremission);

// Get all permissions

router.get("/all", protect, getAllPermissions);

// Get a single permission by ID

router.get("/:id", protect, getPermissionById);

// Update a permission by ID

router.put("/update/:id", protect, updatePermission);

// Delete a permission by ID

router.delete("/delete/:id", protect, deletePermission);

// Bulk create permissions
router.post("/bulk-create", protect, bulkCreatePermissions);
module.exports = router;
