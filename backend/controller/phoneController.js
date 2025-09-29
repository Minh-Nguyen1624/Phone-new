const Phone = require("../model/phoneModel");
const Discount = require("../model/discountModel");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const User = require("../model/userModel");
const Category = require("../model/categoryModel");
const { v4: uuidv4 } = require("uuid");
const Review = require("../model/reviewModel");
const Cart = require("../model/cartModel");
const Order = require("../model/orderModel");
const Inventory = require("../model/inventoryModel");
const ViewHistory = require("../model/viewHistoryModel");
const asyncHandler = require("express-async-handler");
const {
  recalcPhoneRating,
  getReviewSummary,
} = require("../services/ratingService");

const getPhones = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    // const skip = (page - 1) * limit;

    const phones = await Phone.find()
      // .populate({
      //   path: "inventory",
      //   model: "Inventory",
      //   select: "quantity reserved",
      // })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      // .populate("discount", "username value")
      .populate(
        "discount",
        "code description discountType discountValue minimumOrderAmount"
      )
      .populate("likedBy", "username email")
      .populate(
        "category",
        "name specificationFields slug imageUrl" // Thêm specificationFields
      )
      .populate("accessory", "name slug");

    // Đếm tổng số điện thoại
    const total = await Phone.countDocuments();

    res.status(200).json({
      success: true,
      message: "Phones retrieved successfully",
      data: phones,
      pagination: {
        total, // Tổng số sản phẩm
        page: parseInt(page), // Trang hiện tại
        limit: parseInt(limit), // Số sản phẩm mỗi trang
        totalPages: Math.ceil(total / limit), // Tổng số trang
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching phones",
      error: error.message,
    });
  }
};

// Add more products
const addMultiplePhones = async (req, res) => {
  try {
    const phoneData = req.body;

    if (!Array.isArray(phoneData) || phoneData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of phones to add.",
      });
    }

    // Xử lý và xác thực dữ liệu cho từng sản phẩm
    for (let phone of phoneData) {
      // Chuyển category và discount thành ObjectId nếu có
      if (phone.category && typeof phone.category === "string") {
        if (!ObjectId.isValid(phone.category)) {
          return res.status(400).json({
            success: false,
            message: `Invalid category ID for phone ${phone.name}`,
          });
        }
        phone.category = new ObjectId(phone.category);
      }

      if (phone.accessoryFor) {
        if (!Array.isArray(phone.accessoryFor)) {
          return res.status(400).json({
            success: false,
            message: `accessoryFor must be an array for phone ${phone.name}`,
          });
        }

        const invalidIds = phone.accessoryFor.filter(
          (id) => !ObjectId.isValid(id)
        );
        if (invalidIds.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid accessoryFor category ID(s) for phone ${phone.name}`,
          });
        }

        const accessoryCategories = await Category.findById({
          _id: {
            $in: phone.accessoryFor,
          },
        });

        if (accessoryCategories.length !== phone.accessoryFor.length) {
          return res.status(400).json({
            success: false,
            message: `One or more accessoryFor categories do not exist for phone ${phone.name}`,
          });
        }

        if (
          phone.category &&
          phone.accessoryFor.some(
            (id) => id.toString() === phone.category.toString()
          )
        ) {
          return res.status(400).json({
            success: false,
            message: `A product cannot be an accessory for its own category: ${phone.name}`,
          });
        }
      }

      if (phone.discount && typeof phone.discount === "string") {
        if (!ObjectId.isValid(phone.discount)) {
          return res.status(400).json({
            success: false,
            message: `Invalid discount ID for phone ${phone.name}`,
          });
        }
        const Discount = mongoose.model("Discount");
        const discount = await Discount.findById(phone.discount);
        if (!discount) {
          return res.status(400).json({
            success: false,
            message: `Invalid discount ID for phone ${phone.name}`,
          });
        }
        if (!discount.isActive) {
          return res.status(400).json({
            success: false,
            message: `The discount for phone ${phone.name} is not active`,
          });
        }
        phone.discountValue =
          discount.discountType === "percentage"
            ? (phone.price * discount.discountValue) / 100
            : Math.min(discount.discountValue, phone.price);
      } else {
        phone.discountValue = 0;
      }

      // Kiểm tra giá hợp lệ
      if (
        typeof phone.price !== "number" ||
        isNaN(phone.price) ||
        phone.price < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for phone ${phone.name}`,
        });
      }

      // Chuẩn bị specifications mặc định nếu không có
      phone.specifications = phone.specifications || {};
      phone.specifications.discountAmount = phone.discountValue || 0;
      phone.finalPrice =
        phone.price - (phone.specifications.discountAmount || 0);
      phone.specifications.screen = phone.specifications.screen || "N/A";
      phone.specifications.battery = phone.specifications.battery || "N/A";
      phone.specifications.processor = phone.specifications.processor || "N/A";
      phone.specifications.ram = phone.specifications.ram || "N/A";
      // phone.specifications.storage = phone.specifications.storage || "N/A";
      phone.specifications.storage = Array.isArray(phone.specifications.storage)
        ? phone.specifications.storage
        : [phone.specifications.storage || "N/A"];
      phone.specifications.camera = phone.specifications.camera || {
        front: "N/A",
        rear: "N/A",
      };
      phone.specifications.os = phone.specifications.os || "N/A";
      phone.specifications.network = phone.specifications.network || "N/A";

      // Xử lý images (mảng)
      if (phone.images && !Array.isArray(phone.images)) {
        return res.status(400).json({
          success: false,
          message: `Images must be an array for phone ${phone.name}`,
        });
      }

      // Xử lý colors (mảng)
      if (phone.colors && !Array.isArray(phone.colors)) {
        return res.status(400).json({
          success: false,
          message: `Colors must be an array for phone ${phone.name}`,
        });
      }

      // Đặt giá trị mặc định cho các trường không bắt buộc
      phone.description = phone.description || "";
      phone.releaseDate = phone.releaseDate || null;
      phone.rating = phone.rating || 0;
      phone.warrantyPeriod = phone.warrantyPeriod || null;
      phone.isFeatured = phone.isFeatured || false;
      phone.likes = phone.likes || 0;
      phone.likedBy = phone.likedBy || [];
      phone.warehouseLocation = phone.warehouseLocation || "Default Warehouse";
      phone.quantity = phone.quantity || 0;
      phone.reserved = phone.reserved || 0;
      phone.accessoryFor = phone.accessoryFor || [];
    }

    // Thêm tất cả sản phẩm vào cơ sở dữ liệu
    const phones = await Phone.insertMany(phoneData);
    return res.status(201).json({
      success: true,
      message: `${phones.length} phone(s) added successfully.`,
      data: phones,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding phones",
      error: error.message,
    });
  }
};

