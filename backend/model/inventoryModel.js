const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    warehouseLocation: {
      type: String,
      required: true,
      unique: true, // Đảm bảo mỗi warehouseLocation chỉ có một bản ghi Inventory
    },
    products: [
      {
        phoneId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Phone",
          required: true,
        },
        stock: {
          type: Number,
          required: true,
          min: [0, "Stock cannot be negative"],
          validate: {
            validator: Number.isInteger,
            message: "Stock must be an integer",
          },
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, "Quantity cannot be negative"],
          validate: {
            validator: Number.isInteger,
            message: "Quantity must be an integer",
          },
        },
        reserved: {
          type: Number,
          required: true,
          min: [0, "Reserved cannot be negative"],
          validate: {
            validator: Number.isInteger,
            message: "Reserved must be an integer",
          },
        },
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    history: [
      {
        date: { type: Date, default: Date.now },
        action: {
          type: String,
          required: true,
          enum: [
            "add",
            "remove",
            "reserve",
            "unreserve",
            "update",
            "purchase",
            "cancel",
          ],
        },
        quantityChanged: { type: Number, required: true },
        newQuantity: { type: Number, required: true },
        phoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Phone" }, // Thêm phoneId để biết lịch sử thuộc sản phẩm nào
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 🛑 Virtual field: Kiểm tra tồn kho có đủ không
// Vì products là mảng, virtual field này sẽ không áp dụng trực tiếp cho Inventory
// Thay vào đó, chúng ta sẽ tính availableStock khi cần trong các phương thức

// ✅ Middleware: Kiểm tra hợp lệ trước khi lưu
inventorySchema.pre("save", function (next) {
  // Kiểm tra từng sản phẩm trong mảng products
  for (const product of this.products) {
    if (product.quantity - product.reserved < 0) {
      return next(
        new Error(
          `Tồn kho không thể âm (quantity < reserved) cho sản phẩm ${product.phoneId}`
        )
      );
    }
  }
  this.lastUpdated = Date.now();
  this.updatedAt = Date.now();
  next();
});

// ✅ Kiểm tra trước khi cập nhật tồn kho
inventorySchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const existingInventory = await this.model.findOne(this.getQuery());

  if (!existingInventory) {
    return next(new Error("Không tìm thấy tồn kho!"));
  }

  // Kiểm tra nếu update mảng products
  if (update.products) {
    for (const updatedProduct of update.products) {
      const existingProduct = existingInventory.products.find(
        (p) => p.phoneId.toString() === updatedProduct.phoneId?.toString()
      );
      if (!existingProduct) {
        return next(
          new Error(
            `Sản phẩm với phoneId ${updatedProduct.phoneId} không tồn tại trong tồn kho`
          )
        );
      }

      const newQuantity =
        updatedProduct.quantity !== undefined
          ? updatedProduct.quantity
          : existingProduct.quantity;
      const newReserved =
        updatedProduct.reserved !== undefined
          ? updatedProduct.reserved
          : existingProduct.reserved;

      if (newQuantity < newReserved) {
        return next(
          new Error(
            `Tồn kho sau cập nhật không hợp lệ (quantity < reserved) cho sản phẩm ${updatedProduct.phoneId}`
          )
        );
      }
    }
  }

  // Kiểm tra nếu dùng $set hoặc $inc cho mảng products
  if (update.$set || update.$inc) {
    for (const product of existingInventory.products) {
      let newQuantity = product.quantity;
      let newReserved = product.reserved;

      if (update.$set?.products) {
        const updatedProduct = update.$set.products.find(
          (p) => p.phoneId.toString() === product.phoneId.toString()
        );
        if (updatedProduct) {
          newQuantity =
            updatedProduct.quantity !== undefined
              ? updatedProduct.quantity
              : product.quantity;
          newReserved =
            updatedProduct.reserved !== undefined
              ? updatedProduct.reserved
              : product.reserved;
        }
      }

      if (update.$inc?.products) {
        const incProduct = update.$inc.products.find(
          (p) => p.phoneId.toString() === product.phoneId.toString()
        );
        if (incProduct) {
          newQuantity += incProduct.quantity || 0;
          newReserved += incProduct.reserved || 0;
        }
      }

      if (newQuantity < newReserved) {
        return next(
          new Error(
            `Tồn kho sau cập nhật không hợp lệ (quantity < reserved) cho sản phẩm ${product.phoneId}`
          )
        );
      }
    }
  }

  next();
});

