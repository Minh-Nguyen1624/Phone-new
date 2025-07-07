const Voucher = require("../model/voucherModel");
const { check, validationResult } = require("express-validator");
const crypto = require("crypto");

const createVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    const voucher = new Voucher(voucherData);
    await voucher.save();
    res.status(201).json({
      success: true,
      message: "Voucher created successfully",
      data: voucher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy danh sách các voucher
const getAllVouchers = async (req, res) => {
  try {
    // const vouchers = await Voucher.find(req.params)
    const vouchers = await Voucher.find()
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .populate("applicableUsers", "email");
    res.status(200).json({
      success: true,
      message: "Vouchers retrieved successfully",
      data: vouchers,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy thông tin voucher cụ thể theo ID
const getVoucherById = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .populate("applicableUsers", "email");

    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }

    res.status(200).json({
      success: true,
      message: "Voucher retrieved successfully",
      data: voucher,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Sửa thông tin voucher theo ID
// const updateVoucher = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.body;
//     const updateData = { ...req.body };
//     const existingVoucher = await Voucher.findById(req.params.id);
//     if (!existingVoucher) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Voucher not found" });
//     }
//     // 2. Validate giá trị giảm giá
//     if (updateData.discountType || updateData.discountValue !== undefined) {
//       const discountType =
//         updateData.discountType || existingVoucher.discountType;
//       const discountValue =
//         updateData.discountValue !== undefined
//           ? updateData.discountValue
//           : existingVoucher.discountValue;

//       if (
//         discountType === "percentage" &&
//         (discountValue < 1 || discountValue > 100)
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "For percentage discount, value must be between 1 and 100",
//         });
//       }

//       if (discountType === "fixed" && discountValue <= 0) {
//         return res.status(400).json({
//           success: false,
//           message: "For fixed discount, value must be greater than 0",
//         });
//       }
//     }

//     // 3. Validate giới hạn sử dụng
//     if (
//       updateData.usageLimit !== undefined &&
//       updateData.usageLimit < existingVoucher.usedCount
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Giới hạn sử dụng mới không được nhỏ hơn số lượng sử dụng hiện tại",
//       });
//     }
//     // Kiểm tra ngày bắt đầu và ngày kết thúc
//     if (startDate && endDate && startDate > endDate) {
//       return res.status(400).json({
//         success: false,
//         message: "Ngày bắt đầu phải nhỏ hơn ngày kết thúc",
//       });
//     }

//     const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });

//     if (!voucher) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Voucher not found" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Voucher updated successfully",
//       data: voucher,
//     });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };
// const updateVoucher = async (req, res) => {
//   try {
//     // Lấy thông tin voucher hiện tại
//     const existingVoucher = await Voucher.findById(req.params.id);
//     if (!existingVoucher) {
//       return res.status(404).json({
//         success: false,
//         message: "Voucher not found",
//       });
//     }

//     // Chuẩn bị dữ liệu cập nhật
//     const updateData = { ...req.body };

//     // 1. Validate ngày
//     if (updateData.startDate || updateData.endDate) {
//       const startDate = new Date(
//         updateData.startDate || existingVoucher.startDate
//       );
//       const endDate = new Date(updateData.endDate || existingVoucher.endDate);

//       if (endDate <= startDate) {
//         return res.status(400).json({
//           success: false,
//           message: "End date must be later than start date",
//         });
//       }
//     }

//     // 2. Validate giá trị giảm giá
//     if (updateData.discountType || updateData.discountValue !== undefined) {
//       const discountType =
//         updateData.discountType || existingVoucher.discountType;
//       const discountValue =
//         updateData.discountValue !== undefined
//           ? updateData.discountValue
//           : existingVoucher.discountValue;

//       if (
//         discountType === "percentage" &&
//         (discountValue < 1 || discountValue > 100)
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "For percentage discount, value must be between 1 and 100",
//         });
//       }

//       if (discountType === "fixed" && discountValue <= 0) {
//         return res.status(400).json({
//           success: false,
//           message: "For fixed discount, value must be greater than 0",
//         });
//       }
//     }

//     // 3. Validate giới hạn sử dụng
//     if (
//       updateData.usageLimit !== undefined &&
//       updateData.usageLimit < existingVoucher.usedCount
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "New usage limit cannot be less than current used count",
//       });
//     }

//     // 4. Cập nhật voucher
//     const updatedVoucher = await Voucher.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       {
//         new: true, // Trả về dữ liệu đã cập nhật
//         runValidators: true, // Kiểm tra hợp lệ dữ liệu
//       }
//     );

//     // 5. Gửi phản hồi thành công
//     res.status(200).json({
//       success: true,
//       message: "Voucher updated successfully",
//       data: updatedVoucher,
//     });
//   } catch (error) {
//     // console.error("Error updating voucher:", error.message);
//     res.status(500).json({
//       success: false,
//       // message: "Internal server error while updating voucher",
//       error: error.message,
//     });
//   }
// };

// const updateVoucher = async (req, res) => {
//   try {
//     // Kiểm tra xem voucher có tồn tại hay không
//     const voucher = await Voucher.findById(req.params.id);

//     if (!voucher) {
//       return res.status(404).json({
//         success: false,
//         message: "Voucher not found",
//       });
//     }

//     // Cập nhật thông tin voucher với các trường mới từ request body
//     const updatedVoucher = await Voucher.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       {
//         new: true, // Trả về đối tượng voucher đã được cập nhật
//         runValidators: true, // Chạy các validators định nghĩa trong schema
//       }
//     );

//     // Trả về kết quả thành công với dữ liệu voucher đã cập nhật
//     res.status(200).json({
//       success: true,
//       message: "Voucher updated successfully",
//       data: updatedVoucher,
//     });
//   } catch (error) {
//     // Xử lý lỗi và trả về thông báo lỗi chính xác
//     console.error(error);
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// Xóa voucher theo ID
const updateVoucher = async (req, res) => {
  try {
    const { startDate, endDate, discountType, discountValue, usageLimit } =
      req.body;
    const updateData = { ...req.body };

    // Kiểm tra sự tồn tại của voucher trước
    const existingVoucher = await Voucher.findById(req.params.id);
    if (!existingVoucher) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }

    // 2. Validate giá trị giảm giá
    if (discountType || discountValue !== undefined) {
      const voucherDiscountType = discountType || existingVoucher.discountType;
      const voucherDiscountValue =
        discountValue !== undefined
          ? discountValue
          : existingVoucher.discountValue;

      if (
        voucherDiscountType === "percentage" &&
        (voucherDiscountValue < 1 || voucherDiscountValue > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: "For percentage discount, value must be between 1 and 100",
        });
      }

      if (voucherDiscountType === "fixed" && voucherDiscountValue <= 0) {
        return res.status(400).json({
          success: false,
          message: "For fixed discount, value must be greater than 0",
        });
      }
    }

    // 3. Validate giới hạn sử dụng
    if (usageLimit !== undefined && usageLimit < existingVoucher.usedCount) {
      return res.status(400).json({
        success: false,
        message:
          "Giới hạn sử dụng mới không được nhỏ hơn số lượng sử dụng hiện tại",
      });
    }

    // Kiểm tra ngày bắt đầu và ngày kết thúc
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu phải nhỏ hơn ngày kết thúc",
        });
      }

      // Kiểm tra kiểu dữ liệu của startDate và endDate
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message:
            "Ngày bắt đầu và ngày kết thúc phải là định dạng ngày hợp lệ",
        });
      }
    }

    // Cập nhật voucher
    const updatedVoucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Voucher updated successfully",
      data: updatedVoucher,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);

    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }

    voucher.deletedAt = Date.now();
    voucher.isActive = false; // Vô hiệu hóa voucher khi xóa
    await voucher.save();

    res.status(200).json({
      success: true,
      message: "Voucher deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// // Áp dụng voucher cho người dùng hoặc đơn hàng?
const applyVoucher = async (req, res) => {
  const userId = req.body.userId;
  const voucherCode = req.body.code;

  // Kiểm tra đầu vào
  if (!userId || !voucherCode) {
    return res.status(400).json({
      success: false,
      message: "User ID and Voucher Code are required",
    });
  }

  try {
    // Tìm voucher theo mã, không phân biệt hoa/thường và loại bỏ voucher đã bị xóa mềm
    const voucher = await Voucher.findOne({
      code: { $regex: new RegExp(`^${voucherCode.trim()}$`, "i") }, // Loại bỏ khoảng trắng thừa
      deletedAt: null, // Loại bỏ voucher bị xóa mềm
    });

    // Kiểm tra nếu không tìm thấy voucher
    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }

    // Kiểm tra trạng thái và thời gian của voucher
    const now = Date.now();

    if (!voucher.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Voucher is not active" });
    }
    if (voucher.endDate < now) {
      return res
        .status(400)
        .json({ success: false, message: "Voucher has expired" });
    }
    if (voucher.usedCount >= voucher.usageLimit) {
      return res
        .status(400)
        .json({ success: false, message: "Voucher usage limit reached" });
    }

    // Kiểm tra voucher có áp dụng cho user không
    if (voucher.applicableUsers && voucher.applicableUsers.length > 0) {
      if (!voucher.applicableUsers.some((id) => id.toString() === userId)) {
        return res.status(400).json({
          success: false,
          message: "Voucher is not applicable for this user",
        });
      }
    }

    // Nếu voucher hợp lệ, tiến hành cập nhật số lượng sử dụng
    voucher.usedCount += 1; // Tăng số lượng đã sử dụng lên 1

    // Lưu lại voucher sau khi cập nhật
    await voucher.save();

    // Phản hồi khi thành công
    return res.status(200).json({
      success: true,
      message: "Voucher applied successfully",
      data: {
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
      },
    });
  } catch (error) {
    console.error("Error applying voucher:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
    });
  }
};

