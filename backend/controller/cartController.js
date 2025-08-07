const mongoose = require("mongoose");
const Cart = require("../model/cartModel"); // Import model Cart
const Phone = require("../model/phoneModel"); // Import model Phone
// const User = require("../model/userModel"); // Import model User

// // Thêm nhiều sản phẩm vào giỏ hàng cùng một lúc
const addMultipleToCart = async (req, res) => {
  try {
    const userId = req.body.userId;
    const products = req.body.products;

    if (!userId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Tìm hoặc tạo mới giỏ hàng cho user
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        // shippingInfo: {
        //   address: {
        //     street: "N/A",
        //     city: "N/A",
        //     district: "N/A",
        //     country: "N/A",
        //     postalCode: "00000",
        //   },
        // },
      });
    }

    // Thêm hoặc cập nhật sản phẩm
    for (const product of products) {
      const {
        phoneId,
        quantity = 1,
        // price = 0,
        imageUrl,
        isGift = false,
        customOption = {},
        currency = "VND",
      } = product;

      // Kiểm tra các trường bắt buộc
      if (!phoneId || !imageUrl) {
        return res
          .status(400)
          .json({ message: "Missing required fields (phoneId, imageUrl)." });
      }

      const phone = await Phone.findById(phoneId);
      if (!phone) {
        return res.status(404).json({ message: `Phone ${phoneId} not found.` });
      }

      // Kiểm tra tồn kho
      await phone.checkStockAvailability(quantity);

      const existingItemIndex = cart.items.findIndex(
        (item) => item.phone.toString() === phoneId
      );

      if (existingItemIndex >= 0) {
        // Nếu sản phẩm đã tồn tại, cập nhật số lượng và giá
        cart.items[existingItemIndex].quantity += quantity;
        // cart.items[existingItemIndex].price = phone.finalPrice || phone.price;
        // cart.items[existingItemIndex].price = price;
      } else {
        // Nếu sản phẩm chưa tồn tại, thêm mới vào giỏ hàng
        // cart.items.push({
        //   phone: phoneId,
        //   quantity,
        //   price,
        //   imageUrl,
        //   isGift,
        //   customOption,
        //   currency,
        // });
        cart.items.push({
          phone: phoneId,
          quantity,
          price: phone.finalPrice || phone.price,
          originalPrice: phone.price,
          imageUrl: imageUrl || phone.imageUrl,
          isGift,
          customOption,
          currency,
        });
      }
    }

    // // Tính toán lại tổng giá trị giỏ hàng
    // cart.totalCartPrice = cart.items.reduce(
    //   (total, item) => total + item.quantity * item.price,
    //   0
    // );

    const savedCart = await cart.save();
    return res.status(200).json({ success: true, cart: savedCart });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Thêm sản phẩm vào giỏ hàng
const addToCart = async (req, res) => {
  try {
    const { quantity, imageUrl, isGift, customOption, currency, shippingInfo } =
      req.body;

    const userId = req.body.userId;
    const phoneId = req.body.phoneId;

    // Kiểm tra các trường bắt buộc
    if (
      !userId ||
      !phoneId ||
      !quantity ||
      !imageUrl ||
      !shippingInfo ||
      !currency
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Kiểm tra nếu giá trị currency không hợp lệ
    const validCurrencies = ["USD", "VND", "EUR", "JPY"];
    if (currency && !validCurrencies.includes(currency)) {
      return res.status(400).json({ message: "Invalid currency." });
    }

    // Kiểm tra sản phẩm
    const phone = await Phone.findById(phoneId);
    if (!phone) {
      return res.status(404).json({ message: "Phone not found." });
    }

    // Kiểm tra tồn kho
    await phone.checkStockAvailability(quantity);

    // Tìm hoặc tạo giỏ hàng
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        shippingInfo: shippingInfo || { address: null },
      });
    } else {
      cart.shippingInfo = shippingInfo || cart.shippingInfo; // Cập nhật shippingInfo
    }

    // Kiểm tra xem sản phẩm đã tồn tại trong giỏ hàng chưa
    const existingItemIndex = cart.items.findIndex(
      (item) => item.phone.toString() === phoneId
    );

    if (existingItemIndex >= 0) {
      // Nếu tồn tại, cập nhật số lượng
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Thêm sản phẩm mới
      cart.items.push({
        phone: phoneId,
        quantity,
        price: phone.finalPrice || phone.price, // Lấy giá từ Phone
        originalPrice: phone.price,
        imageUrl: imageUrl || phone.image,
        isGift: isGift || false,
        customOption: customOption || {},
        currency: currency || "VND",
      });
    }

    // Lưu giỏ hàng để middleware pre("save") xử lý các trường còn lại
    const savedCart = await cart.save();

    return res.status(201).json({
      message: "Product added to cart",
      cart: savedCart,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error adding to cart", error: error.message });
  }
};