// Thêm lịch sử thay đổi tồn kho
inventorySchema.methods.addHistory = async function (
  action,
  quantityChanged,
  phoneId
) {
  const product = this.products.find(
    (p) => p.phoneId.toString() === phoneId.toString()
  );
  if (!product)
    throw new Error(`Product with phoneId ${phoneId} not found in inventory`);
  this.history.push({
    action,
    quantityChanged,
    newQuantity: this.products.find(
      (p) => p.phoneId.toString() === phoneId.toString()
    )?.quantity,
    phoneId,
  });
  return this.save();
};

// Kiểm tra tồn kho cho một sản phẩm cụ thể
inventorySchema.methods.checkStock = function (phoneId, requestedQuantity) {
  const product = this.products.find(
    (p) => p.phoneId.toString() === phoneId.toString()
  );
  if (!product) {
    throw new Error(
      `Sản phẩm với phoneId ${phoneId} không tồn tại trong tồn kho`
    );
  }

  const availableStock = product.quantity - product.reserved;
  if (availableStock < requestedQuantity) {
    throw new Error(
      `Không đủ tồn kho để xử lý đơn hàng cho sản phẩm ${phoneId}!`
    );
  }
};

// Cập nhật kho cho một sản phẩm cụ thể
inventorySchema.methods.updateStock = async function (
  phoneId,
  quantity,
  action
) {
  const product = this.products.find(
    (p) => p.phoneId.toString() === phoneId.toString()
  );
  if (!product) {
    throw new Error(
      `Sản phẩm với phoneId ${phoneId} không tồn tại trong tồn kho`
    );
  }

  if (action === "sold") {
    if (product.stock < quantity) {
      throw new Error(`Không đủ hàng tồn kho để bán cho sản phẩm ${phoneId}!`);
    }
    product.stock -= quantity;
  } else if (action === "added") {
    product.stock += quantity;
  }

  if (product.stock < 0) {
    throw new Error(`Tồn kho không thể âm cho sản phẩm ${phoneId}!`);
  }

  await this.addHistory(action, quantity, phoneId);
  return this.save();
};

// Cập nhật kho với nhiều sản phẩm
inventorySchema.methods.updateStock = async function (quantityMap, action) {
  for (const [phoneId, quantity] of Object.entries(quantityMap)) {
    const product = this.products.find(
      (p) => p.phoneId.toString() === phoneId.toString()
    );
    if (!product) {
      throw new Error(
        `Sản phẩm với phoneId ${phoneId} không tồn tại trong tồn kho`
      );
    }

    if (action === "sold") {
      if (product.stock < quantity) {
        throw new Error(`Không đủ hàng tồn kho cho sản phẩm ${phoneId}!`);
      }
      product.stock -= quantity;
    } else if (action === "added") {
      product.stock += quantity;
    }

    if (product.stock < 0) {
      throw new Error(`Tồn kho không thể âm cho sản phẩm ${phoneId}!`);
    }

    await this.addHistory(action, quantity, phoneId);
  }
  return this.save();
};

// ✅ Xử lý lỗi khi lưu
inventorySchema.post("save", function (error, doc, next) {
  if (error.name === "ValidationError") {
    const errorMessages = Object.values(error.errors).map((err) => err.message);
    console.error("Validation Error:", errorMessages.join(", "));
    return next(new Error(`Validation Error: ${errorMessages.join(", ")}`));
  }
  next();
});

// Tạo index để tối ưu tìm kiếm
inventorySchema.index({ warehouseLocation: 1 });
inventorySchema.index({ "products.phoneId": 1 });

module.exports = mongoose.model("Inventory", inventorySchema);
