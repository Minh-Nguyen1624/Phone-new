const Category = require("../model/categoryModel");
const mongoose = require("mongoose");
const User = require("../model/userModel");
const Discount = require("../model/discountModel");

// const getAllCategory = async (req, res) => {
//   try {
//     const { isActive } = req.query;
//     const filter = {};
//     if (isActive !== undefined) {
//       filter.isActive = isActive === "true";
//     }
//     const categories = await Category.find(filter)
//       .populate("parentCategory", "name")
//       .populate("discount", "code discountValue");
//     res.status(200).json({ success: true, data: categories });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };
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

    // Kiểm tra tính hợp lệ của parentCategory nếu có
    if (parentCategory && !mongoose.Types.ObjectId.isValid(parentCategory)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid parent category ID." });
    }

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
// const createCategory = async (req, res) => {
//   try {
//     const { name, parentCategory, discount: discountId, imageUrl } = req.body;

//     // Kiểm tra tính hợp lệ của parentCategory nếu có
//     if (parentCategory && !mongoose.Types.ObjectId.isValid(parentCategory)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid parent category ID." });
//     }

//     // Kiểm tra tính hợp lệ của discount (nếu có)
//     if (discountId) {
//       // Kiểm tra discountId có phải là ObjectId hợp lệ
//       if (!mongoose.Types.ObjectId.isValid(discountId)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid discount ID.",
//         });
//       }

//       const Discount = mongoose.model("Discount");
//       const discount = await Discount.findById(discountId);

//       // Kiểm tra discount tồn tại, có trạng thái active và nằm trong khoảng thời gian hợp lệ
//       if (!discount) {
//         return res.status(400).json({
//           success: false,
//           message: "Discount not found.",
//         });
//       }

//       const now = new Date();
//       if (
//         !discount.isActive ||
//         now < discount.startDate ||
//         now > discount.endDate
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "The assigned discount is not active or valid.",
//         });
//       }
//     }

//     // Tạo category mới
//     const category = await Category.create({
//       name,
//       parentCategory,
//       discount: discountId,
//       imageUrl,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Category created successfully",
//       data: category,
//     });
//   } catch (error) {
//     const statusCode = error.name === "ValidationError" ? 400 : 500;
//     res.status(statusCode).json({ success: false, error: error.message });
//   }
// };

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

// const toggleCategoryStatus = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const category = await Category.findById(id);
//     if (!category) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Category not found" });
//     }

//     category.isActive = !category.isActive;
//     category.updatedAt = new Date();
//     await category.save();

//     res.status(200).json({
//       success: true,
//       message: `Category is now ${category.isActive ? "active" : "inactive"}`,
//       data: category,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };
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