// Add a new phone
const addPhones = async (req, res) => {
  try {
    const {
      name,
      price,
      image,
      description = "",
      brand,
      stock,
      category,
      accessoryFor = [],
      specifications = {},
      releaseDate = null,
      images = [],
      rating = 0,
      discount = null,
      warrantyPeriod = null,
      isFeatured = false,
      likes = 0,
      likedBy = [],
      colors = [],
      discountValue = 0,
      discountAmount = 0,
      warehouseLocation = "Default Warehouse",
      quantity = 0,
      reserved = 0,
    } = req.body;

    // Trim và kiểm tra dữ liệu cần thiết
    if (
      !name ||
      !price ||
      !image ||
      !brand ||
      !category ||
      stock === undefined ||
      quantity === undefined ||
      reserved === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (name, price, image, brand, category, stock)",
      });
    }

    // Kiểm tra category hợp lệ
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    if (accessoryFor.length > 0) {
      if (!Array.isArray(accessoryFor)) {
        return res.status(400).json({
          success: false,
          message: "accessoryFor must be an array",
        });
      }
      const invalidIds = accessoryFor.filter((id) => !ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid accessoryFor category ID(s)",
        });
      }
      const accessoryCategories = await Category.find({
        _id: { $in: accessoryFor },
      });
      if (accessoryCategories.length !== accessoryFor.length) {
        return res.status(400).json({
          success: false,
          message: "One or more accessoryFor categories do not exist",
        });
      }
      if (
        category &&
        accessoryFor.some((id) => id.toString() === category.toString())
      ) {
        return res.status(400).json({
          success: false,
          message: "A product cannot be an accessory for its own category",
        });
      }
    }

    // Kiểm tra discount hợp lệ (nếu có)
    let validatedDiscount = null;
    let calculatedDiscountValue = discountValue;
    let calculatedDiscountAmount = discountAmount;

    // if (discount) {
    //   if (!mongoose.Types.ObjectId.isValid(discount)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid discount ID",
    //     });
    //   }
    //   const existingDiscount = await Discount.findById(discount);
    //   if (!existingDiscount) {
    //     return res.status(404).json({
    //       success: false,
    //       message: "Discount not found",
    //     });
    //   }
    //   validatedDiscount = discount;
    // }
    if (discount) {
      if (!mongoose.Types.ObjectId.isValid(discount)) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount ID",
        });
      }
      const existingDiscount = await Discount.findById(discount);
      if (!existingDiscount) {
        return res.status(404).json({
          success: false,
          message: "Discount not found",
        });
      }
      if (!existingDiscount.isActive) {
        return res.status(400).json({
          success: false,
          message: "The discount is not active",
        });
      }
      validatedDiscount = discount;
      calculatedDiscountValue = existingDiscount.discountValue; // Lấy từ Discount
      calculatedDiscountAmount =
        existingDiscount.discountType === "percentage"
          ? (price * calculatedDiscountValue) / 100
          : Math.min(existingDiscount.discountValue, price);
    } else {
      calculatedDiscountValue = 0;
      calculatedDiscountAmount = 0;
    }

    // Kiểm tra likedBy hợp lệ (nếu có)
    if (likedBy.length > 0) {
      const validUsers = await User.find({ _id: { $in: likedBy } });
      if (validUsers.length !== likedBy.length) {
        return res.status(400).json({
          success: false,
          message: "One or more user IDs in likedBy are invalid",
        });
      }
    }

    // Xử lý images (mảng)
    if (!Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images must be an array",
      });
    }

    // Xử lý colors (mảng)
    if (!Array.isArray(colors)) {
      return res.status(400).json({
        success: false,
        message: "Colors must be an array",
      });
    }

    // Kiểm tra và chuẩn bị specifications
    // const validatedSpecifications = {
    //   screen: specifications.screen || "N/A",
    //   battery: specifications.battery || "N/A",
    //   processor: specifications.processor || "N/A",
    //   ram: specifications.ram || "N/A",
    //   // storage: specifications.storage || "N/A",
    //   storage: Array.isArray(specifications.storage)
    //     ? specifications.storage
    //     : [specifications.storage || "N/A"],
    //   camera: {
    //     front: specifications.camera?.front || "N/A",
    //     rear: specifications.camera?.rear || "N/A",
    //     fieldOfView: specifications.camera?.fieldOfView || "N/A",
    //     rotation: {
    //       horizontal: specifications.camera?.rotation?.horizontal || "N/A",
    //       vertical: specifications.camera?.rotation?.vertical || "N/A",
    //     },
    //     infraredRange: specifications.camera?.infraredRange || "N/A",
    //     utilities: specifications.camera?.utilities || [],
    //     simultaneousConnections:
    //       specifications.camera?.simultaneousConnections || 0,
    //     power: {
    //       inputVoltage: specifications.camera?.power?.inputVoltage || "N/A",
    //       portType: specifications.camera?.power?.portType || "N/A",
    //       adapterIncluded:
    //         specifications.camera?.power?.adapterIncluded || false,
    //     },
    //     installationLocation:
    //       specifications.camera?.installationLocation || "N/A",
    //     supportedDevices: specifications.camera?.supportedDevices || [],
    //     controlApp: specifications.camera?.controlApp || "N/A",
    //     dimensions: {
    //       length: specifications.camera?.dimensions?.length || 0,
    //       width: specifications.camera?.dimensions?.width || 0,
    //       height: specifications.camera?.dimensions?.height || 0,
    //       weight: specifications.camera?.dimensions?.weight || 0,
    //     },
    //   },
    //   os: specifications.os || "N/A",
    //   network: specifications.network || "N/A",
    //   discountAmount: calculatedDiscountAmount, // Thêm discountAmount vào specifications
    // };
    const validatedSpecifications = {
      ...specifications,
      discountAmount: calculatedDiscountAmount,
      screen: specifications.screen || "N/A",
      battery: specifications.battery || "N/A",
      processor: specifications.processor || "N/A",
      ram: specifications.ram || "N/A",
      storage: Array.isArray(specifications.storage)
        ? specifications.storage
        : [specifications.storage || "N/A"],
      camera: specifications.camera || { front: "N/A", rear: "N/A" },
      os: specifications.os || "N/A",
      network: specifications.network || "N/A",
    };

    const phone = new Phone({
      name: name.trim(),
      price,
      image: image.trim(),
      description: description.trim(),
      brand: brand.trim(),
      stock,
      accessoryFor,
      category,
      specifications: validatedSpecifications,
      releaseDate,
      images,
      rating,
      discount: validatedDiscount,
      discountValue: calculatedDiscountValue,
      discountAmount: calculatedDiscountAmount, // Lưu discountAmount ở root level (tùy chọn, có thể bỏ nếu chỉ dùng trong specifications)
      finalPrice: price - calculatedDiscountAmount, // Tính finalPrice
      warrantyPeriod,
      isFeatured,
      likes,
      likedBy,
      colors,
      warehouseLocation,
      quantity,
      reserved,
    });

    // Lưu vào cơ sở dữ liệu
    const savedPhone = await phone.save();
    res.status(201).json({
      success: true,
      message: "Phone added successfully",
      data: savedPhone,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error adding phone",
      error: error.message,
    });
  }
};

// Get a phone by ID
const getPhoneById = async (req, res) => {
  try {
    const phone = await Phone.findById(req.params.id)
      // .populate({
      //   path: "inventory",
      //   model: "Inventory",
      //   select: "quantity reserved",
      // })
      .populate(
        "discount",
        "code description discountType discountValue minimumOrderAmount"
      )
      .populate("likedBy", "username email")
      .populate(
        "category",
        // "name description" // Populate category fields (you can adjust according to your Category model schema)
        "name specificationFields slug imageUrl"
      )
      .populate("accessoryFor", "name slug")
      .populate("cart", "totalAmount") // If Cart model has a field like totalAmount, adjust accordingly
      .populate("order", "orderStatus paymentMethod") // If Order model has relevant fields;
      .populate({
        path: "reviews",
        select: "phone rating content user createdAt likes",
        populate: {
          path: "user",
          select: "username email avatar", // lấy thêm field cụ thể từ user
        },
      })
      .exec();
    if (!phone) {
      return res.status(404).json({
        success: false,
        message: "Phone not found",
      });
    }

    // Lấy số lượng đã bán
    const sold = await phone.getSoldQuantity();
    console.log(`Sold quantity for phone ${phone._id}: ${sold}`);

    // const summary = await getReviewSummary(id);
    const summary = await getReviewSummary(phone);
    // const data = { ...phone, ...summary.data };
    // const data = { ...phone._doc, ...summary.data };

    // Tính lại averageRating từ reviews để xác nhận (tùy chọn)
    const reviews = phone.reviews || [];
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const calculatedAverageRating =
      reviews.length > 0
        ? Number((totalRating / reviews.length).toFixed(1))
        : 0;

    // So sánh với averageRating đã lưu (debug)
    if (phone.averageRating !== calculatedAverageRating) {
      console.log(
        `Warning: Saved averageRating (${phone.averageRating}) differs from calculated (${calculatedAverageRating}) for phone ${phone._id}`
      );
    }

    // Kết hợp dữ liệu
    const data = {
      ...phone._doc,
      ...summary.data,
      sold, // Thêm sold vào response
    };

    res.status(200).json({
      success: true,
      message: "Phone retrieved successfully",
      // data: phone,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching phone by ID",
      error: error.message,
    });
  }
};

