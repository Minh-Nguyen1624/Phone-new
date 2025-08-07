const Address = require("../model/addressModel");
const User = require("../model/userModel");
const mongoose = require("mongoose");

// Thêm địa chỉ mới
const createAddress = async (req, res) => {
  try {
    const {
      user,
      recipientName,
      phoneNumber,
      street,
      city,
      district,
      ward,
      province,
      postalCode,
      country,
      latitude,
      longitude,
      type,
      isDefaultShipping,
      isDefaultBilling,
    } = req.body;

    // Kiểm tra các trường bắt buộc
    if (
      !user ||
      !recipientName ||
      !phoneNumber ||
      !street ||
      !city ||
      !country
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User, recipientName, phoneNumber, street, city, and country are required",
      });
    }

    // Kiểm tra user tồn tại
    if (!mongoose.Types.ObjectId.isValid(user)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Tạo địa chỉ mới
    const newAddress = new Address({
      user,
      recipientName,
      phoneNumber,
      street,
      city,
      district,
      ward,
      province,
      postalCode,
      country,
      latitude,
      longitude,
      type: type || "shipping",
      isDefaultShipping: isDefaultShipping || false,
      isDefaultBilling: isDefaultBilling || false,
    });

    await newAddress.save();

    // Cập nhật mảng address của User
    if (!userExists.address) {
      userExists.address = [];
    }
    userExists.address.push(newAddress._id);
    userExists.isProfileComplete = userExists.address.length > 0;
    await userExists.save();

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: newAddress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating address",
      error: error.message,
    });
  }
};

// Lấy danh sách địa chỉ của một người dùng
const getAddressByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, type } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const query = { user: userId };
    if (type) query.type = type; // Lọc theo loại địa chỉ (shipping, billing, etc.)

    // const addresses = await Address.find(query)
    //   .sort({ isDefault: -1, createdAt: -1 }) // Địa chỉ mặc định luôn đứng đầu
    //   .skip((page - 1) * limit)
    //   .limit(parseInt(limit));
    //
    const addresses = await Address.find(query)
      .populate("user", "username email")
      .sort({ isDefaultShipping: -1, isDefaultBilling: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Address.countDocuments(query);
    res.status(200).json({
      success: true,
      message: "Addresses retrieved successfully",
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses.",
      error: error.message,
    });
  }
};

// Lấy danh sách địa chỉ với phân trang
const getAddresses = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Tìm kiếm tất cả địa chỉ
    const addresses = await Address.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Đếm tổng số địa chỉ
    const total = await Address.countDocuments();

    res.status(200).json({
      success: true,
      message: "Addresses retrieved successfully",
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses.",
      error: error.message,
    });
  }
};

// Lấy chi tiết một địa chỉ
const getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    // const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid address ID." });
    }

    const address = await Address.findById(id).populate(
      "user",
      "username email"
    );
    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    // // Kiểm tra quyền sở hữu nếu user không phải admin
    // const isAdmin = req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    // if (!isAdmin && address.user.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You are not authorized to view this address.",
    //   });
    // }

    res.status(200).json({
      success: true,
      message: "Address retrieved successfully",
      data: address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch address.",
      error: error.message,
    });
  }
};

// // // Lấy chi tiết một địa chỉ (giống với getAddresses)
// const getAddressById = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const { page = 1, limit = 10 } = req.query;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid address ID." });
//     }

//     // Truy vấn địa chỉ theo ID với phân trang
//     const address = await Address.findById({ _id: id })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     // Kiểm tra nếu địa chỉ không tìm thấy
//     if (!address || address.length === 0) {
//       return res.status(404).json({ message: "Address not found." });
//     }

//     // Đếm tổng số địa chỉ có trong cơ sở dữ liệu (hoặc có thể là tổng số địa chỉ cho user)
//     const total = await Address.countDocuments({ _id: id });

//     res.status(200).json({
//       success: true,
//       message: "Address retrieved successfully",
//       total, // Tổng số địa chỉ tìm thấy
//       page: parseInt(page), // Trang hiện tại
//       limit: parseInt(limit), // Số lượng trên mỗi trang
//       addresses: address, // Trả về địa chỉ (với phân trang)
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch address.",
//       error: error.message,
//     });
//   }
// };

// Cập nhật địa chỉ
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    //
    const userId = req.body.userId; // Giả định userId từ auth middleware

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid address ID." });
    }

    const address = await Address.findById(id);
    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }
    //
    // Kiểm tra quyền sở hữu
    // if (address.user.toString() !== userId) {
    //   return res
    //     .status(403)
    //     .json({ message: "You are not authorized to update this address." });
    // }
    // const isAdmin =
    //   req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    // if (!isAdmin && address.user.toString() !== userId) {
    //   return res.status(403).json({
    //     message: "You are not authorized to update this address.",
    //   });
    // }

    const updatedData = req.body;
    Object.assign(address, updatedData);
    await address.save(); // Middleware tự động xử lý tọa độ và isDefault

    res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      data: address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update address.",
      error: error.message,
    });
  }
};

