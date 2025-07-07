const express = require("express");
const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  addPermissions,
  removePermissions,
  getAllPermissions,
  assignRoleToUser,
} = require("../controller/roleController");

const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new role

router.post("/add", protect, adminMiddleware, createRole);

// Get all roles

router.get("/all", protect, getAllRoles);

// Get a role by id
router.get("/:id", protect, getRoleById);

// Update a role

router.put("/update/:id", protect, adminMiddleware, updateRole);

// Delete a role

router.delete("/delete/:id", protect, adminMiddleware, deleteRole);

// Add permissions to a role

router.post("/:id/add-permissions", protect, adminMiddleware, addPermissions);

// Remove permissions from a role

router.delete(
  "/:id/remove-permissions",
  protect,
  adminMiddleware,
  removePermissions
);

// Get all permissions
router.get("/permissions", protect, adminMiddleware, getAllPermissions);
// Assign a role to a user
router.post("/assign-role/:userId", protect, adminMiddleware, assignRoleToUser);

module.exports = router;
