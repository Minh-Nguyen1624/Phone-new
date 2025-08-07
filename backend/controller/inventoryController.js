const Inventory = require("../model/inventoryModel");
const mongoose = require("mongoose");
const Phone = require("../model/phoneModel");
// const Notification = require("../model/notificationModel");

// Thêm mới tồn kho
const addInventory = async (req, res) => {
  try {
    const {
      phoneIds,
      warehouseLocation,
      stock,
      quantity,
      reserved = 0,
    } = req.body;

    // Kiểm tra các trường bắt buộc
    if (
      !phoneIds ||
      !Array.isArray(phoneIds) ||
      phoneIds.length === 0 ||
      stock == null ||
      !warehouseLocation ||
      quantity == null
    ) {
      if (!phoneIds) {
        console.log("❌ Missing phoneIds");
        return res.status(400).json({ message: "Missing phoneIds" });
      }

      if (!Array.isArray(phoneIds)) {
        console.log("❌ phoneIds is not an array");
        return res.status(400).json({ message: "phoneIds must be an array" });
      }

      if (phoneIds.length === 0) {
        console.log("❌ phoneIds array is empty");
        return res
          .status(400)
          .json({ message: "phoneIds array cannot be empty" });
      }

      if (stock == null) {
        console.log("❌ Missing stock");
        return res.status(400).json({ message: "Missing stock" });
      }

      if (!warehouseLocation) {
        console.log("❌ Missing warehouseLocation");
        return res.status(400).json({ message: "Missing warehouseLocation" });
      }

      if (quantity == null) {
        console.log("❌ Missing quantity");
        return res.status(400).json({ message: "Missing quantity" });
      }

      return res
        .status(400)
        .json({ message: "Please fill in all fields correctly" });
    }

    // Kiểm tra định dạng phoneIds
    for (const phoneId of phoneIds) {
      if (!mongoose.Types.ObjectId.isValid(phoneId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid phoneId format: ${phoneId}`,
        });
      }
    }

    // Kiểm tra xem tất cả sản phẩm có tồn tại không
    const phones = await Phone.find({ _id: { $in: phoneIds } });
    if (phones.length !== phoneIds.length) {
      return res.status(404).json({
        success: false,
        message: "Some phones were not found",
      });
    }

    // Tìm hoặc tạo bản ghi Inventory theo warehouseLocation
    let inventory = await Inventory.findOne({ warehouseLocation });
    if (!inventory) {
      // Nếu không tìm thấy, tạo mới
      inventory = new Inventory({
        warehouseLocation,
        products: [],
      });
    }

    // Thêm các sản phẩm vào mảng products
    for (const phoneId of phoneIds) {
      const existingProduct = inventory.products.find(
        (p) => p.phoneId.toString() === phoneId.toString()
      );

      if (!existingProduct) {
        // Nếu sản phẩm chưa tồn tại trong mảng products, thêm mới
        inventory.products.push({
          phoneId,
          stock,
          quantity,
          reserved,
        });

        // Ghi lịch sử thay đổi
        await inventory.addHistory("add", quantity, phoneId);
      } else {
        // Nếu sản phẩm đã tồn tại, báo lỗi hoặc cập nhật (tùy logic mong muốn)
        return res.status(400).json({
          success: false,
          message: `Phone with ID ${phoneId} already exists in inventory at ${warehouseLocation}`,
        });
      }
    }

    await inventory.save();

    res.status(201).json({
      success: true,
      message: "Inventory added successfully",
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding inventory",
      error: error.message,
    });
  }
};

// Lấy danh sách tồn kho với phân trang
const getInventories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const inventories = await Inventory.find()
      .populate("products.phoneId", "name brand")
      .skip(skip)
      .limit(parseInt(limit));

    const totalItems = await Inventory.countDocuments();

    // Tính availableStock cho từng sản phẩm trong mảng products
    const inventoriesWithStock = inventories.map((inventory) => {
      const productsWithStock = inventory.products.map((product) => {
        const availableStock = product.quantity - product.reserved;
        return {
          ...product.toObject(),
          availableStock,
        };
      });

      return {
        ...inventory.toObject(),
        products: productsWithStock,
      };
    });

    res.status(200).json({
      success: true,
      message: "Inventories fetched successfully",
      data: inventoriesWithStock,
      totalItems,
      page: parseInt(page),
      totalPages: Math.ceil(totalItems / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inventories",
      error: error.message,
    });
  }
};

// Lấy chi tiết một tồn kho
const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID format",
      });
    }

    const inventory = await Inventory.findById(id).populate(
      "products.phoneId",
      "name brand"
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    // Tính availableStock cho từng sản phẩm trong mảng products
    const productsWithStock = inventory.products.map((product) => {
      const availableStock = product.quantity - product.reserved;
      return {
        phoneId: product.phoneId,
        availableStock,
        reserved: product.reserved,
        quantity: product.quantity,
      };
    });

    res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      data: {
        warehouseLocation: inventory.warehouseLocation,
        products: productsWithStock,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inventory",
      error: error.message,
    });
  }
};

// Cập nhật tồn kho
const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { phoneId, stock, quantity, reserved } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID format",
      });
    }

    const inventory = await Inventory.findById(id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    // Nếu cập nhật thông tin sản phẩm cụ thể trong mảng products
    if (phoneId) {
      if (!mongoose.Types.ObjectId.isValid(phoneId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phoneId format",
        });
      }

      const product = inventory.products.find(
        (p) => p.phoneId.toString() === phoneId.toString()
      );
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with phoneId ${phoneId} not found in inventory`,
        });
      }

      // Cập nhật thông tin sản phẩm
      const previousQuantity = product.quantity;
      if (stock !== undefined) product.stock = stock;
      if (quantity !== undefined) product.quantity = quantity;
      if (reserved !== undefined) product.reserved = reserved;

      // Ghi lịch sử thay đổi nếu có thay đổi số lượng
      if (quantity !== undefined && quantity !== previousQuantity) {
        const quantityChanged = quantity - previousQuantity;
        await inventory.addHistory("update", quantityChanged, phoneId);
      }
    } else {
      // Nếu cập nhật warehouseLocation
      if (req.body.warehouseLocation) {
        inventory.warehouseLocation = req.body.warehouseLocation;
      }
    }

    await inventory.save();

    res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating inventory",
      error: error.message,
    });
  }
};

