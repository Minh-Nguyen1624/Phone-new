const adminMiddleware = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Lấy token từ header Authorization
      const token = req.header("Authorization")?.replace("Bearer ", "");
      if (!token) {
        return res
          .status(401)
          .json({ message: "Access denied, no token provided" });
      }

      // Xác thực token và giải mã
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret-key");
      const userId = decoded.userId;

      // Tìm người dùng theo ID đã giải mã
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Kiểm tra vai trò của người dùng
      if (roles.length && !roles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Access denied, insufficient role" });
      }

      // Gắn thông tin người dùng vào request object
      req.user = user;
      next(); // Tiếp tục xử lý nếu người dùng hợp lệ và có quyền
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error verifying token", error: error.message });
    }
  };
};

module.exports = adminMiddleware;
