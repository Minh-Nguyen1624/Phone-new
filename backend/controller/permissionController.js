const Permission = require("../model/permissionModel");
const mongoose = require("mongoose");

const createPremission = async (req, res) => {
  try {
    // const { permissionName, description, isActive } = req.params;
    const { permissionName, description, isActive } = req.body;

    // Check if permission name already exists
    const existingPermission = await Permission.findOne({ permissionName });
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: "Permission name already exists",
      });
    }

    const newPermission = new Permission({
      permissionName,
      description,
      isActive,
    });
    const savedPermission = await newPermission.save();
    res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: savedPermission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating permission",
      error: error.message,
    });
  }
};

const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.status(200).json({
      success: true,
      message: "Permissions retrieved successfully",
      data: permissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching permissions",
      error: error.message,
    });
  }
};

const getPermissionById = async (req, res) => {
  const { id } = req.params;

  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID",
    });
  }
  try {
    // const permission = await Permission.findById(req.params.id);
    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Permission retrieved successfully",
      data: permission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching permission",
      error: error.message,
    });
  }
};

const updatePermission = async (req, res) => {
  const { id } = req.params;

  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID",
    });
  }
  try {
    const { permissionName, description, isActive } = req.body;
    const updatedPermission = await Permission.findByIdAndUpdate(
      //   req.params.id,
      id,
      { permissionName, description, isActive },
      { new: true }
    );

    if (!updatedPermission) {
      return res.status(404).json({
        success: false,
        message: `Permission with ID ${id} not found`,
      });
    }

    res.status(200).json({
      success: true,
      message: "Permission updated successfully",
      data: updatedPermission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating permission",
      error: error.message,
    });
  }
};

const deletePermission = async (req, res) => {
  const { id } = req.params;

  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID",
    });
  }
  try {
    const deletedPermission = await Permission.findByIdAndDelete(id);

    if (!deletedPermission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Permission deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting permission",
      error: error.message,
    });
  }
};

const bulkCreatePermissions = async (req, res) => {
  try {
    const permissonData = req.body;
    if (!Array.isArray(permissonData) || permissonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission data",
      });
    }

    const newPermissions = permissonData.map((permission) => ({
      permissionName: permission.permissionName.trim(),
      description: permission.description.trim(),
      isActive: permission.isActive !== undefined ? permission.isActive : true,
    }));

    const savedPermissions = await Permission.insertMany(newPermissions, {
      ordered: false,
    });
    res.status(201).json({
      success: true,
      message: "Permissions created successfully",
      data: savedPermissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating permissions",
      error: error.message,
    });
  }
};

module.exports = {
  createPremission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  bulkCreatePermissions,
};