const updatePhones = async (req, res) => {
  try {
    const phone = await Phone.findById(req.params.id);
    if (!phone) {
      return res.status(404).json({
        success: false,
        message: "Phone not found",
      });
    }

    if (req.body.category) {
      if (!ObjectId.isValid(req.body.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      const existingCategory = await Category.findById(req.body.category);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    if (req.body.accessoryFor) {
      if (!Array.isArray(req.body.accessoryFor)) {
        return res.status(400).json({
          success: false,
          message: "accessoryFor must be an array",
        });
      }
      const invalidIds = req.body.accessoryFor.filter(
        (id) => !ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid accessoryFor category ID(s)",
        });
      }
      const accessoryCategories = await Category.find({
        _id: { $in: req.body.accessoryFor },
      });
      if (accessoryCategories.length !== req.body.accessoryFor.length) {
        return res.status(400).json({
          success: false,
          message: "One or more accessoryFor categories do not exist",
        });
      }
      const categoryId = req.body.category || phone.category;
      if (
        categoryId &&
        req.body.accessoryFor.some(
          (id) => id.toString() === categoryId.toString()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "A product cannot be an accessory for its own category",
        });
      }
    }

    if (req.body.discount) {
      if (!mongoose.Types.ObjectId.isValid(req.body.discount)) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount ID",
        });
      }
      const discount = await Discount.findById(req.body.discount);
      if (!discount) {
        return res.status(400).json({
          success: false,
          message: "Discount not found",
        });
      }
      if (!discount.isActive) {
        return res.status(400).json({
          success: false,
          message: "The discount is not active",
        });
      }
    }

    if (req.body.likedBy && Array.isArray(req.body.likedBy)) {
      const validUsers = await User.find({ _id: { $in: req.body.likedBy } });
      if (validUsers.length !== req.body.likedBy.length) {
        return res.status(400).json({
          success: false,
          message: "One or more user IDs in likedBy are invalid",
        });
      }
    }

    if (req.body.category) {
      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      const Category = mongoose.model("Category");
      const existingCategory = await Category.findById(req.body.category);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    Object.assign(phone, req.body);

    if (req.body.specifications) {
      phone.specifications = {
        // ...phone.specifications.toObject(),
        ...phone.specifications,
        ...req.body.specifications,
        storage: Array.isArray(req.body.specifications.storage)
          ? req.body.specifications.storage
          : [req.body.specifications.storage || "N/A"],
        discountAmount:
          req.body.specifications.discountAmount !== undefined
            ? req.body.specifications.discountAmount
            : phone.specifications.discountAmount || 0,
      };
    }

    Object.assign(phone, req.body);

    await phone.save();

    // Synchronize with Inventory
    const inventory = await Inventory.findOne({
      warehouseLocation: phone.warehouseLocation,
    });

    if (inventory) {
      const product = inventory.products.find(
        (p) => p.phoneId.toString() === phone._id.toString()
      );
      if (product) {
        product.stock = phone.stock;
        product.quantity = phone.quantity;
        product.reserved = phone.reserved;
        // product.colors = phone.colors;
        inventory.lastUpdated = Date.now();
        await inventory.save();
      }
    }

    const populatedPhone = await Phone.findById(phone._id)
      .populate("likedBy", "username email")
      .populate(
        "discount",
        "code description discountType discountValue minimumOrderAmount"
      )
      .populate("accessoryFor", "name slug");

    res.status(200).json({
      success: true,
      message: "Phone updated successfully",
      data: populatedPhone,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating phone",
      error: error.message,
    });
  }
};

const deletePhones = async (req, res) => {
  try {
    const phone = await Phone.findById(req.params.id);
    if (!phone) {
      return res.status(404).json({
        success: false,
        message: "Phone not found",
      });
    }

    // Middleware pre("remove") sẽ tự động xử lý xóa liên quan trong Inventory
    await phone.remove();

    res.status(200).json({
      success: true,
      message: "Phone deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting phone",
      error: error.message,
    });
  }
};

const searchPhones = async (req, res) => {
  try {
    const { name, brand, category, minPrice, maxPrice, accessoryFor } =
      req.query;
    const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1
    const limit = parseInt(req.query.limit) || 10; // Số sản phẩm mỗi trang, mặc định là 10

    const filter = {};

    // Xử lý name để tìm kiếm chính xác và các sản phẩm liên quan
    if (name) {
      const searchTerms = name.split(/\s+/); // Tách từ khóa thành mảng
      const baseName = searchTerms[0]; // Lấy phần đầu tiên làm cơ sở
      const relatedFilter = {
        $or: [
          { name: new RegExp(name, "i") }, // Tìm chính xác với từ khóa
          { name: new RegExp(`^${baseName}\\s.*`, "i") }, // Tìm các sản phẩm bắt đầu bằng baseName
        ],
      };
      filter.$and = [relatedFilter];
    }

    // Kiểm tra và xử lý brand, category
    if (brand) filter.brand = new RegExp(brand, "i");
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      filter.category = category;
    }

    if (
      accessoryFor !== undefined &&
      accessoryFor !== null &&
      accessoryFor !== ""
    ) {
      if (!ObjectId.isValid(accessoryFor)) {
        return res.status(400).json({
          success: false,
          message: "Invalid accessoryFor category ID",
        });
      }
      filter.accessoryFor = accessoryFor;
    }

    // Kiểm tra minPrice và maxPrice
    if (minPrice || maxPrice) {
      filter.finalPrice = {};

      if (minPrice) {
        const minPriceValue = parseFloat(minPrice);
        if (isNaN(minPriceValue)) {
          return res.status(400).json({ message: "Invalid minPrice value." });
        }
        filter.finalPrice.$gte = minPriceValue;
      }

      if (maxPrice) {
        const maxPriceValue = parseFloat(maxPrice);
        if (isNaN(maxPriceValue)) {
          return res.status(400).json({ message: "Invalid maxPrice value." });
        }
        filter.finalPrice.$lte = maxPriceValue;
      }
    }

    // Lấy tổng số sản phẩm
    const total = await Phone.countDocuments(filter);

    // Lấy danh sách sản phẩm với phân trang
    const phones = await Phone.find(filter)
      // .populate("category")
      .populate(
        "category",
        "_id name parentCategory imageUrl specificationFields slug"
      ) // Thêm _id và parentCategory
      .populate(
        "discount",
        "code description discountType discountValue minimumOrderAmount discountImage"
      )
      .populate("accessoryFor", "name slug")
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: "Phones retrieved successfully",
      data: phones,
      pagination: {
        total, // Tổng số sản phẩm
        page: parseInt(page), // Trang hiện tại
        limit: parseInt(limit), // Số sản phẩm mỗi trang
        totalPages: Math.ceil(total / limit), // Tổng số trang
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching phones",
      error: error.message,
    });
  }
};

const filterByCategory = async (req, res) => {
  try {
    // const { name, category } = req.query;
    const { name, category, accessoryFor } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

    // if (!category) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Please provide a category to filter.",
    //   });
    // }
    if (!category && !accessoryFor) {
      return res.status(400).json({
        success: false,
        message: "Please provide a category or accessoryFor to filter.",
      });
    }

    const filter = {};
    if (name) filter.name = new RegExp(name, "i");
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      filter.category = category;
    }

    if (
      accessoryFor !== undefined &&
      accessoryFor !== null &&
      accessoryFor !== ""
    ) {
      if (!ObjectId.isValid(accessoryFor)) {
        return res.status(400).json({
          success: false,
          message: "Invalid accessoryFor category ID",
        });
      }
      filter.accessoryFor = accessoryFor;
    }

    const total = await Phone.countDocuments(filter);
    const phones = await Phone.find(filter)
      // .populate("category", "name specificationFields ")
      .populate(
        "category",
        "_id name parentCategory imageUrl specificationFields slug"
      )
      .populate(
        "discount",
        "code description discountType discountValue minimumOrderAmount"
      )
      .skip((page - 1) * limit)
      .limit(limit);

    if (phones.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No phones found in category: ${category}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Phones in category: ${category}`,
      data: phones,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Filter by category error:", error);
    res.status(500).json({
      success: false,
      message: "Error filtering phones by category",
      error: error.message,
    });
  }
};

const getStatistics = async (req, res) => {
  try {
    const totalPhones = await Phone.countDocuments();
    const totalDiscounts = await Discount.countDocuments();
    const totalUsers = await User.countDocuments();

    // Đếm số lượng điện thoại có số lượng tồn kho thấp (<= 5)
    const lowStockPhones = await Phone.countDocuments({
      stock: { $lte: 5 },
    });

    // Tính giá trung bình của sản phẩm (dựa trên finalPrice)
    const averagePrice = await Phone.aggregate([
      { $group: { _id: null, avgPrice: { $avg: "$finalPrice" } } },
    ]);

    // Đếm số điện thoại có giảm giá (discount không null)
    const discountedPhones = await Phone.countDocuments({
      discount: { $ne: null },
    });

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        totalPhones,
        totalDiscounts,
        totalUsers,
        lowStockPhones,
        averagePrice: averagePrice[0]?.avgPrice || 0,
        discountedPhones,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

const deleteMultiplePhones = async (req, res) => {
  try {
    const { phoneIds } = req.body;

    if (!Array.isArray(phoneIds) || phoneIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide a list of phone IDs to delete.",
      });
    }

    // Kiểm tra tính hợp lệ của phoneIds
    const invalidIds = phoneIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more phone IDs are invalid.",
      });
    }

    // Tìm và xóa từng phone để kích hoạt middleware pre("remove")
    const phones = await Phone.find({ _id: { $in: phoneIds } });
    for (const phone of phones) {
      await phone.remove();
    }

    res.status(200).json({
      success: true,
      message: `${phones.length} phone(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting phones",
      error: error.message,
    });
  }
};

