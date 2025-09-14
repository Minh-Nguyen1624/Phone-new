const Category = require("../model/categoryModel");
const mongoose = require("mongoose");
const User = require("../model/userModel");
const Discount = require("../model/discountModel");
const slugify = require("slugify");

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
      .populate("parentCategory", "name slug imageUrl")
      .populate("discount", "code discountValue")
      // .populate("accessoryFor", "name slug") // Thêm populate accessoryFor
      .select(
        "name slug description parentCategory discount imageUrl isActive specificationFields createAt updatedAt"
      );
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
      .populate("parentCategory", "name slug imageUrl")
      .populate("discount", "code discountValue")
      // .populate("accessoryFor", "name slug") // Thêm populate accessoryFor
      .select(
        "name slug description parentCategory discount imageUrl isActive specificationFields createAt updatedAt"
      );
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
    // const { name, parentCategory, discount: discountId, imageUrl } = req.body;
    const {
      name,
      parentCategory,
      discount: discountId,
      imageUrl,
      specificationFields,
      // accessoryFor,
    } = req.body;

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

    // // Validate accessoryFor
    // if (accessoryFor) {
    //   if (!Array.isArray(accessoryFor)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "accessoryFor must be an array of category IDs.",
    //     });
    //   }
    //   const invalidIds = accessoryFor.filter(
    //     (id) => !mongoose.Types.ObjectId.isValid(id)
    //   );
    //   if (invalidIds.length > 0) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid accessoryFor category ID(s).",
    //     });
    //   }
    //   const existingAccessories = await Category.find({
    //     _id: { $in: accessoryFor },
    //   });
    //   if (existingAccessories.length !== accessoryFor.length) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "One or more accessoryFor categories do not exist.",
    //     });
    //   }
    // }
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
      specificationFields,
      // accessoryFor: accessoryFor || [], // Ensure accessoryFor is an array
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

const addMultipleCategory = async (req, res) => {
  try {
    const categoriesData = req.body; // Mong đợi một mảng các category

    if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Input must be a non-empty array of category objects",
      });
    }

    const newCategories = await Promise.all(
      categoriesData.map(async (categoryData) => {
        // Validate required fields
        if (!categoryData.name || !categoryData.imageUrl) {
          throw new Error("Name and imageUrl are required for each category");
        }

        // Tạo slug từ name nếu chưa có
        const slug =
          categoryData.slug ||
          slugify(categoryData.name, { lower: true, strict: true });

        // Kiểm tra tính duy nhất của slug
        const existingCategory = await Category.findOne({ slug });
        if (
          existingCategory &&
          existingCategory._id.toString() !==
            (categoryData._id || "").toString()
        ) {
          throw new Error(`Slug "${slug}" is already in use`);
        }

        // Xử lý parentCategory: đảm bảo không tự tham chiếu
        if (categoryData.parentCategory && categoryData._id) {
          const parentIds = Array.isArray(categoryData.parentCategory)
            ? categoryData.parentCategory
            : [categoryData.parentCategory];
          if (
            parentIds.some(
              (id) => id.toString() === categoryData._id.toString()
            )
          ) {
            throw new Error("A category cannot be its own parent.");
          }
        }

        // if (categoryData.accessoryFor) {
        //   if (!Array.isArray(categoryData.accessoryFor)) {
        //     throw new Error("accessoryFor must be an array of category IDs.");
        //   }
        //   const invalidIds = categoryData.accessoryFor.filter(
        //     (id) => !mongoose.Types.ObjectId.isValid(id)
        //   );
        //   if (invalidIds.length > 0) {
        //     throw new Error("Invalid accessoryFor category ID(s).");
        //   }
        //   const existingAccessories = await Category.find({
        //     _id: { $in: categoryData.accessoryFor },
        //   });
        //   if (existingAccessories.length !== categoryData.accessoryFor.length) {
        //     throw new Error(
        //       "One or more accessoryFor categories do not exist."
        //     );
        //   }
        // }

        // Xử lý discount: validate nếu có
        if (categoryData.discount) {
          const Discount = mongoose.model("Discount");
          const discountDoc = await Discount.findById(categoryData.discount);
          if (!discountDoc) {
            throw new Error("The assigned discount does not exist.");
          }
          const now = new Date();
          if (
            !discountDoc.isActive ||
            now < discountDoc.startDate ||
            now > discountDoc.endDate
          ) {
            throw new Error("The assigned discount is not active or valid.");
          }
        }

        // Validate imageUrl
        const imageUrlRegex = /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/;
        if (!imageUrlRegex.test(categoryData.imageUrl)) {
          throw new Error(
            `${categoryData.imageUrl} is not a valid image URL (must end with .jpg, .jpeg, .png, or .gif)`
          );
        }

        // Tạo đối tượng category mới
        const category = new Category({
          name: categoryData.name,
          parentCategory: categoryData.parentCategory,
          discount: categoryData.discount,
          // description: categoryData.description,
          imageUrl: categoryData.imageUrl,
          specificationFields: categoryData.specificationFields,
          // accessoryFor: categoryData.accessoryFor,
          isActive:
            categoryData.isActive !== undefined ? categoryData.isActive : true,
          createAt: categoryData.createAt || Date.now(),
          updatedAt: categoryData.updatedAt || Date.now(),
          slug,
        });

        // Lưu category
        return await category.save();
      })
    );

    res.status(201).json({
      success: true,
      data: newCategories,
      message: "Categories added successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
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

    // // Validate accessoryFor
    // if (updateData.accessoryFor) {
    //   if (!Array.isArray(updateData.accessoryFor)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "accessoryFor must be an array of category IDs.",
    //     });
    //   }
    //   const invalidIds = updateData.accessoryFor.filter(
    //     (id) => !mongoose.Types.ObjectId.isValid(id)
    //   );
    //   if (invalidIds.length > 0) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid accessoryFor category ID(s).",
    //     });
    //   }
    //   const existingAccessories = await Category.find({
    //     _id: { $in: updateData.accessoryFor },
    //   });
    //   if (existingAccessories.length !== updateData.accessoryFor.length) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "One or more accessoryFor categories do not exist.",
    //     });
    //   }
    //   if (updateData.accessoryFor.some((id) => id.toString() === id)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "A category cannot be its own accessory.",
    //     });
    //   }
    // }

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
    // const category = await Category.findByIdAndUpdate(id, updateData, {
    //   new: true,
    //   runValidators: true,
    // });

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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

const getCategoryBySlug = async (req, res) => {
  try {
    const { categorySlug } = req.params; // Sử dụng categorySlug thay vì slug
    const category = await Category.findOne({ slug: categorySlug })
      .populate("parentCategory", "name slug")
      .populate("discount", "code discountValue");
    // .populate("accessoryFor", "name slug"); // Thêm populate accessoryFor;

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category with slug '${categorySlug}' not found`,
      });
    }

    res.status(200).json({ success: true, data: category });
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
  addMultipleCategory,
  getCategoryBySlug,
};
