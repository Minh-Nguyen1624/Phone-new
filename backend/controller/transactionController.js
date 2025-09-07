const Transaction = require("../model/transactionModel");
const Order = require("../model/orderModel");
const User = require("../model/userModel");
const Payment = require("../model/paymentModel");
const mongoose = require("mongoose");

const createdTransaction = async (req, res) => {
  try {
    const {
      user,
      order,
      paymentId,
      amount,
      status,
      paymentMethod,
      description,
      currency,
      transactionFee,
      // transactionRef,
      transactionId,
      initiator,
    } = req.body;

    // Validate required fields
    if (!user || !order || !amount || !status || !paymentMethod || !paymentId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao dịch.",
      });
    }

    // Validate ObjectId
    if (
      !mongoose.Types.ObjectId.isValid(user) ||
      !mongoose.Types.ObjectId.isValid(order) ||
      !mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ (user, order, hoặc paymentId).",
      });
    }

    // Check if user exists
    const existingUser = await User.findById(user);
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if order exists
    const existingOrder = await Order.findById(order);
    if (!existingOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if payment exists for this order
    const existingPayment = await Payment.findOne({ order });
    if (!existingPayment) {
      return res
        .status(400)
        .json({ success: false, message: "No payment found for this order" });
    }

    // Check if payment is associated with the order
    if (existingPayment.order.toString() !== order.toString()) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this order",
      });
    }

    // Check if transaction amount exceeds payment amount
    if (amount > existingPayment.amount) {
      return res.status(400).json({
        success: false,
        message: "Transaction amount cannot exceed payment amount",
      });
    }

    // Check if paymentMethod matches
    if (paymentMethod !== existingPayment.paymentMethod) {
      return res
        .status(400)
        .json({ success: false, message: "Payment method does not match" });
    }

    // // Check if transactionRef is unique
    // if (transactionRef) {
    //   const existingTransaction = await Transaction.findOne({ transactionRef });
    //   if (existingTransaction) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Mã giao dịch đã tồn tại.",
    //     });
    //   }
    // }
    // Check if transactionId is unique (if provided)
    if (transactionId) {
      const existingTransaction = await Transaction.findOne({ transactionId });
      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: `Transaction ID ${transactionId} already exists`,
        });
      }
    }

    // // Create new transaction
    // const newTransaction = new Transaction({
    //   user,
    //   order,
    //   paymentId,
    //   amount,
    //   status,
    //   paymentMethod,
    //   description,
    //   currency,
    //   transactionFee,
    //   transactionRef: transactionRef || `TXN_${Date.now()}`,
    //   initiator,
    // });
    // Create new transaction
    const newTransaction = new Transaction({
      user,
      order,
      paymentId,
      amount,
      status: "Pending",
      paymentMethod,
      description,
      currency: currency || "VND", // Mặc định là VND nếu không cung cấp
      transactionFee: transactionFee || 0, // Mặc định là 0 nếu không cung cấp
      transactionId: transactionId || `TXN_${Date.now()}`, // Tạo transactionId nếu không cung cấp
      initiator: initiator || "user", // Mặc định là user nếu không cung cấp
    });

    const savedTransaction = await newTransaction.save();

    // Cập nhật mảng transactions trong Payment
    existingPayment.transactions = existingPayment.transactions || [];
    existingPayment.transactions.push(savedTransaction._id);
    await existingPayment.save();

    res.json({
      success: true,
      message: "Tạo giao dịch thành công.",
      data: savedTransaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create transaction",
      error: error.message,
    });
  }
};

// Lấy tất cả giao dịch
const getAllTransaction = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, userId, orderId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "User ID không hợp lệ.",
        });
      }
      filter.user = userId;
    }
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          success: false,
          message: "Order ID không hợp lệ.",
        });
      }
      filter.order = orderId;
    }

    const transactions = await Transaction.find(filter)
      .populate("user", "username email")
      .populate("order", "orderNumber totalAmount orderStatus")
      .populate("paymentId", "paymentStatus amount transactionId")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ transactionDate: -1 });

    const totalAmount = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Lấy tất cả giao dịch thành công.",
      data: transactions,
      totalAmount,
      totalPages: Math.ceil(totalAmount / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get all transactions",
      error: error.message,
    });
  }
};

