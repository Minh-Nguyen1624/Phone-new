const express = require("express");
const {
  getCommentByPhone,
  getCommentsByUser,
  createComment,
  updateComment,
  deleteComment,
  getBlogComments,
  getAllComments,
  toggleLikeComment,
} = require("../controller/commentController");
const app = express();
const router = express.Router();

const { protect, authMiddleware } = require("../middleware/authMiddleware");

router.get("/comments-by-phone/:phoneId", protect, getCommentByPhone);
router.get("/comments-by-user/:userId", protect, getCommentsByUser);
router.post("/add", protect, createComment);
router.put("/comments/:commentId", protect, updateComment);
router.delete("/comments/:commentId", protect, deleteComment);
router.get("/all", protect, getAllComments);
// router.get("blog/BLOG_ID/comments?page=1&limit=10", getBlogComments);
// router.get("/blog/:BLOG_ID/comments", getBlogComments);
router.get("/blog/:id/comments", protect, getBlogComments);
router.post("/comments/:commentId/like", protect, toggleLikeComment);
module.exports = router;

// GET http://localhost:3000/blogs/BLOG_ID/comments?page=1&limit=10
// GET http://localhost:3000/comments-by-phone/PHONE_ID
// GET http://localhost:3000/comments/user/USER_ID