// Xóa tồn kho
const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID format",
      });
    }

    const deletedInventory = await Inventory.findByIdAndDelete(id);

    if (!deletedInventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Inventory deleted successfully",
      data: deletedInventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting inventory",
      error: error.message,
    });
  }
};

// Kiểm tra trạng thái tồn kho
const checkInventoryStatus = async (req, res) => {
  try {
    const { phoneId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(phoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phoneId format",
      });
    }

    // Tìm tất cả bản ghi Inventory và kiểm tra trong mảng products
    const inventories = await Inventory.find();
    let targetProduct = null;
    let targetInventory = null;

    for (const inventory of inventories) {
      const product = inventory.products.find(
        (p) => p.phoneId.toString() === phoneId.toString()
      );
      if (product) {
        targetProduct = product;
        targetInventory = inventory;
        break;
      }
    }

    if (!targetProduct) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found for this phone",
      });
    }

    const availableStock = targetProduct.quantity - targetProduct.reserved;

    res.status(200).json({
      success: true,
      message: "Inventory status fetched successfully",
      data: {
        phoneId: targetProduct.phoneId,
        warehouseLocation: targetInventory.warehouseLocation,
        availableStock,
        reserved: targetProduct.reserved,
        quantity: targetProduct.quantity,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inventory status",
      error: error.message,
    });
  }
};

