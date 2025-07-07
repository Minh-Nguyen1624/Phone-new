// const express = require("express");
// const {
//   getAllOrder,
//   getOrderById,
//   addToOrder,
//   updateOrderStatus,
//   deletedOrder,
//   processOrder,
//   completeOrder,
//   cancelOrder,
// } = require("../controller/orderController");

// const { protect, adminMiddleware } = require("../middleware/authMiddleware");
// const router = express.Router();
// // router.get("/", getAllOrder);
// // Lấy tất cả đơn hàng (chỉ admin)
// router.get("/", protect, adminMiddleware, getAllOrder);

// // router.get("/:id", getOrderById);
// // Lấy chi tiết đơn hàng theo ID (yêu cầu đăng nhập)
// router.get("/:id", protect, getOrderById);

// // router.post("/add", addToOrder);
// // Tạo đơn hàng mới (yêu cầu đăng nhập)
// router.post("/add", protect, addToOrder);

// // router.put("/update/:id", updateOrderStatus);

// // Cập nhật trạng thái đơn hàng (chỉ admin)
// router.put("/update/:id", protect, adminMiddleware, updateOrderStatus);

// // router.delete("/delete/:id", deletedOrder);
// // Xóa đơn hàng (chỉ admin)
// router.delete("/delete/:id", protect, adminMiddleware, deletedOrder);

// // Route để xử lý đơn hàng (cập nhật tồn kho khi đặt hàng)
// // router.post("/order/process", processOrder);
// router.post("/order/process", protect, processOrder); // Xử lý đơn hàng (tăng reserved)

// // Route để hoàn tất đơn hàng
// // router.post("/order/complete", completeOrder);
// router.post("/order/complete", protect, completeOrder); // Hoàn tất đơn hàng (giảm reserved và quantity)

// // Route để hủy đơn hàng
// // router.post("/order/cancel", cancelOrder);
// router.post("/order/cancel", protect, cancelOrder); // Hủy đơn hàng (giảm reserved)

// module.exports = router;

const express = require("express");
const {
  getAllOrder,
  getOrderById,
  addToOrder,
  updateOrderStatus,
  deletedOrder,
  processOrder,
  completeOrder,
  cancelOrder,
  updateOrderPaymentStatus,
} = require("../controller/orderController");
const { protect, adminMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, adminMiddleware, getAllOrder);
router.get("/:id", protect, getOrderById);
router.post("/add", protect, addToOrder);
router.put("/update/:id", protect, updateOrderStatus); // Cả admin và chủ đơn hàng
router.delete("/delete/:id", protect, deletedOrder); // Cả admin và chủ đơn hàng
router.post("/process", protect, processOrder); // Chỉ chủ đơn hàng
router.put("/complete/:orderId", protect, completeOrder); // Cả admin và chủ đơn hàng
router.put("/cancel/:orderId", protect, cancelOrder); // Cả admin và chủ đơn hàng

// router.put("/update-payment-status/:orderId", protect, async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { paymentStatus, tnxRef, amount, paymentMethod, response, userId } =
//       req.body;
//     const updatedOrder = await updateOrderPaymentStatus(
//       orderId,
//       paymentStatus,
//       tnxRef,
//       amount,
//       paymentMethod,
//       response,
//       userId
//     );
//     if (!updatedOrder) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found" });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Payment status updated successfully",
//       order: updatedOrder,
//     });
//   } catch (error) {
//     console.error("Error updating payment status:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// });
router.put("/update-payment-status/:orderId", protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, txnRef, amount, paymentMethod, response, userId } =
      req.body;

    // Kiểm tra tính hợp lệ của dữ liệu đầu vào
    if (!orderId || !paymentStatus || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (orderId, paymentStatus, amount, paymentMethod)",
      });
    }

    // Kiểm tra userId khớp với req.user._id từ middleware protect
    if (userId && userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: User ID mismatch",
      });
    }

    // Xác thực định dạng số tiền
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    // Gọi hàm updateOrderPaymentStatus với tùy chọn phù hợp
    const updatedOrder = await updateOrderPaymentStatus(
      orderId,
      paymentStatus,
      txnRef,
      amount,
      paymentMethod,
      response || {},
      req.user._id, // Sử dụng userId từ middleware thay vì từ req.body
      { updateExistingPayment: !!txnRef } // Sử dụng updateExistingPayment nếu có txnRef
    );

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    console.log(
      `Payment status updated for order ${orderId} at ${new Date().toISOString()}`
    );
    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      `Error updating payment status for order ${req.params.orderId}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
