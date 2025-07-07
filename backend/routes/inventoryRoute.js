const express = require("express");
const app = express();
const {
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
} = require("../controller/inventoryController");

const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");
const router = express.Router();

// router.get("/", getInventories);
router.get("/", protect, getInventories); // Lấy danh sách inventory

// router.get("/:id", getInventoryById);
router.get("/:id", protect, getInventoryById); // Lấy chi tiết inventory theo ID

// router.post("/add", addInventory);
router.post("/add", protect, adminMiddleware, addInventory); // Thêm mới inventory

// router.put("/update/:id", updateInventory);
router.put("/update/:id", protect, adminMiddleware, updateInventory); // Cập nhật inventory

// router.delete("/delete/:id", deleteInventory);
router.delete("/delete/:id", protect, adminMiddleware, deleteInventory); // Xóa inventory

// // Route để xử lý đơn hàng (cập nhật tồn kho khi đặt hàng)
// // router.post("/order/process", processOrder);
// router.post("/order/process", protect, processOrder); // Xử lý đơn hàng (tăng reserved)

// // Route để hoàn tất đơn hàng
// // router.post("/order/complete", completeOrder);
// router.post("/order/complete", protect, completeOrder); // Hoàn tất đơn hàng (giảm reserved và quantity)

// // Route để hủy đơn hàng
// // router.post("/order/cancel", cancelOrder);
// router.post("/order/cancel", protect, cancelOrder); // Hủy đơn hàng (giảm reserved)

// // Route để lấy lịch sử giao dịch tồn kho
// router.get("/history/:inventoryId", getInventoryHistory);

// // Route để kiểm tra trạng thái kho hàng
// router.get("/status/:inventoryId", checkInventoryStatus);

// // Route để cảnh báo tồn kho thấp
// router.get("/inventory/low-stock-alert", lowStockAlert);
router.get("/inventory/low-stock-alert", protect, lowStockAlert); // Kiểm tra và cảnh báo tồn kho thấp

// router.post("/add-stock", addStock);

// Route để kiểm tra trạng thái tồn kho (kiểm tra số lượng còn lại)
// router.get("/inventory/status", checkInventoryStatus);
router.get("/inventory/status", protect, checkInventoryStatus); // Kiểm tra trạng thái tồn kho theo phoneId

// router.get("/inventory/:id/status", checkInventoryStatusById);
router.get("/inventory/:id/status", protect, checkInventoryStatusById); // Kiểm tra trạng thái tồn kho theo inventoryId và phoneId

// Route để nhập thêm kho
// router.post("/inventory/add-stock", addStock);
router.post("/inventory/add-stock", protect, adminMiddleware, addStock); // Nhập thêm tồn kho

// Route để lấy lịch sử cập nhật tồn kho
// router.get("/inventory/:inventoryId/history", getInventoryHistory);
router.get("/inventory/:inventoryId/history", protect, getInventoryHistory); // Lấy lịch sử thay đổi của inventory

// Route để cảnh báo về tồn kho thấp và gửi email
// router.post("/inventory/check-stock-and-notify", checkStockAndNotify);
// http://localhost:5000/api/inventory/check-stock?phoneId=64e4a9c0b23f6a1d88f15b2a
// Route kiểm tra tồn kho
router.get("/check-stock", checkStockAndNotify);
// router.post("/inventory/check-stock", checkStockAndNotify);
router.post("/inventory/check-stock", protect, checkStockAndNotify); // Kiểm tra tồn kho và thông báo nếu không đủ

// Route để mua điện thoại

// router.post("/inventory/purchase-phone", purchasePhone);
// router.post("/inventory/purchase-phone", protect, purchasePhone); // Mua điện thoại (giảm quantity, tăng reserved)

module.exports = router;