// Quản lý nhập kho
const addStock = async (req, res) => {
  try {
    const { inventoryId, phoneId, additionalQuantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventoryId format. Please provide a valid ID.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(phoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phoneId format. Please provide a valid ID.",
      });
    }

    if (!additionalQuantity || additionalQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Additional quantity must be greater than 0",
      });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found. Please check the inventoryId.",
      });
    }

    const product = inventory.products.find(
      (p) => p.phoneId.toString() === phoneId.toString()
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with phoneId ${phoneId} not found in inventory`,
      });
    }

    const previousQuantity = product.quantity;
    product.quantity += additionalQuantity;

    // Sử dụng phương thức updateStock từ schema
    await inventory.updateStock(phoneId, additionalQuantity, "added");

    // Ghi lịch sử thay đổi
    inventory.history.push({
      action: "add",
      quantity: additionalQuantity,
      previousQuantity,
      newQuantity: product.quantity,
      timestamp: new Date(),
    });

    inventory.lastUpdated = Date.now();
    await inventory.save();

    res.status(200).json({
      success: true,
      message: "Stock added successfully",
      inventory: {
        ...inventory.toObject(),
        previousQuantity,
        change: additionalQuantity,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding stock",
      error: error.message,
    });
  }
};

// Xem lịch sử cập nhật tồn kho
const lowStockAlert = async (req, res) => {
  try {
    const { threshold } = req.query;
    const stockThreshold = parseInt(threshold) || 10;

    const inventories = await Inventory.find().populate(
      "products.phoneId",
      "name brand price image"
    );

    const lowStockItems = [];

    inventories.forEach((inventory) => {
      inventory.products.forEach((product) => {
        const availableStock = product.quantity - product.reserved;
        if (
          availableStock <= stockThreshold ||
          product.quantity <= stockThreshold
        ) {
          lowStockItems.push({
            warehouseLocation: inventory.warehouseLocation,
            product: {
              phoneId: product.phoneId,
              availableStock,
              quantity: product.quantity,
              reserved: product.reserved,
            },
          });
        }
      });
    });

    if (lowStockItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Không có mặt hàng nào có tồn kho thấp.",
        data: [],
      });
    }

    // Ghi lịch sử "low stock alert" cho từng Inventory
    await Promise.all(
      inventories.map(async (inventory) => {
        const hasLowStock = inventory.products.some((product) => {
          const availableStock = product.quantity - product.reserved;
          return (
            availableStock <= stockThreshold ||
            product.quantity <= stockThreshold
          );
        });
        if (hasLowStock) {
          inventory.history.push({
            action: "lowStockAlert",
            quantity: 0,
            timestamp: new Date(),
          });
          await inventory.save();
        }
      })
    );

    res.status(200).json({
      success: true,
      message: "Low stock items fetched successfully",
      data: lowStockItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching low stock items",
      error: error.message,
    });
  }
};

const getInventoryHistory = async (req, res) => {
  try {
    const { inventoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventoryId format",
      });
    }

    const inventory = await Inventory.findById(inventoryId)
      .populate("products.phoneId", "name brand")
      .select("+history");

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Inventory history fetched successfully",
      history: inventory.history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inventory history",
      error: error.message,
    });
  }
};

const checkInventoryStatusById = async (req, res) => {
  const { id } = req.params;
  const { phoneId } = req.query; // Thêm phoneId để xác định sản phẩm cụ thể

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "ID tồn kho không hợp lệ",
    });
  }

  if (!phoneId || !mongoose.Types.ObjectId.isValid(phoneId)) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp phoneId hợp lệ",
    });
  }

  try {
    const inventory = await Inventory.findById(id).populate(
      "products.phoneId",
      "name brand price image"
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    const product = inventory.products.find(
      (p) => p.phoneId.toString() === phoneId.toString()
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Sản phẩm với phoneId ${phoneId} không tồn tại trong tồn kho.`,
      });
    }

    const availableStock = product.quantity - product.reserved;

    res.status(200).json({
      success: true,
      message: "Inventory status fetched successfully",
      data: {
        phoneId: product.phoneId,
        warehouseLocation: inventory.warehouseLocation,
        availableStock,
        quantity: product.quantity,
        reserved: product.reserved,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin tồn kho",
      error: error.message,
    });
  }
};

const checkStockAndNotify = async (req, res) => {
  try {
    const { phoneId, requestedQuantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(phoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phoneId format",
      });
    }

    const inventories = await Inventory.find().populate("products.phoneId");

    let targetProduct = null;
    let targetInventory = null;

    for (const inventory of inventories) {
      const product = inventory.products.find(
        (p) => p.phoneId.toString() === phoneId.toString()
      );
      if (product) {
        targetProduct = product;
        targetInventory = inventory;
        break;
      }
    }

    if (!targetProduct) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại trong tồn kho!",
      });
    }

    const availableStock = targetProduct.quantity - targetProduct.reserved;
    if (availableStock < requestedQuantity) {
      return res.status(200).json({
        success: false,
        message: "Sản phẩm hiện không đủ tồn kho!",
        availableStock,
        product: targetProduct.phoneId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sản phẩm có đủ tồn kho.",
      availableStock,
      product: targetProduct.phoneId,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống!",
      error: error.message,
    });
  }
};

module.exports = {
  addInventory,
  getInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
  // processOrder,
  // completeOrder,
  // cancelOrder,
  getInventoryHistory,
  checkInventoryStatus,
  lowStockAlert,
  addStock,
  checkInventoryStatusById,
  checkStockAndNotify,
  // purchasePhone,
};
