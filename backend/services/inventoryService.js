// inventoryService.js
const Inventory = require("../model/inventoryModel");

const reserveProduct = async (inventoryId, phoneId, quantity) => {
  const inventory = await Inventory.findById(inventoryId);
  if (!inventory) {
    throw new Error("Tồn kho không tồn tại.");
  }

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === phoneId.toString()
  );
  if (!product) {
    throw new Error(
      `Sản phẩm với phoneId ${phoneId} không tồn tại trong tồn kho.`
    );
  }

  inventory.checkStock(phoneId, quantity);
  const availableStock = product.quantity - product.reserved;
  if (availableStock <= 0) {
    throw new Error(`Sản phẩm ${phoneId} đã hết hàng.`);
  }
  if (availableStock < quantity) {
    throw new Error(`Không đủ tồn kho cho sản phẩm ${phoneId}.`);
  }

  product.reserved += quantity;
  inventory.lastUpdated = Date.now();
  await inventory.addHistory("reserve", quantity, phoneId);
  await inventory.save();

  return inventory;
};

const unreserveProduct = async (inventoryId, phoneId, quantity) => {
  const inventory = await Inventory.findById(inventoryId);
  if (!inventory) {
    throw new Error("Tồn kho không tồn tại.");
  }

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === phoneId.toString()
  );
  if (!product) {
    throw new Error(
      `Sản phẩm với phoneId ${phoneId} không tồn tại trong tồn kho.`
    );
  }

  if (product.reserved < quantity) {
    throw new Error(`Số lượng dự trữ không đủ để hủy cho sản phẩm ${phoneId}.`);
  }

  product.reserved -= quantity;
  inventory.lastUpdated = Date.now();
  await inventory.addHistory("unreserve", -quantity, phoneId);
  await inventory.save();

  return inventory;
};

const purchaseProduct = async (inventoryId, phoneId, quantity) => {
  const inventory = await Inventory.findById(inventoryId);
  if (!inventory) {
    throw new Error("Tồn kho không tồn tại.");
  }

  const product = inventory.products.find(
    (p) => p.phoneId.toString() === phoneId.toString()
  );
  if (!product) {
    throw new Error(
      `Sản phẩm với phoneId ${phoneId} không tồn tại trong tồn kho.`
    );
  }

  if (product.reserved < quantity || product.quantity < quantity) {
    throw new Error(
      `Không đủ tồn kho để hoàn tất đơn hàng cho sản phẩm ${phoneId}.`
    );
  }

  product.reserved -= quantity;
  product.quantity -= quantity;
  inventory.lastUpdated = Date.now();
  await inventory.addHistory("purchase", quantity, phoneId);
  await inventory.save();

  return inventory;
};

module.exports = {
  reserveProduct,
  unreserveProduct,
  purchaseProduct,
};