// // Lấy danh sách các voucher đang hoạt động
// const getActiveVouchers = async (req, res) => {
//   try {
//     const now = Date.now();
//     const activeVouchers = await Voucher.find({
//       isActive: true,
//       startDate: { $lte: now },
//       endDate: { $gte: now },
//     }).exec();
//     if (activeVouchers.length === 0) {
//       console.log("No active vouchers found."); // Nếu không có voucher nào thỏa mãn điều kiện
//     }
//     res.status(200).json({ success: true, data: activeVouchers });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };
const getActiveVouchers = async (req, res) => {
  try {
    if (req.params.id) {
      return res.status(400).json({
        success: false,
        message: "Invalid endpoint for fetching active vouchers.",
      });
    }
    const now = Date.now();

    // Tìm các voucher đang hoạt động, có thời gian áp dụng hợp lệ
    const activeVouchers = await Voucher.find({
      isActive: true, // Chỉ tìm voucher còn hoạt động
      startDate: { $lte: now }, // Thời gian bắt đầu <= thời gian hiện tại
      endDate: { $gte: now }, // Thời gian kết thúc >= thời gian hiện tại
      deletedAt: null, // Không phải là voucher đã bị xóa (soft delete)
      usageLimit: { $gt: 0 }, // Đảm bảo voucher chưa hết giới hạn sử dụng
      // usedCount: { $lt: { $ifNull: ["$usageLimit", 0] } }, // Đảm bảo số lần sử dụng chưa vượt quá giới hạn
      $expr: { $lt: ["$usedCount", { $ifNull: ["$usageLimit", Infinity] }] }, // Đảm bảo số lần sử dụng chưa vượt quá giới hạn
    }).exec();

    // Kiểm tra nếu không có voucher nào thỏa mãn điều kiện
    if (activeVouchers.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No active vouchers found." });
    }

    // Trả về danh sách voucher hợp lệ
    res.status(200).json({ success: true, data: activeVouchers });
  } catch (error) {
    console.error(
      "Error fetching active vouchers:",
      error.message,
      error.stack
    );
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Khôi phục voucher đã xóa (nếu cần thiết)
const restoreVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }
    voucher.deletedAt = null;
    // voucher.isActive = true;

    // Chỉ kích hoạt lại nếu voucher chưa hết hạn và chưa đạt giới hạn sử dụng
    const now = Date.now();
    if (voucher.endDate >= now && voucher.usedCount < voucher.usageLimit) {
      voucher.isActive = true;
    } else {
      voucher.isActive = false; // Không kích hoạt nếu không đủ điều kiện
    }
    await voucher.save();
    res
      .status(200)
      .json({ success: true, message: "Voucher restored successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xác thực voucher (validate voucher)
const validateVoucher = async (req, res) => {
  const { voucherCode, orderAmount, userId } = req.body;

  // Kiểm tra đầu vào
  if (!voucherCode || !orderAmount || !userId) {
    return res.status(400).json({
      success: false,
      message: "Voucher code, order amount, and user ID are required",
    });
  }

  try {
    const voucher = await Voucher.findOne({
      // code: voucherCode
      code: { $regex: new RegExp(`^${voucherCode.trim()}$`, "i") },
      isActive: true,
      deletedAt: null,
    });

    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }

    if (
      !voucher.isActive ||
      voucher.endDate < Date.now() ||
      voucher.usedCount >= voucher.usageLimit
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Voucher is invalid or expired" });
    }

    // if (!voucher.applicableUsers.includes(userId)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Voucher is not applicable for this user",
    //   });
    // }
    // Kiểm tra áp dụng user
    if (
      voucher.applicableUsers &&
      voucher.applicableUsers.length > 0 &&
      !voucher.applicableUsers.some((id) => id.toString() === userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Voucher is not applicable to this user",
      });
    }

    // if (orderAmount < voucher.minimumOrderAmount) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Order amount does not meet the minimum requirement",
    //   });
    // }

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (voucher.minimumOrderValue && orderAmount < voucher.minimumOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Order amount must be at least ${voucher.minimumOrderValue}`,
      });
    }

    // Tính toán giảm giá
    let discountAmount = 0;
    if (voucher.discountType === "percentage") {
      discountAmount = (orderAmount * voucher.discountValue) / 100;
    } else if (voucher.discountType === "fixed") {
      discountAmount = voucher.discountValue;
    }

    // Kiểm tra giảm giá không vượt quá số tiền đơn hàng
    discountAmount = Math.min(discountAmount, orderAmount);

    res
      .status(200)
      .json({ success: true, message: "Voucher is valid", data: voucher });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// // Tạo coupon ngẫu nhiên
// const generateCoupon = async (req, res) => {
//   const { length = 8 } = req.body;
//   try {
//     const couponCode = crypto
//       .randomBytes(length)
//       .toString("hex")
//       .substring(0, length)
//       .toUpperCase();
//     res.status(200).json({ success: true, data: { couponCode } });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

// Tạo mã coupon duy nhất
const generateUniqueCoupon = async (req, res) => {
  const { length = 8 } = req.body; // Độ dài mã giảm giá
  if (length < 3 || length > 100) {
    return res.status(400).json({
      success: false,
      message: "Length must be between 3 and 100 characters.",
    });
  }
  try {
    let isUnique = false;
    let couponCode;

    while (!isUnique) {
      couponCode = crypto
        // .randomBytes(length)
        .randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .substring(0, length)
        .toUpperCase();
      const existingVoucher = await Voucher.findOne({ code: couponCode });
      if (!existingVoucher) {
        isUnique = true;
      }
    }

    res.status(200).json({ success: true, data: { couponCode } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getFlashSaleVouchers = async (req, res) => {
  try {
    const now = Date.now();
    const flashSaleVouchers = await Voucher.find({
      isFlashSale: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    res.status(200).json({
      success: true,
      message: "Flash sale vouchers retrieved successfully",
      data: flashSaleVouchers,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  applyVoucher,
  getActiveVouchers,
  restoreVoucher,
  // generateCoupon,
  generateUniqueCoupon,
  validateVoucher,
  getFlashSaleVouchers,
};
