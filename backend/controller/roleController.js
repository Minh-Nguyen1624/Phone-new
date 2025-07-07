const Role = require("../model/roleModel");
const mongoose = require("mongoose");
const Permission = require("../model/permissionModel");
const User = require("../model/userModel");

const createRole = async (req, res) => {
  try {
    const { roleName, description, permissions, isDefault } = req.body;

    if (
      !roleName ||
      typeof roleName !== "string" ||
      roleName.trim().length < 2
    ) {
      return res.status(400).json({
        message: "Role name is required and must be at least 2 characters",
      });
    }

    // Kiểm tra vai trò đã tồn tại
    const existingRole = await Role.findOne({ roleName });
    if (existingRole) {
      return res.status(400).json({ message: "Role already exists" });
    }

    // Kiểm tra và gỡ vai trò mặc định cũ (nếu isDefault = true)
    if (isDefault) {
      await Role.updateMany({}, { $set: { isDefault: false } });
    }

    // Kiểm tra danh sách permissions có hợp lệ không
    if (permissions) {
      const validPermissions = await Permission.find({
        _id: { $in: permissions },
      });
      if (validPermissions.length !== permissions.length) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid permissions provided" });
      }
    }

    const newRole = new Role({
      roleName: roleName.trim(),
      description: description || "",
      permissions: permissions || [],
      isDefault: isDefault || false,
    });

    const savedRole = await newRole.save();
    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: savedRole,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating role",
      error: error.message,
    });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const totalRoles = await Role.countDocuments(); // Tính tổng số roles

    const roles = await Role.find()
      .populate("permissions", "permissionName description")
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Roles retrieved successfully",
      data: roles,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRoles / limit),
        totalItems: totalRoles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting all roles",
      error: error.message,
    });
  }
};

const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid role id" });
    }
    const role = await Role.findById(id).populate(
      "permissions",
      "permissionName description"
    );
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.status(200).json({
      success: true,
      message: "Role retrieved successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting role by id",
      error: error.message,
    });
  }
};

// const updateRole = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { roleName, description, permissions, isDefault } = req.body;

//     const role = await Role.findById(id).populate(
//       "permissions",
//       "permissionName description"
//     );
//     if (!role) {
//       return res.status(404).json({ message: "Role not found" });
//     }

//     role.roleName = roleName || role.roleName;
//     role.description = description || role.description;
//     role.permissions = permissions || role.permissions;
//     role.isDefault = isDefault || role.isDefault;

//     const updatedRole = await role.save();
//     res.status(200).json({
//       success: true,
//       message: "Role updated successfully",
//       data: updatedRole,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error updating role",
//       error: error.message,
//     });
//   }
// };
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName, description, permissions, isDefault } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      {
        roleName: roleName || role.roleName,
        description: description || role.description,
        permissions: permissions || role.permissions,
        isDefault: isDefault !== undefined ? isDefault : role.isDefault,
      },
      { new: true, runValidators: true }
    ).populate("permissions", "permissionName description");

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: updatedRole,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating role",
      error: error.message,
    });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role id",
      });
    }

    // Kiểm tra vai trò có tồn tại không
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Kiểm tra vai trò có được gán cho User
    const usersWithRole = await User.countDocuments({ role: id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete role because it is assigned to one or more users",
      });
    }

    // Kiểm tra vai trò mặc định
    if (role.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete default role",
      });
    }

    // Xóa vai trò
    await role.remove();
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting role",
      error: error.message,
    });
  }
};

// const addPermissions = async (req, res) => {
//   try {
//     const { roleId, permissionId } = req.body;

//     const role = await Role.findById(roleId);
//     const permissions = await Permission.findById(permissionId);

//     if (!role || !permissions) {
//       return res.status(404).json({ message: "Role or permission not found" });
//     }

//     if (role.permissions.includes(permissionId)) {
//       return res
//         .status(400)
//         .json({ message: "Permission already added to role" });
//     }

//     // thêm quyền
//     role.permissions.push(permissionId);
//     const updatedRole = await role.save();

//     res.status(200).json({
//       success: true,
//       message: "Permission added to role successfully",
//       data: updatedRole,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error adding permissions to role",
//       error: error.message,
//     });
//   }
// };

// const removePermissions = async (req, res) => {
//   try {
//     const { roleId, permissionId } = req.body;
//     const role = await Role.findById(roleId);

//     if (!role) {
//       return res.status(404).json({ message: "Role not found" });
//     }

//     // xóa quyền
//     // role.permissions = role.permissions.filter(
//     //     (permission) => permission.toString() !== permissionId.toString()
//     // )
//     role.permissions = role.permissions.filter(
//       (permission) => permission.toString() !== permissionId
//     );
//     const updatedRole = await role.save();

//     res.status(200).json({
//       success: true,
//       message: "Permission removed from role successfully",
//       data: updatedRole,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error removing permissions from role",
//       error: error.message,
//     });
//   }
// };
const addPermissions = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;

    const role = await Role.findById(roleId);
    const permission = await Permission.findById(permissionId);

    if (!role || !permission) {
      return res.status(404).json({ message: "Role or permission not found" });
    }

    if (role.permissions.includes(permissionId)) {
      return res
        .status(400)
        .json({ message: "Permission already added to role" });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { $push: { permissions: permissionId } },
      { new: true, runValidators: true }
    ).populate("permissions", "permissionName description");

    res.status(200).json({
      success: true,
      message: "Permission added to role successfully",
      data: updatedRole,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding permissions to role",
      error: error.message,
    });
  }
};

const removePermissions = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;
    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { $pull: { permissions: permissionId } },
      { new: true, runValidators: true }
    ).populate("permissions", "permissionName description");

    res.status(200).json({
      success: true,
      message: "Permission removed from role successfully",
      data: updatedRole,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing permissions from role",
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
      message: "Error getting permissions",
      error: error.message,
    });
  }
};

const assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const user = await User.findById(userId);
    const role = await Role.findById(roleId);

    if (!user || !role) {
      return res.status(404).json({ message: "User or role not found" });
    }

    user.role = roleId;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Role assigned to user successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error assigning role to user",
      error: error.message,
    });
  }
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  addPermissions,
  removePermissions,
  getAllPermissions,
  assignRoleToUser,
};