// Cập nhật sản phẩm trong giỏ hàng
const updateCartItem = async (req, res) => {
  try {
    const { quantity, customOption, isGift, price } = req.body;

    const userId = req.body.userId; // Lấy userId từ request body
    const phoneId = req.body.phoneId; // Sửa lại lấy phoneId từ request body

    if (!userId || !phoneId || quantity === undefined) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Tìm sản phẩm trong giỏ hàng
    const itemIndex = cart.items.findIndex(
      (item) => item.phone.toString() === phoneId
    );

    if (itemIndex >= 0) {
      // Cập nhật thông tin sản phẩm
      if (quantity > 0) {
        cart.items[itemIndex].quantity = quantity;
        if (customOption) cart.items[itemIndex].customOption = customOption;
        if (isGift !== undefined) cart.items[itemIndex].isGift = isGift;
        // if (price !== undefined) cart.items[itemIndex].price = price;
      } else {
        // Nếu số lượng <= 0, xóa sản phẩm khỏi giỏ hàng
        cart.items.splice(itemIndex, 1);
      }
    } else {
      // Nếu sản phẩm chưa có trong giỏ hàng, trả về lỗi
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // // Cập nhật lại tổng giá trị giỏ hàng
    // cart.totalCartPrice = cart.items.reduce(
    //   (total, item) => total + item.quantity * item.price,
    //   0
    // );

    // // Áp dụng giảm giá (nếu có)
    // if (cart.discount) {
    //   cart.totalCartPrice -= cart.discount;
    //   if (cart.totalCartPrice < 0) cart.totalCartPrice = 0; // Không cho phép giá trị âm
    // }

    const updatedCart = await cart.save();
    return res.status(200).json({ message: "Cart updated", cart: updatedCart });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating cart", error: error.message });
  }
};

// Xóa sản phẩm khỏi giỏ hàng
const removeFromCart = async (req, res) => {
  try {
    const { userId, phoneId } = req.body;

    if (!userId || !phoneId) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Xóa sản phẩm khỏi giỏ hàng
    cart.items = cart.items.filter((item) => item.phone.toString() !== phoneId);

    // // Cập nhật lại tổng giá trị giỏ hàng
    // cart.totalCartPrice = cart.items.reduce(
    //   (total, item) => total + item.quantity * item.price,
    //   0
    // );

    const updatedCart = await cart.save();
    return res
      .status(200)
      .json({ message: "Product removed from cart", cart: updatedCart });
  } catch (error) {
    return res.status(500).json({
      message: "Error removing product from cart",
      error: error.message,
    });
  }
};

// Lấy thông tin giỏ hàng của người dùng
const getCart = async (req, res) => {
  try {
    // const { userId } = req.params;
    const userId = req.body.userId;

    // Kiểm tra nếu userId không hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    // Tìm giỏ hàng của người dùng
    let cart = await Cart.findOne({ user: userId })
      .populate("items.phone", "name brand price imageUrl")
      .populate(
        "shippingInfo.address",
        "recipientName phoneNumber street city district ward province country"
      );
    // Nếu không tìm thấy, tạo giỏ hàng trống
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalCartPrice: 0,
        discount: 0,
        // shippingInfo: {
        //   address: {
        //     street: "",
        //     city: "",
        //     district: "",
        //     country: "",
        //     postalCode: "",
        //   },
        // },
      });
      await cart.save();
    }

    // Tính tổng giá trị giỏ hàng
    // const totalCartPrice = cart.items.reduce(
    //   (sum, item) => sum + item.quantity * item.price,
    //   0
    // );

    // Tính tổng tiền sau giảm giá
    // const finalPrice = totalCartPrice - cart.discount;

    // Chuẩn bị dữ liệu trả về
    const cartData = {
      user: cart.user,
      items: cart.items.map((item) => ({
        phone: item.phone,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        imageUrl: item.imageUrl,
        isGift: item.isGift,
        customOption: item.customOption,
        currency: item.currency,
        createdAt: item.createdAt,
      })),
      subTotal: cart.subTotal,
      totalCartPrice: cart.totalCartPrice,
      discount: cart.discount,
      discountAmount: cart.discountAmount,
      shippingFee: cart.shippingFee,
      estimatedDeliveryDate: cart.estimatedDeliveryDate,
      deliveryOption: cart.deliveryOption,
      loyaltyPoints: cart.loyaltyPoints,
      useLoyaltyPoints: cart.useLoyaltyPoints,
      specialRequests: cart.specialRequests,
      paymentMethod: cart.paymentMethod,
      checkStatus: cart.checkStatus,
      shippingInfo: cart.shippingInfo,
    };

    return res.status(200).json(cartData);
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving cart",
      error: error.message,
    });
  }
};

// Xóa tất cả sản phẩm trong giỏ hàng
const clearCart = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // cart.items = [];
    // cart.totalCartPrice = 0;
    cart.items = [];
    cart.subTotal = 0;
    cart.totalCartPrice = 0;
    cart.discount = null;
    cart.discountAmount = 0;
    cart.shippingFee = 0;
    cart.loyaltyPoints = 0;

    const clearedCart = await cart.save();
    return res.status(200).json({ message: "Cart cleared", cart: clearedCart });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error clearing cart", error: error.message });
  }
};

module.exports = {
  addToCart,
  addMultipleToCart,
  updateCartItem,
  removeFromCart,
  getCart,
  clearCart,
};
