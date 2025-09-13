const Order = require("../model/orderModel");
const Address = require("../model/addressModel");
const mongoose = require("mongoose");
const User = require("../model/userModel");
const Cart = require("../model/cartModel");
const Payment = require("../model/paymentModel");
const Transaction = require("../model/transactionModel");
const {
  reserveProduct,
  unreserveProduct,
  purchaseProduct,
} = require("../services/inventoryService");

const getAllOrder = async (req, res) => {
  try {
    // Kiểm tra quyền admin
    const isAdmin =
      req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin mới có quyền truy cập danh sách tất cả đơn hàng.",
      });
    }

    const orders = await Order.find()
      .populate("user", "username email")
      .populate("items.phone", "name brand price imageUrl")
      .populate("shippingInfo.address", "street city country postalCode")
      .populate("discount")
      .populate("payments");
    res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy danh sách đơn hàng.",
      error: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate("user", "username email")
      .populate("items.phone", "name brand price imageUrl")
      .populate("shippingInfo.address", "street city country postalCode")
      .populate("discount")
      .populate("payments");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Kiểm tra quyền sở hữu
    const user = req.user; // Được thêm bởi middleware `protect`
    const isAdmin =
      req.user.role && req.user.role.roleName.toLowerCase() === "admin";

    // Nếu không phải admin, kiểm tra xem user có phải chủ đơn hàng không
    if (!isAdmin && order.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this order",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get order",
      error: error.message,
    });
  }
};