// Unlike a phone
const exportPhones = async (req, res) => {
  try {
    const phones = await Phone.find()
      .populate("category", "name")
      .populate("accessoryFor", "name")
      .populate(
        "discount",
        "code description discountType discountValue minimumOrderAmount"
      );

    const csvData = phones.map((phone) => ({
      name: phone.name,
      price: phone.price,
      finalPrice: phone.finalPrice,
      brand: phone.brand,
      category: phone.category?.name || "N/A",
      accessoryFor:
        phone.accessoryFor.map((cat) => cat.name).join(", ") || "N/A",
      discountCode: phone.discount?.code || "No discount",
      discountValue: phone.discount?.discountValue || 0,
      discountType: phone.discount?.discountType || "No discount",
      stock: phone.stock,
      rating: phone.rating,
      releaseDate: phone.releaseDate?.toISOString() || "N/A",
      warrantyPeriod: phone.warrantyPeriod || "N/A",
      isFeatured: phone.isFeatured,
      likes: phone.likes,
    }));

    res.status(200).json({
      success: true,
      message: "Phones exported successfully",
      data: csvData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error exporting phones",
      error: error.message,
    });
  }
};

const toggleLikePhone = asyncHandler(async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const phone = await Phone.findById(req.params.id);
    if (!phone) {
      return res
        .status(404)
        .json({ success: false, message: "Phone not found" });
    }
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const likeIndex = phone.likedBy.indexOf(userId);
    let message = "";

    if (likeIndex > -1) {
      phone.likedBy.splice(likeIndex, 1);
      phone.likes -= 1;
      message = "Toggled unlike on phone successfully";
    } else {
      phone.likedBy.push(userId);
      phone.likes += 1;
      message = "Toggled like on phone successfully";
    }
    // Cập nhật likes
    phone.likes = phone.likedBy.length; // Đồng bộ

    const savedPhone = await phone.save();

    const populatedPhone = await Phone.findById(savedPhone._id)
      .populate("likedBy", "username email")
      .populate("accessoryFor", "name slug");
    res.status(200).json({
      success: true,
      // message: "Toggled like on phone successfully",
      message: message,
      data: populatedPhone,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling like on phone",
      error: error.message,
    });
  }
});

const purchasePhone = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const phone = await Phone.findById(id);
    if (!phone) {
      return res.status(404).json({
        success: false,
        message: "Phone not found",
      });
    }

    // Kiểm tra tồn kho
    phone.checkStockAvailability(quantity);

    // Giảm số lượng hàng trong kho (phương thức này đã đồng bộ với Inventory)
    await phone.updateStockAfterPurchase(quantity);

    res.status(200).json({
      success: true,
      message: "Purchase successful",
      data: phone,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error purchasing phone",
      error: error.message,
    });
  }
};

