const Discount = require("../model/discountModel"); // Kết nối tới discountModel
const mongoose = require("mongoose");
const Phone = require("../model/phoneModel");

// Lấy danh sách mã giảm giá (có thể lọc theo trạng thái, ngày)
const getAllDiscounts = async (req, res) => {
  try {
    const { isActive, startDate, endDate } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    if (endDate) filter.endDate = { $lte: new Date(endDate) };

    // Lấy danh sách mã giảm giá và sử dụng populate để lấy thông tin chi tiết
    const discounts = await Discount.find(filter)
      .populate("applicablePhones") // Lấy thông tin về các sản phẩm (Phones)
      .populate("applicableCategories") // Lấy thông tin về các danh mục (Categories)
      .populate("applicableUsers"); // Lấy thông tin về người dùng (Users)

    return res.json({ success: true, data: discounts });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Lấy chi tiết mã giảm giá theo ID
const getDiscountById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid discount ID" });
    }

    const discount = await Discount.findById(id)
      .populate("applicablePhones") // Lấy thông tin về các sản phẩm (Phones)
      .populate("applicableCategories") // Lấy thông tin về các danh mục (Categories)
      .populate("applicableUsers"); // Lấy thông tin về người dùng (Users)

    if (!discount) {
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    }

    res.status(200).json({ success: true, data: discount });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Tạo mã giảm giá mới
const createDiscount = async (req, res) => {
  try {
    const { startDate, endDate, discountType, discountValue } = req.body;

    // Kiểm tra logic ngày
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be later than start date",
      });
    }

    // Kiểm tra logic giá trị giảm giá
    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Discount value cannot exceed 100% for percentage discounts",
      });
    }

    // Tạo discount mới
    const discount = await Discount.create(req.body);

    // Sau khi tạo, lấy thông tin chi tiết về các sản phẩm, danh mục và người dùng liên quan
    const populatedDiscount = await Discount.findById(discount._id)
      .populate("applicablePhones") // Lấy thông tin về các sản phẩm (Phones)
      .populate("applicableCategories") // Lấy thông tin về các danh mục (Categories)
      .populate("applicableUsers"); // Lấy thông tin về người dùng (Users)

    res.status(201).json({
      success: true,
      message: "Discount created successfully",
      data: populatedDiscount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Cập nhật mã giảm giá
const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, discountType, discountValue } = req.body;

    // Kiểm tra logic ngày nếu được cập nhật
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be later than start date",
      });
    }

    // Kiểm tra logic giá trị giảm giá
    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Discount value cannot exceed 100% for percentage discounts",
      });
    }

    const discount = await Discount.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!discount) {
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    }

    // Lấy thông tin chi tiết về các sản phẩm, danh mục và người dùng liên quan
    const populatedDiscount = await discount
      .populate("applicablePhones")
      .populate("applicableCategories")
      .populate("applicableUsers")
      .execPopulate();

    res.status(200).json({
      success: true,
      message: "Discount updated successfully",
      data: populatedDiscount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Xóa mềm mã giảm giá
const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findByIdAndUpdate(
      id,
      { deletedAt: Date.now(), isActive: false },
      { new: true }
    );

    if (!discount) {
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Discount deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Bật/tắt trạng thái mã giảm giá
const toggleDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findById(id);
    if (!discount) {
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    }

    discount.isActive = !discount.isActive;
    await discount.save();

    res.status(200).json({
      success: true,
      message: `Discount is now ${discount.isActive ? "active" : "inactive"}`,
      data: discount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Kiểm tra mã giảm giá khả dụng
const checkDiscountAvailability = async (req, res) => {
  try {
    const { code, userId } = req.body;

    const discount = await Discount.findOne({ code });
    if (!discount) {
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    }

    const now = new Date();
    if (
      !discount.isActive ||
      now < discount.startDate ||
      now > discount.endDate
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Discount is not active or expired" });
    }

    // Kiểm tra mã giảm giá áp dụng cho người dùng
    const isApplicable = discount.isApplicableToUser(userId);
    if (!isApplicable) {
      return res.status(400).json({
        success: false,
        message: "Discount is not applicable to this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "Discount is available",
      data: discount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const applyDiscountToPhones = async (req, res) => {
  try {
    const { phoneIds } = req.body;
    const { id } = req.params; // ID của discount

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount ID format.",
      });
    }

    if (!Array.isArray(phoneIds) || phoneIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone ID list.",
      });
    }

    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount ID không tồn tại trong database.",
      });
    }

    const now = new Date();
    if (
      !discount.isActive ||
      discount.startDate > now ||
      discount.endDate < now
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount không hợp lệ hoặc đã hết hạn.",
      });
    }

    const phones = await Phone.find({ _id: { $in: phoneIds } });

    if (!phones || phones.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy điện thoại với các ID được cung cấp.",
      });
    }

    for (let phone of phones) {
      phone.discount = id;
      let calculatedDiscountValue = 0;

      if (discount.discountType === "percentage") {
        if (discount.discountValue > 100) {
          return res.status(400).json({
            success: false,
            message: `Discount percentage (${discount.discountValue}%) cannot exceed 100%.`,
          });
        }
        calculatedDiscountValue = (phone.price * discount.discountValue) / 100;
      } else {
        if (discount.discountValue > phone.price) {
          return res.status(400).json({
            success: false,
            message: `Discount value (${discount.discountValue}) cannot exceed the phone's price (${phone.price}).`,
          });
        }
        calculatedDiscountValue = discount.discountValue;
      }

      // Đảm bảo giá trị giảm giá không vượt quá giá gốc
      phone.discountValue = Math.min(calculatedDiscountValue, phone.price);
      phone.finalPrice = Math.max(phone.price - phone.discountValue, 0);

      console.log(
        `📌 Phone ID: ${phone._id} | Original Price: ${phone.price} | Discount Applied: ${phone.discountValue} | Final Price: ${phone.finalPrice}`
      );

      await phone.save();
    }

    res.status(200).json({
      success: true,
      message: `Discount applied successfully to ${phones.length} selected phones.`,
      updatedPhones: phones.map((phone) => ({
        id: phone._id,
        originalPrice: phone.price,
        discountApplied: phone.discountValue,
        finalPrice: phone.finalPrice,
      })),
    });
  } catch (error) {
    console.error(`❌ Error applying discount: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  toggleDiscountStatus,
  checkDiscountAvailability,
  applyDiscountToPhones,
};
