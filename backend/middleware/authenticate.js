const jwt = require("jsonwebtoken");
const User = require("../model/userModel"); // Đảm bảo đường dẫn chính xác tới model User

const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để thực hiện hành động này.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Giải mã JWT
    req.user = await User.findById(decoded._id); // Tìm người dùng trong DB
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ.",
    });
  }
};

module.exports = authenticate;