// Xóa địa chỉ
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    //
    const userId = req.body.userId; // Giả định userId từ auth middleware

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid address ID." });
    }

    const address = await Address.findByIdAndDelete(id);
    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    // Kiểm tra quyền sở hữu
    if (address.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this address." });
    }

    // Xóa address ID khỏi mảng addresses trong User
    await User.findByIdAndUpdate(userId, {
      $pull: { addresses: id },
    });
    //
    // Kiểm tra nếu địa chỉ bị xóa là mặc định
    if (address.isDefaultShipping || address.isDefaultBilling) {
      const nextAddress = await Address.findOne({
        user: userId,
        _id: { $ne: id },
      });
      if (nextAddress) {
        if (address.isDefaultShipping) nextAddress.isDefaultShipping = true;
        if (address.isDefaultBilling) nextAddress.isDefaultBilling = true;
        await nextAddress.save();
      }
    }

    await Address.findByIdAndDelete(id);

    res.status(200).json({ message: "Address deleted successfully.", address });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete address.",
      error: error.message,
    });
  }
};

// const getDefaultAddress = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     let { type } = req.query;

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user ID.",
//       });
//     }

//     // const isAdmin =
//     //   req.user.role && req.user.role.roleName.toLowerCase() === "admin";
//     // if (!isAdmin && userId !== req.user._id.toString()) {
//     //   return res.status(403).json({
//     //     success: false,
//     //     message:
//     //       "You are not authorized to access this user's default address.",
//     //   });
//     // }

//     type = type && ["shipping", "billing"].includes(type) ? type : "shipping";

//     const query = { user: userId };
//     if (type === "shipping") query.isDefaultShipping = true;
//     else if (type === "billing") query.isDefaultBilling = true;
//     else if (type === "billing") query.isDefaultOther = true;

//     const defaultAddress = await Address.findOne(query);
//     if (!defaultAddress) {
//       return res.status(404).json({
//         success: false,
//         message: `Default ${type} address not found.`,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: `Default ${type} address retrieved successfully.`,
//       data: defaultAddress,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to get default address.",
//       error: error.message,
//     });
//   }
// };
const getDefaultAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    let { type } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID." });
    }

    const validTypes = ["shipping", "billing", "other"];
    type = type && validTypes.includes(type) ? type : "shipping";

    const query = { user: userId };
    if (type === "shipping") query.isDefaultShipping = true;
    else if (type === "billing") query.isDefaultBilling = true;
    else if (type === "other") query.type = "other";

    const defaultAddress = await Address.findOne(query);
    if (!defaultAddress) {
      return res.status(404).json({
        success: false,
        message: `Default ${type} address not found.`,
      });
    }

    const publicAddress = {
      street: defaultAddress.street,
      city: defaultAddress.city,
      district: defaultAddress.district,
      ward: defaultAddress.ward,
      province: defaultAddress.province,
      postalCode: defaultAddress.postalCode,
      country: defaultAddress.country,
    };

    res.status(200).json({
      success: true,
      message: `Default ${type} address retrieved successfully.`,
      data: publicAddress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get default address.",
      error: error.message,
    });
  }
};

const searchAddresses = async (req, res) => {
  try {
    const { userId } = req.params;
    const { query, page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    // const isAdmin =
    //   req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    // if (!isAdmin && userId !== req.user._id.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You are not authorized to search this user's addresses.",
    //   });
    // }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let addresses;
    let total;

    if (query && typeof query === "string" && query.trim() !== "") {
      // Tìm kiếm nếu có query
      addresses = await Address.find({
        user: userId,
        $or: [
          { street: { $regex: query, $options: "i" } },
          { city: { $regex: query, $options: "i" } },
          { district: { $regex: query, $options: "i" } },
          { province: { $regex: query, $options: "i" } },
        ],
      })
        .skip(skip)
        .limit(limitNum);

      total = await Address.countDocuments({
        user: userId,
        $or: [
          { street: { $regex: query, $options: "i" } },
          { city: { $regex: query, $options: "i" } },
          { district: { $regex: query, $options: "i" } },
          { province: { $regex: query, $options: "i" } },
        ],
      });
    } else {
      // Trả về tất cả địa chỉ nếu không có query
      addresses = await Address.find({ user: userId })
        .skip(skip)
        .limit(limitNum);
      total = await Address.countDocuments({ user: userId });
    }

    res.status(200).json({
      success: true,
      message: "Search completed successfully",
      total,
      page: pageNum,
      limit: limitNum,
      data: addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to search addresses.",
      error: error.message,
    });
  }
};

const deleteAllAddressesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    await Address.deleteMany({ user: userId });
    res.status(200).json({
      success: true,
      message: "All addresses deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete all addresses.",
      error: error.message,
    });
  }
};

// Cập nhật logic trong controller
const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    let { type } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID.",
      });
    }

    // Mặc định type là "shipping" nếu không được cung cấp
    type = type && ["shipping", "billing"].includes(type) ? type : "shipping";

    const address = await Address.findById(id);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    // Kiểm tra quyền sở hữu nếu user không phải admin
    const isAdmin =
      req.user.role && req.user.role.roleName.toLowerCase() === "admin";
    if (!isAdmin && address.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to set this address as default.",
      });
    }

    // Đặt mặc định cho loại tương ứng
    if (type === "shipping") {
      await Address.updateMany(
        { user: address.user },
        { isDefaultShipping: false }
      );
      address.isDefaultShipping = true;
    } else if (type === "billing") {
      await Address.updateMany(
        { user: address.user },
        { isDefaultBilling: false }
      );
      address.isDefaultBilling = true;
    }

    await address.save();
    res.status(200).json({
      success: true,
      message: `Default ${type} address set successfully.`,
      data: address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to set default address.",
      error: error.message,
    });
  }
};

module.exports = {
  createAddress,
  getAddressByUser,
  getAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
  searchAddresses,
  deleteAllAddressesByUser,
};