const addToOrder = async (req, res) => {
  try {
    const {
      items,
      shippingInfo,
      paymentMethod,
      discount, // Sử dụng discount trực tiếp từ body
      deliveryOption,
      useLoyaltyPoints,
      specialRequests,
      fromCart = false,
    } = req.body;

    console.log("Req body: ", req.body);

    const loggedInUser = req.user;
    if (!loggedInUser) {
      return res
        .status(403)
        .json({ message: "Không có quyền truy cập. Vui lòng đăng nhập." });
    }

    const userId = loggedInUser._id.toString();

    if (
      !items ||
      items.length === 0 ||
      !shippingInfo ||
      !shippingInfo.address ||
      !paymentMethod
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const user = await User.findById(userId).select("+loyaltyPoints");
    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Người dùng không tồn tại hoặc không hoạt động.",
      });
    }

    const address = await Address.findById(shippingInfo.address);
    if (!address) {
      return res.status(404).json({ message: "Địa chỉ không tồn tại." });
    }

    if (address.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Địa chỉ không thuộc về người dùng này." });
    }

    let validatedDiscount = discount; // Sử dụng discount trực tiếp
    console.log("Received discount from client:", discount);
    if (typeof discount === "undefined") {
      console.log("Warning: discount is undefined, setting to null");
      validatedDiscount = null;
    } else if (discount && typeof discount !== "string") {
      console.log("Warning: discount is not a string, converting to string");
      validatedDiscount = discount.toString();
    } else if (discount) {
      const Discount = mongoose.model("Discount");
      const discountDoc = await Discount.findById(discount);
      if (!discountDoc) {
        console.log(
          `Error: Discount ID ${discount} not found, setting to null`
        );
        return res
          .status(400)
          .json({ message: `Discount ID ${discount} không tồn tại.` });
      } else if (
        !discountDoc.isCurrentlyActive ||
        new Date(discountDoc.startDate) > new Date() ||
        (discountDoc.endDate && new Date(discountDoc.endDate) < new Date())
      ) {
        console.log(
          `Error: Discount ID ${discount} is not active, setting to null`
        );
        return res
          .status(400)
          .json({ message: `Discount ID ${discount} không hoạt động.` });
      }
    }
    console.log("Assigned discount:", validatedDiscount);

    if (fromCart) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Giỏ hàng trống hoặc không tồn tại.",
        });
      }

      validatedDiscount = cart.discount || discount; // Sử dụng discount từ cart nếu có
      console.log("Discount from cart:", cart.discount);

      const orderedPhoneIds = items.map((item) => item.phone);
      cart.items = cart.items.filter(
        (item) => !orderedPhoneIds.includes(item.phone.toString())
      );

      if (cart.items.length === 0) {
        await Cart.deleteOne({ user: userId });
      } else {
        await cart.save();
      }
    } else {
      for (const item of items) {
        const phone = await mongoose.connection.db.collection("phones").findOne(
          { _id: new mongoose.Types.ObjectId(item.phone) },
          {
            projection: {
              stock: 1,
              price: 1,
              name: 1,
              finalPrice: 1,
              image: 1,
            },
          }
        );
        if (!phone) {
          return res
            .status(404)
            .json({ message: `Sản phẩm không tồn tại: ${item.phone}` });
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({
            message: `Số lượng phải là số nguyên dương: ${item.quantity}`,
          });
        }
        if (typeof item.price !== "number" || item.price <= 0) {
          return res
            .status(400)
            .json({ message: `Giá phải là số dương: ${item.price}` });
        }
        const phonePrice = phone.finalPrice || phone.price;
        if (item.price !== phonePrice) {
          return res.status(400).json({
            message: `Giá không khớp với sản phẩm: ${phone.name} (giá hệ thống: ${phonePrice}, giá yêu cầu: ${item.price})`,
          });
        }
        item.originalPrice =
          item.originalPrice || phone.price || phone.finalPrice;
        item.imageUrl =
          item.imageUrl ||
          phone.image ||
          "https://default-image.com/default.jpg";
        if (
          !item.imageUrl ||
          !/^https?:\/\/.*\.(jpg|jpeg|png|gif)$/.test(item.imageUrl)
        ) {
          return res.status(400).json({
            message: `Invalid image URL for phone ${item.phone}: ${item.imageUrl}`,
          });
        }
      }
    }

    let initialTotalCartPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (useLoyaltyPoints) {
      if (user.loyaltyPoints <= 0) {
        return res
          .status(400)
          .json({ message: "Bạn không có đủ điểm thưởng để sử dụng." });
      }
      const pointsToUse = Math.min(user.loyaltyPoints, initialTotalCartPrice);
      if (pointsToUse > 0) {
        initialTotalCartPrice -= pointsToUse;
        user.loyaltyPoints -= pointsToUse;
        console.log(
          `Using ${pointsToUse} loyalty points, remaining: ${user.loyaltyPoints}`
        );
      } else {
        useLoyaltyPoints = false;
      }
      await user.save();
    }

    const shippingFee =
      shippingInfo.address && (deliveryOption || "standard") === "standard"
        ? 0
        : 30000;

    const order = new Order({
      user: userId,
      items: items.map((item) => ({
        phone: item.phone,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        imageUrl: item.imageUrl,
        currency: item.currency,
        isGift: item.isGift || false,
        customOption: item.customOption || {},
      })),
      shippingFee,
      deliveryOption: deliveryOption || "standard",
      useLoyaltyPoints: useLoyaltyPoints || false,
      specialRequests: specialRequests || {
        transferData: false,
        companyInvoice: false,
        otherRequest: "",
      },
      paymentMethod,
      shippingInfo: { address: address._id },
      discount: validatedDiscount, // Sử dụng discount đã validated
    });

    console.log("Order discount before save:", order.discount);
    console.log("Saving order...");
    const savedOrder = await order.save();
    console.log("Order saved successfully:", savedOrder._id);

    if (!Array.isArray(user.order)) {
      user.order = [];
    }
    user.order.push(savedOrder._id);
    await user.save();

    res
      .status(201)
      .json({ message: "Đơn hàng được tạo thành công.", order: savedOrder });
  } catch (error) {
    if (
      error.message.includes("Giá sản phẩm không khớp") ||
      error.message.includes("Sản phẩm không tồn tại") ||
      error.message.includes("Không đủ tồn kho") ||
      error.message.includes("Invalid image URL")
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Không thể tạo đơn hàng.", error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params; // Lấy orderId từ URL
    const {
      orderStatus,
      paymentStatus,
      paymentMethod,
      shipmentDate,
      deliveryDate,
      deliveryOption,
      useLoyaltyPoints,
      specialRequests,
      checkStatus,
    } = req.body;

    // Tìm đơn hàng theo ID
    const order = await Order.findById(id).populate("payments");
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    // Kiểm tra quyền
    const user = req.user;
    const isAdmin =
      req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    if (!isAdmin && order.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền cập nhật đơn hàng này.",
      });
    }

    // Kiểm tra và cập nhật trạng thái chỉ từ Pending sang Completed
    if (orderStatus === "Completed" || paymentStatus === "Completed") {
      if (
        order.orderStatus !== "Pending" ||
        order.paymentStatus !== "Pending"
      ) {
        return res.status(400).json({
          message: "Chỉ có thể cập nhật từ Pending sang Completed.",
        });
      }
      order.orderStatus = "Completed";
      order.paymentStatus = "Completed";

      // Cảnh báo nếu Payment vẫn Pending
      if (order.payments && order.payments.length > 0) {
        const pendingPayments = order.payments.filter(
          (payment) => payment.status === "Pending"
        );
        if (pendingPayments.length > 0) {
          console.warn(
            `Warning: Payment(s) for order ${id} are still Pending while marking as Completed.`
          );
          order.paymentPendingCompletion = true;
        }
      }
    }

    // Cập nhật các trường của đơn hàng
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (shipmentDate) order.shipmentDate = new Date(shipmentDate);
    if (deliveryDate) order.deliveryDate = new Date(deliveryDate);
    if (deliveryOption) order.deliveryOption = deliveryOption;
    if (useLoyaltyPoints !== undefined)
      order.useLoyaltyPoints = useLoyaltyPoints;
    if (specialRequests) order.specialRequests = specialRequests;
    if (checkStatus !== undefined) order.checkStatus = checkStatus;

    // Lưu đơn hàng
    const updatedOrder = await order.save();

    // Cập nhật trạng thái Payment nếu có
    if (order.payments && order.payments.length > 0) {
      const payment = await Payment.findById(order.payments[0]);
      if (payment && payment.status !== "Completed") {
        payment.status = "Completed";
        await payment.save();
      }
    }

    res.status(200).json({
      message: "Trạng thái đơn hàng đã được cập nhật.",
      order: updatedOrder,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Không thể cập nhật trạng thái đơn hàng.",
      error: error.message,
    });
  }
};