// Lấy chi tiết giao dịch theo ID
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID không hợp lệ.",
      });
    }

    const transaction = await Transaction.findById(id)
      .populate("user", "username email")
      .populate("order", "orderNumber totalAmount orderStatus")
      .populate("paymentId", "paymentStatus amount transactionId");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Giao dịch không tìm thấy.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết giao dịch thành công.",
      data: transaction,
    });
  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transaction by ID",
      error: error.message,
    });
  }
};

// Cập nhật giao dịch
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedAt, failureReason, description, transactionFee } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID không hợp lệ.",
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Giao dịch không tìm thấy.",
      });
    }

    // Cập nhật các trường được phép
    if (status) transaction.status = status;
    if (completedAt) transaction.completedAt = completedAt;
    if (failureReason) transaction.failureReason = failureReason;
    if (description) transaction.description = description;
    if (transactionFee !== undefined)
      transaction.transactionFee = transactionFee;

    const updatedTransaction = await transaction.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật giao dịch thành công.",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update transaction",
      error: error.message,
    });
  }
};

// Tìm kiếm giao dịch theo tham số
// Xóa giao dịch
const deletedTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID không hợp lệ.",
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Giao dịch không tìm thấy.",
      });
    }

    // Xóa transaction khỏi mảng transactions trong Payment
    await Payment.updateOne(
      { _id: transaction.paymentId },
      { $pull: { transactions: transaction._id } }
    );

    await Transaction.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Xóa giao dịch thành công.",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
      error: error.message,
    });
  }
};

// Tìm kiếm giao dịch
const searchTransaction = async (req, res) => {
  try {
    const { transactionId, status, userId, orderId } = req.query;

    const filter = {};
    if (transactionId) {
      filter.transactionId = { $regex: transactionId, $options: "i" };
    }
    if (status) {
      filter.status = status;
    }
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "User ID không hợp lệ.",
        });
      }
      filter.user = userId;
    }
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          success: false,
          message: "Order ID không hợp lệ.",
        });
      }
      filter.order = orderId;
    }

    const transactions = await Transaction.find(filter)
      .populate("user", "username email")
      .populate("order", "orderNumber totalAmount orderStatus")
      .populate("paymentId", "paymentStatus amount transactionId")
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      message: "Tìm kiếm giao dịch thành công.",
      data: transactions,
    });
  } catch (error) {
    console.error("Error searching transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search transaction",
      error: error.message,
    });
  }
};

// Cập nhật trạng thái giao dịch
const updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, failureReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID không hợp lệ.",
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Giao dịch không tìm thấy.",
      });
    }

    // Kiểm tra nếu trạng thái là Failed hoặc Cancelled thì cần failureReason
    if (["Failed", "Cancelled"].includes(status)) {
      if (!failureReason) {
        return res.status(400).json({
          success: false,
          message:
            "Yêu cầu nhập lý do khi trạng thái là Failed hoặc Cancelled.",
        });
      }
      transaction.failureReason = failureReason;
    }

    // Cập nhật trạng thái và completedAt (nếu trạng thái là Completed)
    transaction.status = status;
    if (status === "Completed") {
      transaction.completedAt = new Date();
    }

    const updatedTransaction = await transaction.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái giao dịch thành công.",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update transaction status",
      error: error.message,
    });
  }
};

// Thống kê giao dịch
const getTransactionStats = async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalTransactionFee: { $sum: "$transactionFee" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Lấy thống kê giao dịch thành công.",
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transaction stats",
      error: error.message,
    });
  }
};

module.exports = {
  createdTransaction,
  getAllTransaction,
  getTransactionById,
  updateTransaction,
  deletedTransaction,
  getTransactionStats,
  searchTransaction,
  updateTransactionStatus,
};
