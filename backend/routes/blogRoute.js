const express = require("express");
const {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  toggleLikeBlog,
} = require("../controller/blogController");
const {
  protect,
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware"); // Đảm bảo đúng đường dẫn
const router = express.Router();

router.get("/all", protect, getAllBlogs);
router.get("/:id", protect, getBlogById);
router.post("/add", protect, createBlog);
router.put("/update/:id", protect, adminMiddleware, updateBlog);
router.delete("/delete/:id", protect, adminMiddleware, deleteBlog);

// route toggleLikeBlogs
router.patch("/blogs/:id/toggle-like", protect, toggleLikeBlog);
// router.post("/:id/comments", addComment);
// router.get("/BLOG_ID/comments", getBlogComments);
module.exports = router;
// GET http://localhost:3000/blogs/BLOG_ID/comments?page=1&limit=10
// GET http://localhost:3000/comments-by-phone/PHONE_ID
// GET http://localhost:3000/comments/user/USER_ID
