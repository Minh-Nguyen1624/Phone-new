const Category = require("../model/categoryModel");
const mongoose = require("mongoose");
const User = require("../model/userModel");
const Discount = require("../model/discountModel");

const getAllCategory = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) {
      if (isActive === "true" || isActive === "false") {
        filter.isActive = isActive === "true";
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid value for isActive. Use 'true' or 'false'.",
        });
      }
    }
    const categories = await Category.find(filter)
      .populate("parentCategory", "name")
      .populate("discount", "code discountValue");
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// const getAllCategory = async (req, res) => {
//   try {
//     const { isActive, page = 1, limit = 10, fields } = req.query;
//     const filter = {};

//     // Xử lý filter isActive
//     if (isActive !== undefined) {
//       if (isActive === "true" || isActive === "false") {
//         filter.isActive = isActive === "true";
//       } else {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid value for isActive. Use 'true' or 'false'.",
//         });
//       }
//     }

//     // Chuyển page và limit thành số
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // Kiểm tra hợp lệ của page và limit
//     if (pageNum < 1 || limitNum < 1) {
//       return res.status(400).json({
//         success: false,
//         message: "Page and limit must be positive numbers.",
//       });
//     }

//     // Lấy tổng số bản ghi
//     const totalItems = await Category.countDocuments(filter);

//     let categories;
//     if (fields === "ids") {
//       // Chỉ lấy mảng _id
//       categories = await Category.find(filter, "_id")
//         .skip(skip)
//         .limit(limitNum);
//       categories = categories.map((category) => category._id);
//     } else {
//       // Lấy đầy đủ thông tin category
//       categories = await Category.find(filter)
//         .populate("parentCategory", "name")
//         .populate("discount", "code discountValue")
//         .skip(skip)
//         .limit(limitNum);
//     }

//     // Tính tổng số trang
//     const totalPages = Math.ceil(totalItems / limitNum);

//     res.status(200).json({
//       success: true,
//       data: categories,
//       pagination: {
//         totalItems,
//         totalPages,
//         currentPage: pageNum,
//         itemsPerPage: limitNum,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid category ID" });
    }

    const category = await Category.findById(id)
      .populate("parentCategory", "name")
      .populate("discount", "code discountValue");
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, parentCategory, discount: discountId, imageUrl } = req.body;

    if (parentCategory) {
      if (Array.isArray(parentCategory)) {
        // Kiểm tra từng _id trong mảng
        const invalidIds = parentCategory.filter(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        );
        if (invalidIds.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid parent category ID(s).",
          });
        }
        // Kiểm tra tồn tại của parent categories (tùy chọn)
        const Category = mongoose.model("Category");
        const existingParents = await Category.find({
          _id: { $in: parentCategory },
        });
        if (existingParents.length !== parentCategory.length) {
          return res.status(400).json({
            success: false,
            message: "One or more parent categories do not exist.",
          });
        }
      } else if (!mongoose.Types.ObjectId.isValid(parentCategory)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid parent category ID." });
      }
    }

    // Kiểm tra tính hợp lệ của parentCategory nếu có
    // if (parentCategory && !mongoose.Types.ObjectId.isValid(parentCategory)) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "Invalid parent category ID." });
    // }

    // Kiểm tra tính hợp lệ của discount (nếu có)
    if (discountId) {
      const now = new Date();
      const Discount = mongoose.model("Discount");
      const discountDoc = await Discount.findById(discountId);

      // Kiểm tra discount tồn tại, có trạng thái active và nằm trong khoảng thời gian hợp lệ
      if (
        !discountDoc ||
        !discountDoc.isActive ||
        now < discountDoc.startDate ||
        now > discountDoc.endDate
      ) {
        return res.status(400).json({
          success: false,
          message: "The assigned discount is not active or valid.",
        });
      }
    }

    // Tạo category mới
    const category = await Category.create({
      name,
      parentCategory,
      discount: discountId,
      imageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    const statusCode = error.name === "ValidationError" ? 400 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Kiểm tra tính hợp lệ của parentCategory nếu có
    if (updateData.parentCategory) {
      if (!mongoose.Types.ObjectId.isValid(updateData.parentCategory)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid parent category ID." });
      }
      if (updateData.parentCategory === id) {
        return res.status(400).json({
          success: false,
          message: "A category cannot be its own parent.",
        });
      }
    }

    // Kiểm tra tính hợp lệ của discount (nếu có)
    if (updateData.discount) {
      if (!mongoose.Types.ObjectId.isValid(updateData.discount)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid discount ID." });
      }

      const now = new Date();
      const Discount = mongoose.model("Discount");
      const discountDoc = await Discount.findById(updateData.discount);

      // Kiểm tra discount tồn tại, có trạng thái active và nằm trong khoảng thời gian hợp lệ
      if (
        !discountDoc ||
        !discountDoc.isActive ||
        now < discountDoc.startDate ||
        now > discountDoc.endDate
      ) {
        return res.status(400).json({
          success: false,
          message: "The assigned discount is not active or valid.",
        });
      }
    }

    updateData.updatedAt = new Date();

    // Cập nhật category
    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    s;
    category.isActive = !category.isActive;
    category.updatedAt = new Date();
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category is now ${category.isActive ? "active" : "inactive"}`,
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllCategory,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
};
