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
      );

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

    // Kiểm tra nếu discount được cung cấp
    // let validatedDiscount = null;
    // if (discount) {
    //   const existingDiscount = await Discount.findById(discount);
    //   if (!existingDiscount) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid discount ID provided",
    //     });
    //   }
    //   validatedDiscount = discount; // Discount hợp lệ
    // }

    // Kiểm tra category hợp lệ
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
      // .populate("reviews", "rating comment") // If your Review model has rating and comment
      // .populate("reviews", "phone rating content user createdAt")

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

    // const summary = await getReviewSummary(id);
    const summary = await getReviewSummary(phone);
    const data = { ...phone, ...summary.data };

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

    res.status(200).json({
      success: true,
      message: "Phone retrieved successfully",
      data: phone,
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
      );

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
    const { name, brand, category, minPrice, maxPrice } = req.query;
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
    const { name, category } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Please provide a category to filter.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const filter = {};
    if (name) filter.name = new RegExp(name, "i");
    filter.category = category;

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

    const populatedPhone = await Phone.findById(savedPhone._id).populate(
      "likedBy",
      "username email"
    );
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

// const getRelatedProducts = asyncHandler(async (req, res) => {
//   try {
//     const { phoneId } = req.params;

//     // Kiểm tra xem phoneId có hợp lệ không
//     if (!mongoose.Types.ObjectId.isValid(phoneId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid phoneId",
//       });
//     }

//     const currentPhone = await Phone.findById(phoneId).select("category brand");
//     if (!currentPhone) {
//       return res.status(404).json({
//         success: false,
//         message: "Phone not found",
//       });
//     }

//     // Cập nhật hoặc tạo view history
//     const cookies = req.cookies || {}; // Đảm bảo req.cookies không undefined
//     const identifier = req.user?.id || cookies.anonymousId || uuidv4();
//     if (!cookies.anonymousId && !req.user?.id) {
//       res.cookie("anonymousId", identifier, {
//         maxAge: 90 * 24 * 60 * 60 * 1000,
//         httpOnly: true,
//       }); // Cookie tồn tại 90 ngày
//     }

//     let viewRecord = await ViewHistory.findOne({
//       product: phoneId,
//       $or: [
//         {
//           user: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null,
//         },
//         { anonymousId: req.user?.id ? undefined : identifier },
//       ].filter(Boolean), // Loại bỏ undefined/null
//     });
//     if (viewRecord) {
//       viewRecord.viewCount += 1;
//       viewRecord.lastViewed = new Date();
//       await viewRecord.save();
//     } else {
//       await ViewHistory.create({
//         product: phoneId,
//         user: req.user?.id,
//         anonymousId: req.user?.id ? undefined : identifier,
//       });
//     }

//     // Bước 1: Lấy sản phẩm liên quan dựa trên category và brand
//     const baseRelatedProducts = await Phone.aggregate([
//       {
//         $match: {
//           _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
//           $or: [
//             { category: currentPhone.category },
//             { brand: currentPhone.brand },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "categories",
//           localField: "category",
//           foreignField: "_id",
//           as: "categoryDetails",
//         },
//       },
//       {
//         $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true },
//       },
//       {
//         $project: {
//           name: 1,
//           price: 1,
//           finalPrice: 1,
//           image: 1,
//           "categoryDetails.name": 1,
//           brand: 1,
//           images: { $arrayElemAt: ["$images", 0] },
//           reserved: 1,
//           rating: 1,
//         },
//       },
//       { $sort: { reserved: -1, rating: -1 } },
//       { $limit: 10 },
//     ]);

//     // Bước 2: Phân tích sản phẩm thường mua cùng từ Order
//     const frequentlyBoughtTogether = await Order.aggregate([
//       {
//         $match: { orderStatus: "Completed" },
//       },
//       { $unwind: "$items" },
//       {
//         $match: { "items.phone": new mongoose.Types.ObjectId(phoneId) },
//       },
//       {
//         $group: {
//           _id: "$items.phone",
//           relatedProducts: { $push: "$items.phone" },
//         },
//       },
//       {
//         $unwind: "$relatedProducts",
//       },
//       {
//         $match: {
//           relatedProducts: { $ne: new mongoose.Types.ObjectId(phoneId) },
//         },
//       },
//       {
//         $group: {
//           _id: "$relatedProducts",
//           frequency: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: "phones",
//           localField: "_id",
//           foreignField: "_id",
//           as: "productDetails",
//         },
//       },
//       {
//         $unwind: "$productDetails",
//       },
//       {
//         $project: {
//           _id: 1,
//           frequency: 1,
//           name: "$productDetails.name",
//           price: "$productDetails.price",
//           finalPrice: "$productDetails.finalPrice",
//           image: "$productDetails.image",
//           category: "$productDetails.category",
//           brand: "$productDetails.brand",
//           images: { $arrayElemAt: ["$productDetails.images", 0] },
//           reserved: "$productDetails.reserved",
//           rating: "$productDetails.rating",
//         },
//       },
//       { $sort: { frequency: -1, reserved: -1 } },
//       { $limit: 5 },
//     ]);

//     let popularViewedProducts = [];
//     if (identifier) {
//       const viewHistory = await ViewHistory.aggregate([
//         {
//           $match: {
//             $or: [
//               {
//                 user: req.user?.id
//                   ? new mongoose.Types.ObjectId(req.user.id)
//                   : null,
//               },
//               { anonymousId: identifier },
//             ].filter(Boolean),
//             viewCount: { $gt: 2 },
//           },
//         },
//         {
//           $lookup: {
//             from: "phones",
//             localField: "product",
//             foreignField: "_id",
//             as: "productDetails",
//           },
//         },
//         {
//           $unwind: "$productDetails",
//         },
//         {
//           $match: {
//             "productDetails._id": { $ne: new mongoose.Types.ObjectId(phoneId) },
//           },
//         },
//         {
//           $project: {
//             _id: "$productDetails._id",
//             name: "$productDetails.name",
//             price: "$productDetails.price",
//             finalPrice: "$productDetails.finalPrice",
//             image: "$productDetails.image",
//             category: "$productDetails.category",
//             brand: "$productDetails.brand",
//             images: { $arrayElemAt: ["$productDetails.images", 0] },
//             reserved: "$productDetails.reserved",
//             rating: "$productDetails.rating",
//             viewCount: 1,
//           },
//         },
//         { $sort: { viewCount: -1 } },
//         { $limit: 5 },
//       ]);
//       popularViewedProducts = viewHistory;
//     }

//     const allRelatedPhones = [
//       ...baseRelatedProducts,
//       ...frequentlyBoughtTogether,
//       ...popularViewedProducts,
//     ]
//       .reduce((unique, phone) => {
//         if (!unique.some((p) => p._id.toString() === phone._id.toString())) {
//           unique.push(phone);
//         }
//         return unique;
//       }, [])
//       .slice(0, 5);

//     // Định dạng dữ liệu
//     const formattedProducts = await Promise.all(
//       allRelatedPhones.map(async (phone) => ({
//         _id: phone._id,
//         name: phone.name,
//         price: phone.price,
//         finalPrice: phone.finalPrice,
//         image:
//           phone.image ||
//           (phone.images && phone.images[0]?.url) ||
//           "https://via.placeholder.com/100",
//         category:
//           phone.categoryDetails?.name ||
//           (
//             await Category.findById(phone.category)
//           )?.name ||
//           "Unknown",
//         brand: phone.brand,
//         reserved: phone.reserved,
//         rating: phone.rating,
//       }))
//     );

//     res.status(200).json({
//       success: true,
//       message: "Related products retrieved successfully",
//       data: formattedProducts,
//     });
//   } catch (error) {
//     console.error("Error fetching related products:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching related products",
//       error: error.message,
//     });
//   }
// });
// const getRelatedProducts = asyncHandler(async (req, res) => {
//   const { phoneId } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(phoneId)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid phoneId",
//     });
//   }

//   const currentPhone = await Phone.findById(phoneId).select("category brand");
//   if (!currentPhone) {
//     return res.status(404).json({
//       success: false,
//       message: "Phone not found",
//     });
//   }

//   // Xử lý lịch sử xem với logic riêng biệt cho user so với ẩn danh
//   const cookies = req.cookies || {};
//   let identifier = cookies.anonymousId || uuidv4();
//   if (!cookies.anonymousId && !req.user?.id) {
//     res.cookie("anonymousId", identifier, {
//       maxAge: 90 * 24 * 60 * 60 * 1000,
//       httpOnly: true,
//     });
//   }

//   const isLoggedIn = !!req.user?.id;
//   let viewRecord;
//   if (isLoggedIn) {
//     viewRecord = await ViewHistory.findOne({
//       product: phoneId,
//       user: new mongoose.Types.ObjectId(req.user.id),
//     });
//   } else {
//     viewRecord = await ViewHistory.findOne({
//       product: phoneId,
//       anonymousId: identifier,
//     });
//   }

//   if (viewRecord) {
//     viewRecord.viewCount += 1;
//     viewRecord.lastViewed = new Date();
//     await viewRecord.save();
//   } else {
//     await ViewHistory.create({
//       product: phoneId,
//       ...(isLoggedIn ? { user: req.user.id } : { anonymousId: identifier }),
//     });
//   }

//   // Tổng hợp tối ưu với $facet cho tất cả các loại liên quan
//   const [relatedResults, categoryMap] = await Promise.all([
//     Phone.aggregate([
//       {
//         $facet: {
//           baseRelated: [
//             {
//               $match: {
//                 _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
//                 $or: [
//                   { category: currentPhone.category },
//                   { brand: currentPhone.brand },
//                 ],
//               },
//             },
//             {
//               $lookup: {
//                 from: "categories",
//                 localField: "category",
//                 foreignField: "_id",
//                 as: "categoryDetails",
//               },
//             },
//             {
//               $unwind: {
//                 path: "$categoryDetails",
//                 preserveNullAndEmptyArrays: true,
//               },
//             },
//             {
//               $project: {
//                 name: 1,
//                 price: 1,
//                 finalPrice: 1,
//                 image: 1,
//                 "categoryDetails.name": 1,
//                 brand: 1,
//                 images: { $arrayElemAt: ["$images", 0] },
//                 reserved: 1,
//                 rating: 1,
//               },
//             },
//             { $sort: { reserved: -1, rating: -1 } },
//             { $limit: 10 },
//           ],
//           frequentlyBought: [
//             {
//               $lookup: {
//                 from: "orders",
//                 let: { phoneId: new mongoose.Types.ObjectId(phoneId) },
//                 pipeline: [
//                   { $match: { $expr: { $eq: ["$orderStatus", "Completed"] } } },
//                   { $unwind: "$items" },
//                   { $match: { $expr: { $eq: ["$items.phone", "$$phoneId"] } } },
//                   {
//                     $group: {
//                       _id: "$items.phone",
//                       relatedProducts: { $push: "$items.phone" },
//                     },
//                   },
//                   { $unwind: "$relatedProducts" },
//                   { $match: { relatedProducts: { $ne: "$$phoneId" } } },
//                   {
//                     $group: {
//                       _id: "$relatedProducts",
//                       frequency: { $sum: 1 },
//                     },
//                   },
//                   {
//                     $lookup: {
//                       from: "phones",
//                       localField: "_id",
//                       foreignField: "_id",
//                       as: "productDetails",
//                     },
//                   },
//                   { $unwind: "$productDetails" },
//                   {
//                     $project: {
//                       _id: 1,
//                       frequency: 1,
//                       name: "$productDetails.name",
//                       price: "$productDetails.price",
//                       finalPrice: "$productDetails.finalPrice",
//                       image: "$productDetails.image",
//                       category: "$productDetails.category",
//                       brand: "$productDetails.brand",
//                       images: { $arrayElemAt: ["$productDetails.images", 0] },
//                       reserved: "$productDetails.reserved",
//                       rating: "$productDetails.rating",
//                     },
//                   },
//                   { $sort: { frequency: -1, reserved: -1 } },
//                   { $limit: 5 },
//                 ],
//                 as: "frequentOrders",
//               },
//             },
//             {
//               $unwind: {
//                 path: "$frequentOrders",
//                 preserveNullAndEmptyArrays: true,
//               },
//             },
//             { $replaceRoot: { newRoot: { $ifNull: ["$frequentOrders", {}] } } },
//           ],
//           popularViewed: identifier
//             ? [
//                 // Facet có điều kiện cho xem
//                 {
//                   $lookup: {
//                     from: "viewhistories",
//                     let: {
//                       userId: isLoggedIn
//                         ? new mongoose.Types.ObjectId(req.user.id)
//                         : null,
//                       anonId: isLoggedIn ? null : identifier,
//                       phoneId: new mongoose.Types.ObjectId(phoneId),
//                     },
//                     pipeline: [
//                       {
//                         $match: {
//                           $expr: {
//                             $cond: {
//                               if: { $eq: ["$$userId", null] },
//                               then: {
//                                 $and: [
//                                   { anonymousId: "$$anonId" },
//                                   { viewCount: { $gt: 2 } },
//                                 ],
//                               },
//                               else: {
//                                 $and: [
//                                   { user: "$$userId" },
//                                   { viewCount: { $gt: 2 } },
//                                 ],
//                               },
//                             },
//                           },
//                           product: { $ne: "$$phoneId" },
//                         },
//                       },
//                       {
//                         $lookup: {
//                           from: "phones",
//                           localField: "product",
//                           foreignField: "_id",
//                           as: "productDetails",
//                         },
//                       },
//                       { $unwind: "$productDetails" },
//                       {
//                         $project: {
//                           _id: "$productDetails._id",
//                           name: "$productDetails.name",
//                           price: "$productDetails.price",
//                           finalPrice: "$productDetails.finalPrice",
//                           image: "$productDetails.image",
//                           category: "$productDetails.category",
//                           brand: "$productDetails.brand",
//                           images: {
//                             $arrayElemAt: ["$productDetails.images", 0],
//                           },
//                           reserved: "$productDetails.reserved",
//                           rating: "$productDetails.rating",
//                           viewCount: 1,
//                         },
//                       },
//                       { $sort: { viewCount: -1 } },
//                       { $limit: 5 },
//                     ],
//                     as: "viewedHistory",
//                   },
//                 },
//                 {
//                   $unwind: {
//                     path: "$viewedHistory",
//                     preserveNullAndEmptyArrays: true,
//                   },
//                 },
//                 {
//                   $replaceRoot: {
//                     newRoot: { $ifNull: ["$viewedHistory", {}] },
//                   },
//                 },
//               ]
//             : [], // Rỗng nếu không có identifier
//         },
//       },
//       {
//         $project: {
//           allRelated: {
//             $setUnion: ["$baseRelated", "$frequentlyBought", "$popularViewed"],
//           },
//         },
//       },
//       { $unwind: "$allRelated" },
//       { $replaceRoot: { newRoot: "$allRelated" } },
//       { $limit: 5 },
//     ]),

//     // Pre-fetch tất cả danh mục duy nhất cho fallback
//     Category.find({
//       _id: { $in: [...new Set(relatedResults.map((p) => p.category || []))] },
//     }).lean(),
//   ]);

//   const categoryMap1 = new Map(
//     categoryMap.map((cat) => [cat._id.toString(), cat.name])
//   );

//   // Định dạng với fallback danh mục (không N+1)
//   const formattedProducts = relatedResults.map((phone) => ({
//     _id: phone._id,
//     name: phone.name,
//     price: phone.price,
//     finalPrice: phone.finalPrice,
//     image:
//       phone.image ||
//       phone.images?.[0]?.url ||
//       "https://via.placeholder.com/100",
//     category:
//       phone.categoryDetails?.name ||
//       categoryMap1.get(phone.category?.toString()) ||
//       "Unknown",
//     brand: phone.brand,
//     reserved: phone.reserved,
//     rating: phone.rating,
//   }));

//   res.status(200).json({
//     success: true,
//     message: "Related products retrieved successfully",
//     data: formattedProducts,
//   });
// });
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { phoneId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(phoneId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid phoneId",
    });
  }

  const currentPhone = await Phone.findById(phoneId).select("category brand");
  if (!currentPhone) {
    return res.status(404).json({
      success: false,
      message: "Phone not found",
    });
  }

  // --- Xử lý identifier cho user ẩn danh ---
  const cookies = req.cookies || {};
  let identifier = cookies.anonymousId || uuidv4();

  if (!cookies.anonymousId && !req.user?.id) {
    res.cookie("anonymousId", identifier, {
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 ngày
      httpOnly: true,
    });
  }

  const userId = req.user?.id || null;
  const isLoggedIn = !!userId;

  // --- Cập nhật view history an toàn ---
  await ViewHistory.updateViewHistory(
    phoneId,
    userId,
    isLoggedIn ? null : identifier
  );

  // --- Aggregation để lấy các sản phẩm liên quan ---
  const relatedResults = await Phone.aggregate([
    {
      $facet: {
        // 1. Sản phẩm cùng category hoặc brand
        baseRelated: [
          {
            $match: {
              _id: { $ne: new mongoose.Types.ObjectId(phoneId) },
              $or: [
                { category: currentPhone.category },
                { brand: currentPhone.brand },
              ],
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categoryDetails",
            },
          },
          {
            $unwind: {
              path: "$categoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              name: 1,
              price: 1,
              finalPrice: 1,
              image: 1,
              "categoryDetails.name": 1,
              brand: 1,
              images: { $arrayElemAt: ["$images", 0] },
              reserved: 1,
              rating: 1,
            },
          },
          { $sort: { reserved: -1, rating: -1 } },
          { $limit: 10 },
        ],

        // 2. Sản phẩm thường mua cùng
        frequentlyBought: [
          {
            $lookup: {
              from: "orders",
              let: { phoneId: new mongoose.Types.ObjectId(phoneId) },
              pipeline: [
                { $match: { orderStatus: "Completed" } },
                { $unwind: "$items" },
                { $match: { $expr: { $eq: ["$items.phone", "$$phoneId"] } } },
                {
                  $group: {
                    _id: "$items.phone",
                    relatedProducts: { $push: "$items.phone" },
                  },
                },
                { $unwind: "$relatedProducts" },
                { $match: { relatedProducts: { $ne: "$$phoneId" } } },
                {
                  $group: {
                    _id: "$relatedProducts",
                    frequency: { $sum: 1 },
                  },
                },
                {
                  $lookup: {
                    from: "phones",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails",
                  },
                },
                { $unwind: "$productDetails" },
                {
                  $project: {
                    _id: 1,
                    frequency: 1,
                    name: "$productDetails.name",
                    price: "$productDetails.price",
                    finalPrice: "$productDetails.finalPrice",
                    image: "$productDetails.image",
                    category: "$productDetails.category",
                    brand: "$productDetails.brand",
                    images: { $arrayElemAt: ["$productDetails.images", 0] },
                    reserved: "$productDetails.reserved",
                    rating: "$productDetails.rating",
                  },
                },
                { $sort: { frequency: -1, reserved: -1 } },
                { $limit: 5 },
              ],
              as: "frequentOrders",
            },
          },
          {
            $unwind: {
              path: "$frequentOrders",
              preserveNullAndEmptyArrays: true,
            },
          },
          { $replaceRoot: { newRoot: { $ifNull: ["$frequentOrders", {}] } } },
        ],

        // 3. Sản phẩm được xem nhiều
        popularViewed: [
          {
            $lookup: {
              from: "viewhistories",
              let: {
                userId: isLoggedIn ? new mongoose.Types.ObjectId(userId) : null,
                anonId: isLoggedIn ? null : identifier,
                phoneId: new mongoose.Types.ObjectId(phoneId),
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $cond: {
                        if: { $eq: ["$$userId", null] },
                        then: {
                          $and: [
                            { anonymousId: "$$anonId" },
                            { viewCount: { $gt: 2 } },
                          ],
                        },
                        else: {
                          $and: [
                            { user: "$$userId" },
                            { viewCount: { $gt: 2 } },
                          ],
                        },
                      },
                    },
                    product: { $ne: "$$phoneId" },
                  },
                },
                {
                  $lookup: {
                    from: "phones",
                    localField: "product",
                    foreignField: "_id",
                    as: "productDetails",
                  },
                },
                { $unwind: "$productDetails" },
                {
                  $project: {
                    _id: "$productDetails._id",
                    name: "$productDetails.name",
                    price: "$productDetails.price",
                    finalPrice: "$productDetails.finalPrice",
                    image: "$productDetails.image",
                    category: "$productDetails.category",
                    brand: "$productDetails.brand",
                    images: { $arrayElemAt: ["$productDetails.images", 0] },
                    reserved: "$productDetails.reserved",
                    rating: "$productDetails.rating",
                    viewCount: 1,
                  },
                },
                { $sort: { viewCount: -1 } },
                { $limit: 5 },
              ],
              as: "viewedHistory",
            },
          },
          {
            $unwind: {
              path: "$viewedHistory",
              preserveNullAndEmptyArrays: true,
            },
          },
          { $replaceRoot: { newRoot: { $ifNull: ["$viewedHistory", {}] } } },
        ],
      },
    },
    {
      $project: {
        allRelated: {
          $setUnion: ["$baseRelated", "$frequentlyBought", "$popularViewed"],
        },
      },
    },
    { $unwind: "$allRelated" },
    { $replaceRoot: { newRoot: "$allRelated" } },
    { $limit: 10 },
  ]);

  // --- Lấy tên category fallback
  const categoryIds = [
    ...new Set(
      relatedResults.map((p) => p.category?.toString()).filter(Boolean)
    ),
  ];
  const categoryMap = await Category.find({ _id: { $in: categoryIds } }).lean();
  const categoryMap1 = new Map(
    categoryMap.map((cat) => [cat._id.toString(), cat.name])
  );

  // --- Format kết quả
  const formattedProducts = relatedResults.map((phone) => ({
    _id: phone._id,
    name: phone.name,
    price: phone.price,
    finalPrice: phone.finalPrice,
    image:
      phone.image ||
      phone.images?.[0]?.url ||
      "https://via.placeholder.com/100",
    category:
      phone.categoryDetails?.name ||
      categoryMap1.get(phone.category?.toString()) ||
      "Unknown",
    brand: phone.brand,
    reserved: phone.reserved,
    rating: phone.rating,
  }));

  res.status(200).json({
    success: true,
    message: "Related products retrieved successfully",
    data: formattedProducts,
  });
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
};