// Hàm cập nhật trạng thái thanh toán đơn hàng (dùng trong code, không cần req/res)
const updateOrderPaymentStatus = async (
  orderId,
  paymentStatus,
  txnRef,
  amount,
  paymentMethod = "VNPay",
  response = {},
  userId,
  options = {
    updateExistingPayment: false,
    validateSignature: null,
    isInitiation: false,
    refundDetails: null,
  }
) => {
  try {
    // Xác thực chữ ký nếu được cung cấp
    if (options.validateSignature) {
      const isValid = await options.validateSignature(response);
      if (!isValid) throw new Error("Invalid signature");
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId).populate("user items.phone");
    if (!order) throw new Error("Order not found");

    // Ánh xạ trạng thái thanh toán
    const statusMapUpper = paymentStatus.toUpperCase();
    let mappedPaymentStatus;
    switch (true) {
      case ["SUCCESS", "PAID", "APPROVED"].includes(statusMapUpper):
        mappedPaymentStatus = "Completed";
        break;
      case ["FAILED", "FAIL", "DENIED"].includes(statusMapUpper):
        mappedPaymentStatus = "Failed";
        break;
      case ["REFUNDED"].includes(statusMapUpper):
        mappedPaymentStatus = "Refunded";
        break;
      case ["CANCELLED"].includes(statusMapUpper):
        mappedPaymentStatus = "Cancelled";
        break;
      case ["EXPIRED"].includes(statusMapUpper):
        mappedPaymentStatus = "Expired";
        break;
      case ["PARTIALLY_REFUNDED"].includes(statusMapUpper):
        mappedPaymentStatus = "Partially Refunded";
        break;
      default:
        mappedPaymentStatus = options.isInitiation ? "Pending" : "Pending";
    }

    // Kiểm tra hoặc tạo thanh toán
    let payment;
    if (options.updateExistingPayment) {
      payment = await Payment.findOne({
        order: orderId,
        transactionId: txnRef,
      });
      if (payment) {
        payment.paymentStatus = mappedPaymentStatus;
        payment.gatewayResponse = response;
        if (["Refunded", "Partially Refunded"].includes(mappedPaymentStatus)) {
          payment.refundedAmount =
            options.refundDetails?.refundedAmount ||
            response.refundedAmount ||
            payment.refundedAmount;
          payment.refundedAt =
            options.refundDetails?.refundedAt ||
            response.refundedAt ||
            new Date();
        }
        await payment.save();
      }
    }

    if (!payment) {
      payment = new Payment({
        user: userId || order.user._id,
        order: order._id,
        paymentMethod,
        paymentStatus: mappedPaymentStatus,
        amount,
        currency: order.items[0]?.currency || "VND",
        transactionId: txnRef || `MANUAL-${orderId}-${Date.now()}`,
        gatewayResponse: response,
        transactions: [],
        clientIp: response?.vnp_IpAddr || "127.0.0.1",
      });
      await payment.save();
    }

    // Tạo giao dịch nếu cần
    let transaction = null;
    if (txnRef || mappedPaymentStatus !== "Pending") {
      transaction = new Transaction({
        user: userId || order.user._id,
        order: order._id,
        paymentId: payment._id,
        amount,
        status: mappedPaymentStatus,
        paymentMethod,
        transactionId: txnRef || payment.transactionId,
        currency: order.items[0]?.currency || "VND",
        gatewayResponse: response,
      });
      await transaction.save();
      payment.transactions = [transaction._id];
      await payment.save();
    }

    // Cập nhật kho cho các trạng thái thất bại/hết hạn/hủy
    if (["Failed", "Expired", "Cancelled"].includes(mappedPaymentStatus)) {
      for (const item of order.items) {
        const phone = item.phone;
        if (phone) {
          phone.stock += item.quantity;
          await phone.save();
        }
      }
    }

    // Cập nhật kho và điểm loyalty cho thanh toán hoàn tất
    if (mappedPaymentStatus === "Completed") {
      for (const item of order.items) {
        const phone = item.phone;
        if (phone.stock < item.quantity)
          throw new Error(`Insufficient stock for product: ${phone.name}`);
        phone.stock -= item.quantity;
        await phone.save();
      }
      if (order.loyaltyPoints && !order.useLoyaltyPoints) {
        const user = await User.findById(order.user);
        user.loyaltyPoints = (user.loyaltyPoints || 0) + order.loyaltyPoints;
        await user.save();
      }
    }

    // Cập nhật đơn hàng
    order.paymentStatus = mappedPaymentStatus;
    order.paymentMethod = paymentMethod;
    order.orderStatus =
      mappedPaymentStatus === "Completed"
        ? ["In-Store", "Cash on Delivery"].includes(paymentMethod)
          ? "delivered"
          : "processing"
        : ["Failed", "Expired", "Cancelled"].includes(mappedPaymentStatus)
        ? "Cancelled"
        : "Pending";
    if (amount && order.totalAmount !== amount) order.totalAmount = amount;
    order.payments.push(payment._id);
    const updatedOrder = await order.save();

    // Gửi thông báo
    if (mappedPaymentStatus === "Completed" && order.user.email) {
      await sendPaymentConfirmationEmail(order.user.email, {
        amount,
        currency: order.items[0]?.currency || "VND",
        transactionId: payment.transactionId,
        paymentMethod,
        createdAt: new Date(),
      });
    } else if (
      ["Failed", "Expired"].includes(mappedPaymentStatus) &&
      order.user.email
    ) {
      await sendPaymentNotification(order.user.email, payment);
    }

    return updatedOrder;
  } catch (error) {
    console.error("Error updating order payment status:", error.message);
    throw error;
  }
};

const deletedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    const isAdmin =
      req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    if (!isAdmin && order.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xóa đơn hàng này.",
      });
    }

    if (order.orderStatus !== "cancelled") {
      for (const item of order.items) {
        const phone = await mongoose.model("Phone").findById(item.phone);
        if (phone) {
          phone.stock += item.quantity;
          await phone.save();
        }
      }
    }

    await Order.findByIdAndDelete(id);
    res.status(200).json({ message: "Đơn hàng đã được xóa thành công." });
  } catch (error) {
    res.status(500).json({
      message: "Không thể xóa đơn hàng.",
      error: error.message,
    });
  }
};

const processOrder = async (req, res) => {
  try {
    const {
      userId,
      shippingInfo,
      paymentMethod,
      deliveryOption,
      useLoyaltyPoints,
      specialRequests,
      orderStatus,
      paymentStatus,
    } = req.body;

    const loggedInUser = req.user;
    if (!loggedInUser || loggedInUser._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Không có quyền xử lý đơn hàng này." });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(shippingInfo.address)) {
      return res.status(400).json({ message: "Địa chỉ không hợp lệ." });
    }
    const address = await Address.findById(shippingInfo.address);
    if (!address || address.user.toString() !== userId) {
      return res.status(403).json({
        message: "Địa chỉ không hợp lệ hoặc không thuộc về người dùng này.",
      });
    }

    const orderItems = [];
    const phoneIds = cart.items.map((item) => item.phone);
    const phones = await mongoose
      .model("Phone")
      .find({ _id: { $in: phoneIds } });

    for (const item of cart.items) {
      const phone = phones.find(
        (p) => p._id.toString() === item.phone.toString()
      );
      if (!phone) {
        return res.status(404).json({
          success: false,
          message: `Sản phẩm ${item.phone} không tồn tại.`,
        });
      }

      // orderItems.push({
      //   phone: item.phone,
      //   quantity: item.quantity,
      //   // price: item.price,
      //   price: phone.finalPrice || phone.price, // Sử dụng finalPrice nếu có
      //   originalPrice: phone.price, // Gán originalPrice từ phone.price
      //   imageUrl: item.imageUrl,
      //   isGift: item.isGift,
      //   customOption: item.customOption,
      //   currency: item.currency || "VND",
      //   createdAt: item.createdAt,
      // });
      orderItems.push({
        phone: item.phone,
        quantity: item.quantity,
        price: phone.finalPrice || phone.price, // Sử dụng finalPrice nếu có
        originalPrice: phone.price, // Giá gốc từ Phone
        imageUrl: item.imageUrl,
        isGift: item.isGift,
        customOption: item.customOption,
        currency: item.currency || "VND",
        createdAt: item.createdAt,
      });
    }

    // const order = new Order({
    //   user: userId,
    //   items: orderItems,
    //   subTotal: cart.subTotal,
    //   totalCartPrice: cart.totalCartPrice,
    //   discount: cart.discount,
    //   shippingFee: cart.shippingFee,
    //   deliveryOption: deliveryOption || cart.deliveryOption,
    //   useLoyaltyPoints: useLoyaltyPoints || cart.useLoyaltyPoints,
    //   specialRequests: specialRequests || cart.specialRequests,
    //   paymentMethod: paymentMethod || cart.paymentMethod,
    //   checkStatus: cart.checkStatus,
    //   shippingInfo: { address: shippingInfo.address },
    //   orderStatus: "pending",
    //   paymentStatus: "pending",
    // });
    const order = new Order({
      user: userId,
      items: orderItems,
      subTotal: cart.subTotal,
      totalCartPrice: cart.totalCartPrice,
      discount: cart.discount,
      shippingFee: cart.shippingFee,
      deliveryOption: deliveryOption || cart.deliveryOption,
      useLoyaltyPoints: useLoyaltyPoints || cart.useLoyaltyPoints,
      specialRequests: specialRequests || cart.specialRequests,
      paymentMethod: paymentMethod || cart.paymentMethod,
      checkStatus: cart.checkStatus,
      shippingInfo: { address: shippingInfo.address },
      // orderStatus: orderStatus || "Pending",
      orderStatus: orderStatus,
      // paymentStatus: paymentStatus || "Pending",
      paymentStatus: paymentStatus,
    });

    const savedOrder = await order.save();

    const user = await User.findById(userId);
    if (!Array.isArray(user.order)) {
      user.order = [];
    }
    user.order.push(savedOrder._id);
    await user.save();

    await Cart.deleteOne({ user: userId });

    res.status(200).json({
      success: true,
      message: "Đơn hàng được xử lý thành công!",
      order: savedOrder,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(400).json({
      success: false,
      message: "Lỗi khi xử lý đơn hàng.",
      error: error.message,
    });
  }
};

const completeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại.",
      });
    }

    const user = req.user;
    const isAdmin =
      req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    if (!isAdmin && order.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền hoàn thành đơn hàng này.",
      });
    }

    if (order.orderStatus === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã được hoàn thành trước đó.",
      });
    }

    if (order.orderStatus !== "shipped") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng chưa được vận chuyển, không thể hoàn thành.",
      });
    }

    for (const item of order.items) {
      await purchaseProduct(order.inventoryId, item.phone, item.quantity);
    }

    order.orderStatus = "delivered";
    order.paymentStatus = "completed";
    order.deliveryDate = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: "Hoàn thành đơn hàng thành công!",
      order,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Lỗi khi hoàn tất đơn hàng.",
      error: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại.",
      });
    }

    const user = req.user;
    const isAdmin =
      req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    if (!isAdmin && order.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền hủy đơn hàng này.",
      });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã được hủy trước đó.",
      });
    }

    if (order.orderStatus !== "pending" && order.orderStatus !== "processing") {
      return res.status(400).json({
        success: false,
        message: "Không thể hủy đơn hàng ở trạng thái hiện tại.",
      });
    }

    for (const item of order.items) {
      const phone = await mongoose.model("Phone").findById(item.phone);
      if (phone) {
        phone.stock += item.quantity;
        await phone.save();
      }
    }

    order.orderStatus = "cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công!",
      order,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Lỗi khi hủy đơn hàng.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllOrder,
  getOrderById,
  addToOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  deletedOrder,
  processOrder,
  completeOrder,
  cancelOrder,
};
