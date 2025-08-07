const express = require("express");
const {
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
} = require("../controller/addressController");
const app = express();
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

router.post("/add", createAddress);
// Route để thêm địa chỉ mới (yêu cầu đăng nhập)
// router.post("/add", authMiddleware, createAddress);

// Route để lấy danh sách địa chỉ của một người dùng (yêu cầu đăng nhập)
// router.get("/:userId", getAddressByUser);
router.get("/:userId", authMiddleware, getAddressByUser);

// Route để lấy tất cả địa chỉ (chỉ dành cho admin)
// router.get("/", getAddresses);
router.get("/", authMiddleware, adminMiddleware, getAddresses);

// Route để lấy chi tiết một địa chỉ theo ID (yêu cầu đăng nhập)
// router.get("/:id", getAddressById);
router.get("/:id", authMiddleware, getAddressById);

// Route để lấy địa chỉ mặc định của người dùng (yêu cầu đăng nhập)
// router.get("/default/:userId", authMiddleware, getDefaultAddress);
router.get("/default/:userId", getDefaultAddress);
// router.get("/default", getDefaultAddress);

// Route để cập nhật địa chỉ (yêu cầu đăng nhập)
// router.put("/update/:id", authMiddleware, updateAddress);
router.put("/update/:id", updateAddress);

// Route để đặt địa chỉ làm mặc định (yêu cầu đăng nhập)
// router.put("/:id/default", setDefaultAddress);
router.put("/:id/default", authMiddleware, setDefaultAddress);

// Route để xóa một địa chỉ (yêu cầu đăng nhập)
// router.delete("/delete/:id", deleteAddress);
router.delete("/delete/:id", authMiddleware, deleteAddress);

// Route để tìm kiếm địa chỉ của một người dùng (yêu cầu đăng nhập)
// router.get("/search", searchAddresses);
// router.get("/search/:userId", authMiddleware, searchAddresses);
router.get("/search/:userId", searchAddresses);

// Route để xóa tất cả địa chỉ của một người dùng (yêu cầu đăng nhập)
// router.delete("/user/:userId", deleteAllAddressesByUser);
router.delete("/user/:userId", authMiddleware, deleteAllAddressesByUser);

module.exports = router;
