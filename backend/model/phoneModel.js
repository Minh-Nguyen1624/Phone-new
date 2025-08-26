const mongoose = require("mongoose");
const Inventory = require("../model/inventoryModel");

const phoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    minlength: [3, "Name must be at least 3 characters long"],
    maxlength: [100, "Name cannot exceed 100 characters"],
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
    default: 0,
  },
  image: {
    type: String,
    required: true,
    trim: true,
    // match: [/^https?:\/\/.*\.(jpg|jpeg|png|gif)$/, "Invalid image URL format"],
    validate: {
      validator: (v) => /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/.test(v),
      message: "Invalid image URL format",
    },
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, "Brand name must be at least 2 characters"],
    maxlength: [50, "Brand name cannot exceed 50 characters"],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    // required: true,
  },
  // category: [
  //   {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "Category",
  //     // required: true,
  //   },
  // ],
  stock: {
    type: Number,
    required: true,
    min: [0, "Stock cannot be negative"],
    default: 0,
  },

  warehouseLocation: {
    type: String,
    required: true,
    default: "Default Warehouse",
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, "Quantity cannot be negative"],
  },
  reserved: {
    type: Number,
    required: true,
    default: 0,
    min: [0, "Reserved cannot be negative"],
  },
  reviews: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
    required: false,
  },
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
    required: false,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: false,
  },
  specifications: {
    screen: {
      type: String,
      required: false,
      default: "N/A",
      maxlength: [100, "Screen specification cannot exceed 50 characters"],
    },
    battery: {
      type: String,
      required: false,
      default: "N/A",
      maxlength: [50, "Battery specification cannot exceed 50 characters"],
    },
    processor: {
      type: String,
      required: false,
      default: "N/A",
      maxlength: [50, "Processor specification cannot exceed 50 characters"],
    },
    ram: {
      type: String,
      required: false,
      default: "N/A",
      maxlength: [50, "RAM specification cannot exceed 50 characters"],
    },
    storage: {
      type: String,
      required: false,
      default: "N/A",
      maxlength: [50, "Storage specification cannot exceed 50 characters"],
    },
    camera: {
      front: {
        type: String,
        required: false,
        default: "N/A",
        maxlength: [
          50,
          "Front camera specification cannot exceed 50 characters",
        ],
      },
      rear: {
        type: String,
        required: false,
        default: "N/A",
        maxlength: [
          50,
          "Rear camera specification cannot exceed 50 characters",
        ],
      },
    },
    os: {
      type: String,
      required: false,
      default: "N/A",
      maxlength: [50, "OS specification cannot exceed 50 characters"],
    },
    network: {
      type: String,
      required: false,
      default: "N/A",
      maxlength: [50, "Network specification cannot exceed 50 characters"],
      enum: ["2G", "3G", "4G", "5G", "N/A"], // Giới hạn giá trị hợp lệ
    },
    discountAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: (v) => !isNaN(v) && v >= 0,
        message:
          "Discount amount must be a valid number and greater than or equal to 0",
      },
    },
  },
  releaseDate: {
    type: Date,
    validate: {
      validator: (v) => v <= new Date(),
      message: "Release date cannot be in the future",
    },
  },
  images: [
    {
      url: {
        type: String,
        required: false,
        match: [
          /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/,
          "Invalid image URL format",
        ],
      },
      alt: {
        type: String,
        required: false,
        maxlength: [100, "Alt text cannot exceed 100 characters"],
      },
    },
  ],
  rating: {
    type: Number,
    min: [0, "Rating cannot be less than 0"],
    max: [5, "Rating cannot be more than 5"],
    default: 0,
  },
  discount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Discount", // Reference to Discount model
    required: false,
  },
  discountValue: {
    type: Number,
    min: [0, "Discount cannot be negative"],
    // max: [100, "Discount cannot exceed 100%"], // For percentage-based discounts
    default: 0, // Optional: if you want to apply a custom discount directly to the product
  },

  finalPrice: {
    type: Number,
    default: function () {
      return this.price - this.discountValue;
    },
  },

  warrantyPeriod: {
    type: Number,
    required: false,
    min: [1, "Warranty period must be at least 1 month"],
    max: [36, "Warranty period cannot exceed 36 months"], // 3 years max
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  likes: {
    type: Number,
    default: 0, // Initial likes count
  },
  likedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model
    },
  ],
  colors: [
    {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Color name must be at least 2 characters"],
      maxlength: [30, "Color name cannot exceed 30 characters"],
      validate: {
        validator: function (v) {
          // Kiểm tra giá trị màu có hợp lệ không (ví dụ: không chứa ký tự đặc biệt không mong muốn)
          return /^[a-zA-Z\s-]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid color name!`,
      },
    },
  ],
});

// Virtual field for dynamic final price calculation
phoneSchema.virtual("calculatedFinalPrice").get(function () {
  // return this.price - this.discountValue;
  return this.price - this.specifications.discountAmount;
});

// Middleware để xóa discountAmount ở root level nếu tồn tại
phoneSchema.pre("save", function (next) {
  if (this.discountAmount !== undefined) {
    delete this.discountAmount; // Xóa trường discountAmount ở root level
  }
  next();
});

// Middleware xử lý giảm giá trước khi lưu
phoneSchema.pre("save", async function (next) {
  if (
    this.isModified("discount") ||
    this.isModified("price") ||
    this.isModified("discountValue")
  ) {
    if (this.discount) {
      const Discount = mongoose.model("Discount");
      const discount = await Discount.findById(this.discount);
      if (!discount) {
        return next(new Error("Invalid discount ID"));
      }
      if (!discount.isActive) {
        return next(new Error("The discount is not active"));
      }
      // Cập nhật discountValue từ Discount
      this.discountValue = discount.discountValue;
      // Tính discountAmount dựa trên discountType
      this.specifications.discountAmount =
        discount.discountType === "percentage"
          ? (this.price * this.discountValue) / 100
          : Math.min(discount.discountValue, this.price);
    } else {
      this.discountValue = 0;
      this.specifications.discountAmount = 0;
    }
    // Cập nhật finalPrice
    this.finalPrice = this.price - this.specifications.discountAmount;
  }
  this.updatedAt = Date.now();
  next();
});

// Kiểm tra tồn kho khả dụng
phoneSchema.pre("validate", async function (next) {
  if (this.discount) {
    const Discount = mongoose.model("Discount");
    const discount = await Discount.findById(this.discount);
    if (!discount) return next(new Error("Invalid discount ID"));
    if (!discount.isActive)
      return next(new Error("The discount is not active"));

    this.discountValue = discount.discountValue;
    this.specifications.discountAmount =
      discount.discountType === "percentage"
        ? (this.price * this.discountValue) / 100
        : Math.min(discount.discountValue, this.price);
    this.finalPrice = this.price - this.specifications.discountAmount;
  } else {
    this.discountValue = 0;
    this.specifications.discountAmount = 0;
    this.finalPrice = this.price;
  }
  next();
});

phoneSchema.methods.checkStockAvailability = function (quantity) {
  const availableStock = this.stock - this.reserved;
  if (availableStock < quantity) {
    throw new Error(
      `Not enough stock for ${this.name}. Only ${availableStock} available (Stock: ${this.stock}, Reserved: ${this.reserved}).`
    );
  }
};

// // Method to update product stock after purchase
// phoneSchema.methods.updateStockAfterPurchase = async function (quantity) {
//   if (this.stock < quantity) {
//     throw new Error(`Not enough stock for ${this.name}`);
//   }

//   this.stock -= quantity;
//   await this.save();
// };

phoneSchema.methods.updateProduct = async function (data) {
  this.set(data);
  this.updatedAt = Date.now();
  await this.save();
};

phoneSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware tạo bản ghi Inventory khi thêm sản phẩm mới
phoneSchema.post("save", async function (doc, next) {
  try {
    let inventory = await Inventory.findOne({
      warehouseLocation: doc.warehouseLocation,
    });

    if (!inventory) {
      // Nếu không tìm thấy Inventory với warehouseLocation, tạo mới
      inventory = await Inventory.create({
        warehouseLocation: doc.warehouseLocation || "Default",
        products: [
          {
            phoneId: doc._id,
            stock: doc.stock,
            quantity: doc.quantity,
            reserved: doc.reserved,
            colors: doc.colors, // Đồng bộ màu sắc
          },
        ],
      });
    } else {
      // Nếu tìm thấy Inventory, kiểm tra xem sản phẩm đã tồn tại trong mảng products chưa
      const productIndex = inventory.products.findIndex(
        (p) => p.phoneId.toString() === doc._id.toString()
      );

      if (productIndex === -1) {
        // Nếu sản phẩm chưa tồn tại, thêm mới vào mảng products
        inventory.products.push({
          phoneId: doc._id,
          stock: doc.stock,
          quantity: doc.quantity,
          reserved: doc.reserved,
          // colors: doc.colors, // Đồng bộ màu sắc
        });
      } else {
        // Nếu sản phẩm đã tồn tại, cập nhật thông tin
        inventory.products[productIndex].stock = doc.stock;
        inventory.products[productIndex].quantity = doc.quantity;
        inventory.products[productIndex].reserved = doc.reserved;
        inventory.products[productIndex].colors = doc.colors; // Cập nhật màu sắc
      }

      await inventory.save();
    }

    next();
  } catch (error) {
    console.error("Error updating Inventory:", error);
    next(error);
  }
});

// Cập nhật số lượng sản phẩm trong Inventory khi có thay đổi
phoneSchema.methods.updateStockAfterPurchase = async function (quantity) {
  const inventory = await Inventory.findOne({
    warehouseLocation: this.warehouseLocation,
  });
  if (!inventory) throw new Error("Inventory not found");

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === this._id.toString()
  );
  if (!product) throw new Error("Product not found in inventory");

  const availableStock = product.stock - product.reserved;
  if (availableStock < quantity) {
    throw new Error(
      `Not enough stock for ${this.name}. Only ${availableStock} available (Stock: ${product.stock}, Reserved: ${product.reserved}).`
    );
  }

  product.stock -= quantity;
  await inventory.addHistory("purchase", quantity, this._id); // Ghi lịch sử
  inventory.lastUpdated = Date.now();
  await inventory.save();

  // Đồng bộ stock trong Phone
  this.stock = product.stock;
  this.reserved = product.reserved;
  await this.save();
};

// Tính số lượng đã bán từ history
phoneSchema.methods.getSoldQuantity = async function () {
  const inventory = await Inventory.findOne({
    warehouseLocation: this.warehouseLocation,
  });
  if (!inventory) throw new Error("Inventory not found");

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === this._id.toString()
  );
  if (!product) throw new Error("Product not found in inventory");

  const soldQuantity = await Inventory.aggregate([
    { $match: { "products.phoneId": this._id } },
    { $unwind: "$history" },
    { $match: { "history.action": "purchase" } },
    { $group: { _id: null, totalSold: { $sum: "$history.quantityChanged" } } },
  ]).then((result) => result[0]?.totalSold || 0);

  return soldQuantity;
};
// 📌 Phương thức nhập thêm hàng vào kho
phoneSchema.methods.restock = async function (quantity) {
  const inventory = await Inventory.findOne({
    warehouseLocation: this.warehouseLocation,
  });
  if (!inventory) throw new Error("Inventory not found");

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === this._id.toString()
  );
  if (!product) throw new Error("Product not found in inventory");

  product.stock += quantity;
  inventory.lastUpdated = Date.now();
  await inventory.save();

  this.stock = product.stock;
  await this.save();
};

phoneSchema.methods.reserveStock = async function (quantity) {
  const inventory = await Inventory.findOne({
    warehouseLocation: this.warehouseLocation,
  });
  if (!inventory) throw new Error("Inventory not found");

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === this._id.toString()
  );
  if (!product) throw new Error("Product not found in inventory");

  const availableStock = product.stock - product.reserved;
  if (availableStock < quantity) {
    throw new Error(
      `Not enough stock to reserve for ${this.name}. Only ${availableStock} available.`
    );
  }

  product.reserved += quantity;
  inventory.lastUpdated = Date.now();
  await inventory.save();

  // Đồng bộ reserved trong Phone
  this.reserved = product.reserved;
  await this.save();
};

phoneSchema.methods.releaseReservedStock = async function (quantity) {
  const inventory = await Inventory.findOne({
    warehouseLocation: this.warehouseLocation,
  });
  if (!inventory) throw new Error("Inventory not found");

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === this._id.toString()
  );
  if (!product) throw new Error("Product not found in inventory");

  if (product.reserved < quantity) {
    throw new Error(
      `Cannot release more than reserved quantity for ${this.name}. Reserved: ${product.reserved}.`
    );
  }

  product.reserved -= quantity;
  inventory.lastUpdated = Date.now();
  await inventory.save();

  // Đồng bộ reserved trong Phone
  this.reserved = product.reserved;
  await this.save();
};

phoneSchema.pre("remove", async function (next) {
  try {
    const inventory = await Inventory.findOne({
      warehouseLocation: this.warehouseLocation,
    });
    if (inventory) {
      inventory.products = inventory.products.filter(
        (p) => p.phoneId.toString() !== this._id.toString()
      );
      await inventory.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Tạo index để tối ưu tìm kiếm
phoneSchema.index({ name: 1 });
phoneSchema.index({ category: 1 });
phoneSchema.index({ brand: 1 });
phoneSchema.index({ colors: 1 });

module.exports = mongoose.model("Phone", phoneSchema);