const getSoldQuantity = async (req, res) => {
  try {
    const phone = await Phone.findById(req.params.id);
    if (!phone) throw new Error("Phone not found");

    const soldQuantity = await phone.getSoldQuantity();
    res.json({ soldQuantity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// const getBoughtTogether = asyncHandler(async (req, res) => {
//   try {
//     const { phoneId } = req.params;
//     console.log("=== START getBoughtTogether ===");
//     console.log("📱 Requested product ID:", phoneId);

//     // Kiểm tra ID hợp lệ
//     if (!mongoose.Types.ObjectId.isValid(phoneId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid product ID format",
//       });
//     }

//     // ==================== XÁC ĐỊNH LOẠI SẢN PHẨM CHÍNH ====================
//     let currentProduct = await Phone.findById(phoneId)
//       .populate("category", "name")
//       .populate("accessoryFor", "name")
//       .select("category brand name price finalPrice accessoryFor")
//       .lean();

//     let productType = "phone";
//     let ProductModel = Phone;
//     let mainCategoryId = null;

//     // Nếu không tìm thấy trong Phone, thử tìm trong Laptop
//     if (!currentProduct) {
//       console.log("🔍 Product not found in Phone, searching in Laptop...");
//       currentProduct = await Laptop.findById(phoneId)
//         .populate("category", "name")
//         .populate("accessoryFor", "name")
//         .select("category brand name price finalPrice accessoryFor")
//         .lean();

//       if (currentProduct) {
//         productType = "laptop";
//         ProductModel = Laptop;
//         mainCategoryId =
//           currentProduct.category?._id || currentProduct.category;
//         console.log("💻 Found product in Laptop collection");
//       }
//     }

//     if (!currentProduct) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found in both Phone and Laptop collections",
//       });
//     }

//     console.log(
//       `✅ Current Product: ${
//         currentProduct.name
//       } (${productType.toUpperCase()})`
//     );
//     console.log("📱 Category:", currentProduct.category?.name);
//     console.log("🎯 Accessory For:", currentProduct.accessoryFor);

//     // ==================== XÁC ĐỊNH LOẠI SẢN PHẨM ====================
//     const isMainProduct =
//       currentProduct.category &&
//       (!currentProduct.accessoryFor ||
//         currentProduct.accessoryFor.length === 0);
//     const isAccessory =
//       currentProduct.accessoryFor && currentProduct.accessoryFor.length > 0;

//     console.log(
//       `🔍 Product Type: ${
//         isMainProduct
//           ? productType.toUpperCase()
//           : isAccessory
//           ? "ACCESSORY"
//           : "UNKNOWN"
//       }`
//     );

//     // ==================== TẠO QUERY CHO SẢN PHẨM LIÊN QUAN ====================
//     let relatedQuery = {
//       _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
//     };

//     // ID của các category (CẦN CẬP NHẬT THEO DATABASE THỰC TẾ)
//     const SMARTPHONE_ACCESSORIES_CATEGORY_ID = "68c84930746ebe10973666a9";
//     const LAPTOP_ACCESSORIES_CATEGORY_ID = "68c84930746ebe10973666b0";
//     const LAPTOP_CATEGORY_ID = "68c84930746ebe10973666b1";

//     const collectionName = productType === "laptop" ? "laptops" : "phones";
//     const itemField = productType === "laptop" ? "laptop" : "phone";

//     let accessories = [];

//     // TH1: Sản phẩm là LAPTOP - tìm các laptop khác cùng category hoặc phụ kiện laptop
//     if (isMainProduct && productType === "laptop") {
//       console.log("💻 Finding related products for laptop");

//       // Tìm các laptop khác cùng category
//       if (mainCategoryId) {
//         relatedQuery.category = mainCategoryId;
//         console.log(
//           "🎯 Looking for other laptops in same category:",
//           mainCategoryId
//         );
//       }

//       // Lấy các laptop cùng category
//       const sameCategoryLaptops = await Laptop.find(relatedQuery)
//         .select(
//           "name price finalPrice image rating brand category specifications"
//         )
//         .sort({ rating: -1, createdAt: -1 })
//         .limit(6)
//         .lean();

//       console.log(
//         "💻 Same category laptops found:",
//         sameCategoryLaptops.length
//       );

//       sameCategoryLaptops.forEach((laptop) => {
//         let relatedType = "Laptop cùng loại";
//         const specs = laptop.specifications || {};

//         // Xác định loại laptop dựa trên specifications
//         if (specs.ram && parseInt(specs.ram) >= 16)
//           relatedType = "Laptop hiệu năng cao";
//         else if (specs.graphics && specs.graphics.includes("RTX"))
//           relatedType = "Laptop gaming";
//         else if (specs.weight && parseFloat(specs.weight) < 1.5)
//           relatedType = "Laptop siêu nhẹ";

//         accessories.push({
//           ...laptop,
//           accessoryType: relatedType,
//           compatibilityScore: 85,
//           fromHistory: false,
//           purchaseScore: 0,
//           isLaptop: true,
//         });
//       });

//       // Lấy phụ kiện laptop nếu chưa đủ
//       if (accessories.length < 8) {
//         const remainingLimit = 8 - accessories.length;
//         console.log(`🔍 Fetching ${remainingLimit} laptop accessories...`);

//         const laptopAccessories = await Laptop.find({
//           _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
//           accessoryFor: LAPTOP_ACCESSORIES_CATEGORY_ID,
//         })
//           .select(
//             "name price finalPrice image rating brand category accessoryFor specifications"
//           )
//           .sort({ rating: -1, createdAt: -1 })
//           .limit(remainingLimit)
//           .lean();

//         console.log("🎒 Laptop accessories found:", laptopAccessories.length);

//         laptopAccessories.forEach((accessory) => {
//           let accessoryType = "Phụ kiện laptop";
//           const name = (accessory.name || "").toLowerCase();

//           if (
//             name.includes("sạc") ||
//             name.includes("charger") ||
//             name.includes("adapter")
//           ) {
//             accessoryType = "Sạc & Adapter";
//           } else if (
//             name.includes("túi") ||
//             name.includes("case") ||
//             name.includes("balo") ||
//             name.includes("ba lô")
//           ) {
//             accessoryType = "Túi & Balo";
//           } else if (name.includes("chuột") || name.includes("mouse")) {
//             accessoryType = "Chuột";
//           } else if (name.includes("bàn phím") || name.includes("keyboard")) {
//             accessoryType = "Bàn phím";
//           } else if (
//             name.includes("ram") ||
//             name.includes("ssd") ||
//             name.includes("ổ cứng")
//           ) {
//             accessoryType = "Nâng cấp phần cứng";
//           } else if (name.includes("dock") || name.includes("hub")) {
//             accessoryType = "Dock & Hub";
//           } else if (name.includes("màn hình") || name.includes("monitor")) {
//             accessoryType = "Màn hình";
//           }

//           accessories.push({
//             ...accessory,
//             accessoryType,
//             compatibilityScore: 90,
//             fromHistory: false,
//             purchaseScore: 0,
//             isAccessory: true,
//           });
//         });
//       }
//     }
//     // TH2: Sản phẩm là ĐIỆN THOẠI - tìm phụ kiện điện thoại
//     else if (isMainProduct && productType === "phone") {
//       console.log("📱 Finding accessories for phone");

//       relatedQuery.accessoryFor = SMARTPHONE_ACCESSORIES_CATEGORY_ID;

//       const phoneAccessories = await Phone.find(relatedQuery)
//         .select(
//           "name price finalPrice image rating brand category accessoryFor specifications"
//         )
//         .sort({ rating: -1, createdAt: -1 })
//         .limit(8)
//         .lean();

//       console.log("📱 Phone accessories found:", phoneAccessories.length);

//       phoneAccessories.forEach((product) => {
//         let accessoryType = "Phụ kiện điện thoại";
//         const name = (product.name || "").toLowerCase();

//         if (
//           name.includes("sạc") ||
//           name.includes("charger") ||
//           name.includes("adapter")
//         ) {
//           accessoryType = "Sạc & Adapter";
//         } else if (
//           name.includes("cáp") ||
//           name.includes("cable") ||
//           name.includes("dây")
//         ) {
//           accessoryType = "Cáp & Dây";
//         } else if (
//           name.includes("tai nghe") ||
//           name.includes("headphone") ||
//           name.includes("earphone")
//         ) {
//           accessoryType = "Âm thanh";
//         } else if (
//           name.includes("ốp") ||
//           name.includes("case") ||
//           name.includes("bao da")
//         ) {
//           accessoryType = "Bảo vệ";
//         } else if (name.includes("pin") || name.includes("power bank")) {
//           accessoryType = "Pin dự phòng";
//         }

//         accessories.push({
//           ...product,
//           accessoryType,
//           compatibilityScore: 100,
//           fromHistory: false,
//           purchaseScore: 0,
//         });
//       });
//     }
//     // TH3: Sản phẩm là PHỤ KIỆN - tìm sản phẩm chính
//     else if (isAccessory) {
//       console.log("🎯 Finding main products for accessory");

//       if (
//         currentProduct.accessoryFor &&
//         currentProduct.accessoryFor.length > 0
//       ) {
//         const mainProductIds = currentProduct.accessoryFor.map(
//           (acc) => acc._id || acc
//         );

//         const mainProducts = await ProductModel.find({
//           category: { $in: mainProductIds },
//         })
//           .select("name price finalPrice image rating brand category")
//           .limit(8)
//           .lean();

//         console.log(
//           "🎯 Main products found for accessory:",
//           mainProducts.length
//         );

//         mainProducts.forEach((product) => {
//           accessories.push({
//             ...product,
//             accessoryType: "Sản phẩm chính",
//             compatibilityScore: 95,
//             fromHistory: false,
//             purchaseScore: 0,
//             isMainProduct: true,
//           });
//         });
//       }
//     }

//     // ==================== THÊM DỮ LIỆU TỪ LỊCH SỬ MUA HÀNG ====================
//     try {
//       console.log("📊 Checking purchase history...");

//       const purchaseHistory = await Order.aggregate([
//         {
//           $match: {
//             [`items.${itemField}`]: new mongoose.Types.ObjectId(phoneId),
//             orderStatus: { $in: ["delivered", "completed"] },
//           },
//         },
//         { $unwind: "$items" },
//         {
//           $match: {
//             [`items.${itemField}`]: {
//               $ne: new mongoose.Types.ObjectId(phoneId),
//             },
//           },
//         },
//         {
//           $lookup: {
//             from: collectionName,
//             localField: `items.${itemField}`,
//             foreignField: "_id",
//             as: "productInfo",
//           },
//         },
//         { $unwind: "$productInfo" },
//         {
//           $group: {
//             _id: `$items.${itemField}`,
//             purchaseCount: { $sum: "$items.quantity" },
//             productData: { $first: "$productInfo" },
//           },
//         },
//         { $sort: { purchaseCount: -1 } },
//         { $limit: 4 },
//       ]);

//       console.log("📊 Purchase history products:", purchaseHistory.length);

//       if (purchaseHistory.length > 0) {
//         purchaseHistory.forEach((item) => {
//           const exists = accessories.some(
//             (acc) => acc._id.toString() === item._id.toString()
//           );
//           if (!exists) {
//             let accessoryType = "Sản phẩm thường mua cùng";
//             if (productType === "laptop") {
//               if (
//                 item.productData.accessoryFor === LAPTOP_ACCESSORIES_CATEGORY_ID
//               ) {
//                 accessoryType = "Phụ kiện laptop";
//               } else {
//                 accessoryType = "Laptop liên quan";
//               }
//             }

//             accessories.push({
//               _id: item._id,
//               name: item.productData.name,
//               price: item.productData.price,
//               finalPrice: item.productData.finalPrice,
//               image: item.productData.image,
//               rating: item.productData.rating,
//               brand: item.productData.brand,
//               category: item.productData.category,
//               accessoryFor: item.productData.accessoryFor,
//               accessoryType,
//               fromHistory: true,
//               purchaseScore: item.purchaseCount * 10,
//               compatibilityScore: 95,
//             });
//           }
//         });
//       }
//     } catch (historyError) {
//       console.log("⚠️ No purchase history found:", historyError.message);
//     }

//     // ==================== FALLBACK: LẤY SẢN PHẨM PHỔ BIẾN ====================
//     if (accessories.length === 0) {
//       console.log(`🔄 FALLBACK: Getting popular ${productType} products`);

//       const fallbackQuery = {
//         _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
//       };

//       if (productType === "laptop") {
//         // Lấy laptop phổ biến
//         fallbackQuery.category = LAPTOP_CATEGORY_ID;
//       } else {
//         // Lấy phụ kiện điện thoại phổ biến
//         fallbackQuery.accessoryFor = SMARTPHONE_ACCESSORIES_CATEGORY_ID;
//       }

//       const fallbackProducts = await ProductModel.find(fallbackQuery)
//         .select("name price finalPrice image rating brand category")
//         .sort({ rating: -1, soldCount: -1 })
//         .limit(8)
//         .lean();

//       console.log(
//         `🔄 Fallback ${productType} products found:`,
//         fallbackProducts.length
//       );

//       fallbackProducts.forEach((product) => {
//         let accessoryType =
//           productType === "laptop" ? "Laptop phổ biến" : "Phụ kiện phổ biến";

//         accessories.push({
//           ...product,
//           accessoryType,
//           compatibilityScore: 80,
//           fromHistory: false,
//           purchaseScore: 0,
//           isFallback: true,
//         });
//       });
//     }

//     // ==================== SẮP XẾP VÀ GIỚI HẠN ====================
//     accessories.sort((a, b) => {
//       const scoreA =
//         (a.purchaseScore || 0) + (a.compatibilityScore || 0) + (a.rating || 0);
//       const scoreB =
//         (b.purchaseScore || 0) + (b.compatibilityScore || 0) + (b.rating || 0);
//       return scoreB - scoreA;
//     });

//     accessories = accessories.slice(0, 8);

//     console.log("✅ Final products count:", accessories.length);
//     console.log(
//       "📦 Products found:",
//       accessories.map((a) => `${a.name} [${a.accessoryType}]`)
//     );

//     // ==================== FORMAT DỮ LIỆU TRẢ VỀ ====================
//     const formattedAccessories = accessories.map((accessory, index) => {
//       const discountPercent =
//         accessory.price && accessory.finalPrice
//           ? Math.round(
//               ((accessory.price - accessory.finalPrice) / accessory.price) * 100
//             )
//           : 0;

//       return {
//         _id: accessory._id,
//         name: accessory.name,
//         price: accessory.price || 0,
//         finalPrice: accessory.finalPrice || accessory.price || 0,
//         image: accessory.image || "/images/placeholder.jpg",
//         rating: accessory.rating || 0,
//         brand: accessory.brand,
//         category: accessory.category,
//         accessoryType: accessory.accessoryType,
//         discountPercent,
//         fromHistory: accessory.fromHistory || false,
//         isFallback: accessory.isFallback || false,
//         compatibility: "high",
//         priority: index + 1,
//         isLaptop: accessory.isLaptop || false,
//         isAccessory: accessory.isAccessory || false,
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       message:
//         formattedAccessories.length > 0
//           ? "Bought together products retrieved successfully"
//           : "No related products found",
//       data: formattedAccessories,
//       metadata: {
//         total: formattedAccessories.length,
//         fromHistory: formattedAccessories.filter((a) => a.fromHistory).length,
//         fromFallback: formattedAccessories.filter((a) => a.isFallback).length,
//         laptopsCount: formattedAccessories.filter((a) => a.isLaptop).length,
//         accessoriesCount: formattedAccessories.filter((a) => a.isAccessory)
//           .length,
//         productType: productType,
//         currentProduct: currentProduct.name,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error in getBoughtTogether:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching bought together products",
//       error: error.message,
//     });
//   }
// });
const getBoughtTogether = asyncHandler(async (req, res) => {
  try {
    const { phoneId } = req.params;
    console.log("=== START getBoughtTogether ===");
    console.log("📱 Requested product ID:", phoneId);

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(phoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // ==================== XÁC ĐỊNH LOẠI SẢN PHẨM CHÍNH ====================
    let currentProduct = await Phone.findById(phoneId)
      .populate("category", "name")
      .populate("accessoryFor", "name")
      .select("category brand name price finalPrice accessoryFor")
      .lean();

    let productType = "phone";
    let ProductModel = Phone;
    let mainCategoryId = null;

    // Nếu không tìm thấy trong Phone, thử tìm trong Laptop
    if (!currentProduct) {
      console.log("🔍 Product not found in Phone, searching in Laptop...");
      currentProduct = await Laptop.findById(phoneId)
        .populate("category", "name")
        .populate("accessoryFor", "name")
        .select("category brand name price finalPrice accessoryFor")
        .lean();

      if (currentProduct) {
        productType = "laptop";
        ProductModel = Laptop;
        mainCategoryId =
          currentProduct.category?._id || currentProduct.category;
        console.log("💻 Found product in Laptop collection");
      }
    }

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found in both Phone and Laptop collections",
      });
    }

    console.log(
      `✅ Current Product: ${
        currentProduct.name
      } (${productType.toUpperCase()})`
    );
    console.log("📱 Category:", currentProduct.category?.name);
    console.log("🎯 Accessory For:", currentProduct.accessoryFor);

    // ==================== XÁC ĐỊNH LOẠI SẢN PHẨM ====================
    const isMainProduct =
      currentProduct.category &&
      (!currentProduct.accessoryFor ||
        currentProduct.accessoryFor.length === 0);
    const isAccessory =
      currentProduct.accessoryFor && currentProduct.accessoryFor.length > 0;

    console.log(
      `🔍 Product Type: ${
        isMainProduct
          ? productType.toUpperCase()
          : isAccessory
          ? "ACCESSORY"
          : "UNKNOWN"
      }`
    );

    // ==================== LẤY CATEGORY ID CỦA SẢN PHẨM HIỆN TẠI ====================
    const currentProductCategoryId =
      currentProduct.category?._id?.toString() ||
      currentProduct.category?.toString();
    console.log("🎯 Current product category ID:", currentProductCategoryId);

    let accessories = [];

    // TH1: SẢN PHẨM LÀ SẢN PHẨM CHÍNH (điện thoại/laptop) - TÌM PHỤ KIỆN TƯƠNG THÍCH
    if (isMainProduct) {
      console.log(`🔍 Finding accessories for ${productType}`);

      // QUAN TRỌNG: Tìm phụ kiện CÓ CHỨA category của sản phẩm hiện tại trong accessoryFor
      // const compatibleAccessories = await ProductModel.find({
      //   _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
      //   accessoryFor: { $in: [currentProductCategoryId] }, // PHỤ KIỆN CÓ CHỨA CATEGORY CỦA SẢN PHẨM HIỆN TẠI
      // })
      const compatibleAccessories = await ProductModel.find({
        _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
        accessoryFor: {
          $in: [new mongoose.Types.ObjectId(currentProductCategoryId)],
        },
      })
        .select(
          "name price finalPrice image rating brand category accessoryFor specifications"
        )
        .sort({ rating: -1, createdAt: -1 })
        .limit(20)
        .lean();

      console.log(
        `🎯 Compatible accessories found: ${compatibleAccessories.length}`
      );

      compatibleAccessories.forEach((accessory) => {
        let accessoryType =
          productType === "laptop" ? "Phụ kiện laptop" : "Phụ kiện điện thoại";
        const name = (accessory.name || "").toLowerCase();

        // Phân loại cho laptop
        if (productType === "laptop") {
          if (
            name.includes("sạc") ||
            name.includes("charger") ||
            name.includes("adapter")
          ) {
            accessoryType = "Sạc & Adapter";
          } else if (
            name.includes("túi") ||
            name.includes("case") ||
            name.includes("balo") ||
            name.includes("ba lô")
          ) {
            accessoryType = "Túi & Balo";
          } else if (name.includes("chuột") || name.includes("mouse")) {
            accessoryType = "Chuột";
          } else if (name.includes("bàn phím") || name.includes("keyboard")) {
            accessoryType = "Bàn phím";
          } else if (
            name.includes("ram") ||
            name.includes("ssd") ||
            name.includes("ổ cứng")
          ) {
            accessoryType = "Nâng cấp phần cứng";
          } else if (name.includes("dock") || name.includes("hub")) {
            accessoryType = "Dock & Hub";
          } else if (name.includes("màn hình") || name.includes("monitor")) {
            accessoryType = "Màn hình";
          } else if (
            name.includes("cáp") ||
            name.includes("cable") ||
            name.includes("usb") ||
            name.includes("hdmi")
          ) {
            accessoryType = "Cáp & Kết nối";
          }
        }
        // Phân loại cho điện thoại
        else {
          if (
            name.includes("sạc") ||
            name.includes("charger") ||
            name.includes("adapter") ||
            name.includes("pin")
          ) {
            accessoryType = "Sạc & Adapter";
          } else if (
            name.includes("cáp") ||
            name.includes("cable") ||
            name.includes("dây")
          ) {
            accessoryType = "Cáp & Dây";
          } else if (
            name.includes("tai nghe") ||
            name.includes("headphone") ||
            name.includes("earphone")
          ) {
            accessoryType = "Âm thanh";
          } else if (
            name.includes("ốp") ||
            name.includes("case") ||
            name.includes("bao da")
          ) {
            accessoryType = "Bảo vệ";
          } else if (name.includes("pin") || name.includes("power bank")) {
            accessoryType = "Pin dự phòng";
          } else if (
            name.includes("smartwatch") ||
            name.includes("đồng hồ") ||
            name.includes("watch")
          ) {
            accessoryType = "Đồng hồ thông minh";
          } else if (
            name.includes("thẻ nhớ") ||
            name.includes("Thẻ nhớ") ||
            name.includes("memory card") ||
            name.includes("sd card") ||
            name.includes("microsd") ||
            name.includes("usb drive") ||
            name.includes("flash drive") ||
            name.includes("ổ cứng di động") ||
            name.includes("external hard drive") ||
            name.includes("ssd di động") ||
            name.includes("portable ssd")
          ) {
            accessoryType = "Thẻ nhớ & Lưu trữ";
          }
        }

        accessories.push({
          ...accessory,
          accessoryType,
          compatibilityScore: 100, // Điểm cao vì được chỉ định tương thích
          fromHistory: false,
          purchaseScore: 0,
          isAccessory: true,
        });
      });

      // Nếu không đủ phụ kiện tương thích, thêm sản phẩm cùng loại
      if (
        accessories.length < 6 &&
        productType === "laptop" &&
        mainCategoryId
      ) {
        const remainingLimit = 6 - accessories.length;
        console.log(`💻 Fetching ${remainingLimit} related laptops...`);

        const relatedLaptops = await Laptop.find({
          _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
          category: mainCategoryId,
        })
          .select(
            "name price finalPrice image rating brand category specifications"
          )
          .sort({ rating: -1, createdAt: -1 })
          .limit(remainingLimit)
          .lean();

        console.log("💻 Related laptops found:", relatedLaptops.length);

        relatedLaptops.forEach((laptop) => {
          let relatedType = "Laptop cùng loại";
          const specs = laptop.specifications || {};

          if (specs.ram && parseInt(specs.ram) >= 16)
            relatedType = "Laptop hiệu năng cao";
          else if (specs.graphics && specs.graphics.includes("RTX"))
            relatedType = "Laptop gaming";
          else if (specs.weight && parseFloat(specs.weight) < 1.5)
            relatedType = "Laptop siêu nhẹ";

          accessories.push({
            ...laptop,
            accessoryType: relatedType,
            compatibilityScore: 85,
            fromHistory: false,
            purchaseScore: 0,
            isLaptop: true,
          });
        });
      }
    }
    // TH2: SẢN PHẨM LÀ PHỤ KIỆN - TÌM SẢN PHẨM CHÍNH TƯƠNG THÍCH
    else if (isAccessory) {
      console.log("🎯 Finding main products for accessory");

      if (
        currentProduct.accessoryFor &&
        currentProduct.accessoryFor.length > 0
      ) {
        const compatibleCategoryIds = currentProduct.accessoryFor.map(
          (acc) => acc._id?.toString() || acc.toString()
        );
        console.log(
          "🎯 Compatible category IDs for this accessory:",
          compatibleCategoryIds
        );

        const mainProducts = await ProductModel.find({
          category: { $in: compatibleCategoryIds },
        })
          .select("name price finalPrice image rating brand category")
          .limit(8)
          .lean();

        console.log("🎯 Compatible main products found:", mainProducts.length);

        mainProducts.forEach((product) => {
          accessories.push({
            ...product,
            accessoryType: "Sản phẩm chính tương thích",
            compatibilityScore: 95,
            fromHistory: false,
            purchaseScore: 0,
            isMainProduct: true,
          });
        });
      }
    }

    // ==================== THÊM DỮ LIỆU TỪ LỊCH SỬ MUA HÀNG ====================
    try {
      console.log("📊 Checking purchase history...");

      const collectionName = productType === "laptop" ? "laptops" : "phones";
      const itemField = productType === "laptop" ? "laptop" : "phone";

      const purchaseHistory = await Order.aggregate([
        {
          $match: {
            [`items.${itemField}`]: new mongoose.Types.ObjectId(phoneId),
            orderStatus: { $in: ["delivered", "completed"] },
          },
        },
        { $unwind: "$items" },
        {
          $match: {
            [`items.${itemField}`]: {
              $ne: new mongoose.Types.ObjectId(phoneId),
            },
          },
        },
        {
          $lookup: {
            from: collectionName,
            localField: `items.${itemField}`,
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: `$items.${itemField}`,
            purchaseCount: { $sum: "$items.quantity" },
            productData: { $first: "$productInfo" },
          },
        },
        { $sort: { purchaseCount: -1 } },
        { $limit: 4 },
      ]);

      console.log("📊 Purchase history products:", purchaseHistory.length);

      if (purchaseHistory.length > 0) {
        purchaseHistory.forEach((item) => {
          const exists = accessories.some(
            (acc) => acc._id.toString() === item._id.toString()
          );
          if (!exists) {
            let accessoryType = "Sản phẩm thường mua cùng";

            accessories.push({
              _id: item._id,
              name: item.productData.name,
              price: item.productData.price,
              finalPrice: item.productData.finalPrice,
              image: item.productData.image,
              rating: item.productData.rating,
              brand: item.productData.brand,
              category: item.productData.category,
              accessoryFor: item.productData.accessoryFor,
              accessoryType,
              fromHistory: true,
              purchaseScore: item.purchaseCount * 10,
              compatibilityScore: 95,
            });
          }
        });
      }
    } catch (historyError) {
      console.log("⚠️ No purchase history found:", historyError.message);
    }

    // ==================== FALLBACK: LẤY SẢN PHẨM PHỔ BIẾN ====================
    if (accessories.length === 0) {
      console.log(`🔄 FALLBACK: Getting popular ${productType} products`);

      const fallbackProducts = await ProductModel.find({
        _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
      })
        .select("name price finalPrice image rating brand category")
        .sort({ rating: -1, soldCount: -1 })
        .limit(8)
        .lean();

      console.log(
        `🔄 Fallback ${productType} products found:`,
        fallbackProducts.length
      );

      fallbackProducts.forEach((product) => {
        let accessoryType =
          productType === "laptop"
            ? "Sản phẩm liên quan"
            : "Sản phẩm liên quan";

        accessories.push({
          ...product,
          accessoryType,
          compatibilityScore: 60,
          fromHistory: false,
          purchaseScore: 0,
          isFallback: true,
        });
      });
    }

    // ==================== SẮP XẾP VÀ GIỚI HẠN ====================
    accessories.sort((a, b) => {
      const scoreA =
        (a.purchaseScore || 0) + (a.compatibilityScore || 0) + (a.rating || 0);
      const scoreB =
        (b.purchaseScore || 0) + (b.compatibilityScore || 0) + (b.rating || 0);
      return scoreB - scoreA;
    });

    accessories = accessories.slice(0, 20);

    console.log("✅ Final products count:", accessories.length);
    console.log(
      "📦 Products found:",
      accessories.map((a) => `${a.name} [${a.accessoryType}]`)
    );

    // ==================== FORMAT DỮ LIỆU TRẢ VỀ ====================
    const formattedAccessories = accessories.map((accessory, index) => {
      const discountPercent =
        accessory.price && accessory.finalPrice
          ? Math.round(
              ((accessory.price - accessory.finalPrice) / accessory.price) * 100
            )
          : 0;

      return {
        _id: accessory._id,
        name: accessory.name,
        price: accessory.price || 0,
        finalPrice: accessory.finalPrice || accessory.price || 0,
        image: accessory.image || "/images/placeholder.jpg",
        rating: accessory.rating || 0,
        brand: accessory.brand,
        category: accessory.category,
        accessoryType: accessory.accessoryType,
        discountPercent,
        fromHistory: accessory.fromHistory || false,
        isFallback: accessory.isFallback || false,
        compatibility: "high",
        priority: index + 1,
        isLaptop: accessory.isLaptop || false,
        isAccessory: accessory.isAccessory || false,
      };
    });

    return res.status(200).json({
      success: true,
      message:
        formattedAccessories.length > 0
          ? "Bought together products retrieved successfully"
          : "No related products found",
      data: formattedAccessories,
      metadata: {
        total: formattedAccessories.length,
        fromHistory: formattedAccessories.filter((a) => a.fromHistory).length,
        fromFallback: formattedAccessories.filter((a) => a.isFallback).length,
        laptopsCount: formattedAccessories.filter((a) => a.isLaptop).length,
        accessoriesCount: formattedAccessories.filter((a) => a.isAccessory)
          .length,
        productType: productType,
        currentProduct: currentProduct.name,
      },
    });
  } catch (error) {
    console.error("❌ Error in getBoughtTogether:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching bought together products",
      error: error.message,
    });
  }
});

const getRelatedProducts = asyncHandler(async (req, res) => {
  try {
    const { phoneId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(phoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const currentProduct = await Phone.findById(phoneId)
      .populate("category", "name")
      .select("category brand name price finalPrice")
      .lean();

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log("🔍 Current Product:", currentProduct.name);

    let relatedProducts = [];
    const productMap = new Map();

    // ==================== NGUỒN 1: SẢN PHẨM CÙNG MUA ====================
    try {
      const coPurchasedProducts = await Order.aggregate([
        {
          $match: {
            "items.phone": new mongoose.Types.ObjectId(phoneId),
            orderStatus: { $in: ["delivered", "completed"] },
          },
        },
        { $unwind: "$items" },
        {
          $match: {
            "items.phone": { $ne: new mongoose.Types.ObjectId(phoneId) },
          },
        },
        {
          $group: {
            _id: "$items.phone",
            orderCount: { $sum: 1 },
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { orderCount: -1, totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "phones",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $project: {
            _id: 1,
            name: "$productInfo.name",
            price: "$productInfo.price",
            finalPrice: "$productInfo.finalPrice",
            image: "$productInfo.image",
            rating: "$productInfo.rating",
            reserved: "$productInfo.reserved",
            brand: "$productInfo.brand",
            category: "$productInfo.category",
          },
        },
      ]);

      coPurchasedProducts.forEach((product) => {
        productMap.set(product._id.toString(), {
          ...product,
          score:
            4.0 +
            (product.rating || 0) * 0.3 +
            Math.log((product.reserved || 0) + 1) * 0.2 +
            0.5,
          fromHistory: true,
        });
      });
    } catch (error) {
      console.log("⚠️ No purchase history found");
    }

    // ==================== NGUỒN 2: CÙNG BRAND VÀ CATEGORY ====================
    if (currentProduct.category && currentProduct.brand) {
      const sameBrandCategoryProducts = await Phone.find({
        _id: { $ne: phoneId },
        category: currentProduct.category,
        brand: currentProduct.brand,
      })
        .select("name price finalPrice image rating reserved brand category")
        .sort({ rating: -1, reserved: -1 })
        .limit(4)
        .lean();

      sameBrandCategoryProducts.forEach((product) => {
        const existing = productMap.get(product._id.toString());
        if (existing) {
          existing.score += 1.5; // Thêm điểm nếu đã tồn tại
        } else {
          productMap.set(product._id.toString(), {
            ...product,
            score:
              3.0 +
              (product.rating || 0) * 0.3 +
              Math.log((product.reserved || 0) + 1) * 0.2,
          });
        }
      });
    }

    // ==================== NGUỒN 3: CÙNG CATEGORY, CÙNG PHÂN KHÚC GIÁ ====================
    if (currentProduct.category) {
      const currentPrice = currentProduct.finalPrice || currentProduct.price;
      const priceRange = {
        min: currentPrice * 0.6,
        max: currentPrice * 1.4,
      };

      const sameCategoryPriceRangeProducts = await Phone.find({
        _id: { $ne: phoneId },
        category: currentProduct.category,
        $or: [
          { finalPrice: { $gte: priceRange.min, $lte: priceRange.max } },
          { price: { $gte: priceRange.min, $lte: priceRange.max } },
        ],
      })
        .select("name price finalPrice image rating reserved brand category")
        .sort({ rating: -1 })
        .limit(4)
        .lean();

      sameCategoryPriceRangeProducts.forEach((product) => {
        const existing = productMap.get(product._id.toString());
        if (existing) {
          existing.score += 1.0;
        } else {
          productMap.set(product._id.toString(), {
            ...product,
            score:
              2.0 +
              (product.rating || 0) * 0.3 +
              Math.log((product.reserved || 0) + 1) * 0.2,
          });
        }
      });
    }

    // ==================== NGUỒN 4: CÙNG CATEGORY ====================
    if (currentProduct.category) {
      const sameCategoryProducts = await Phone.find({
        _id: { $ne: phoneId },
        category: currentProduct.category,
      })
        .select("name price finalPrice image rating reserved brand category")
        .sort({ rating: -1, createdAt: -1 })
        .limit(6)
        .lean();

      sameCategoryProducts.forEach((product) => {
        const existing = productMap.get(product._id.toString());
        if (!existing) {
          productMap.set(product._id.toString(), {
            ...product,
            score:
              1.0 +
              (product.rating || 0) * 0.3 +
              Math.log((product.reserved || 0) + 1) * 0.2,
          });
        }
      });
    }

    // ==================== CHUYỂN THÀNH MẢNG VÀ SẮP XẾP ====================
    relatedProducts = Array.from(productMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // ==================== FALLBACK: SẢN PHẨM PHỔ BIẾN ====================
    if (relatedProducts.length < 4) {
      const popularProducts = await Phone.find({
        _id: { $ne: phoneId },
        ...(currentProduct.category && { category: currentProduct.category }),
      })
        .select("name price finalPrice image rating reserved brand category")
        .sort({ reserved: -1, rating: -1 })
        .limit(8)
        .lean();

      const additionalProducts = popularProducts
        .filter(
          (p) =>
            !relatedProducts.some(
              (rp) => rp._id.toString() === p._id.toString()
            )
        )
        .slice(0, 4 - relatedProducts.length);

      relatedProducts = [...relatedProducts, ...additionalProducts];
    }

    // ==================== FORMAT DỮ LIỆU ====================
    const formattedProducts = relatedProducts.map((product, index) => {
      const discountPercent =
        product.price && product.finalPrice
          ? Math.round(
              ((product.price - product.finalPrice) / product.price) * 100
            )
          : 0;

      // Xác định lý do đề xuất
      const reasons = [];
      if (product.fromHistory) reasons.push("Frequently bought together");
      if (product.brand === currentProduct.brand) reasons.push("Same brand");
      if (
        product.category?.toString() === currentProduct.category?.toString()
      ) {
        reasons.push("Same category");
      }

      return {
        _id: product._id,
        name: product.name,
        price: product.price || 0,
        finalPrice: product.finalPrice || product.price || 0,
        image: product.image || "/images/placeholder.jpg",
        rating: product.rating || 0,
        reserved: product.reserved || 0,
        brand: product.brand,
        category: product.category,
        discountPercent,
        priority: index + 1,
        matchReason:
          reasons.length > 0 ? reasons.join(" • ") : "Popular product",
      };
    });

    console.log("✅ Final related products:", formattedProducts.length);

    res.status(200).json({
      success: true,
      message: "Related products retrieved successfully",
      data: formattedProducts,
      metadata: {
        total: formattedProducts.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching related products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching related products",
      error: error.message,
    });
  }
});

module.exports = {
  getPhones,
  addMultiplePhones,
  addPhones,
  getPhoneById,
  updatePhones,
  deletePhones,
  searchPhones,
  filterByCategory,
  getStatistics,
  deleteMultiplePhones,
  exportPhones,
  toggleLikePhone,
  purchasePhone,
  getSoldQuantity,
  getRelatedProducts,
  getBoughtTogether,
};
