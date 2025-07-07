const express = require("express");
// const mongoose = require("mongoose");
// const Cart =  require("../model/cartModel");
const {
  getCart,
  addToCart,
  addMultipleToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controller/cartController");

const {
  authMiddleware,
  adminMiddleware,
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Lấy thông tin giỏ hàng
// router.get("/:id", getCart);
router.post("/get", protect, getCart);

// Thêm một sản phẩm vào giỏ hàng
// router.post("/add", addToCart);
router.post("/add", protect, addToCart);

// Thêm nhiều sản phẩm vào giỏ hàng
// router.post("/add/multiple", addMultipleToCart);
router.post("/add/multiple", protect, addMultipleToCart);

// Cập nhật sản phẩm trong giỏ hàng
// router.put("/update/:id", updateCartItem);
router.put("/update/:id", protect, updateCartItem);

// Xóa sản phẩm khỏi giỏ hàng
// router.delete("/delete/:id", removeFromCart);
// router.delete("/delete/:id", protect, removeFromCart);
router.delete("/remove", protect, removeFromCart);

// Xóa toàn bộ giỏ hàng
// router.delete("/clear", clearCart);
router.delete("/clear", protect, clearCart);

module.exports = router;
