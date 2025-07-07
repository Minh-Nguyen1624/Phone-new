const mongoose = require("mongoose");
const Comment = require("../model/commentModel");
const Blog = require("../model/blogModel");
const createComment = async (req, res) => {
  try {
    // Lấy dữ liệu từ body
    const { userId, phoneId, content, blog, parentComment } = req.body;
    // Kiểm tra tất cả các trường cần thiết đã có
    // if (!userId || !phoneId || !content || !blog) {
    //   return res.status(400).json({ message: "Please fill in all fields" });
    // }
    if (!userId || !phoneId || !content) {
      return res.status(400).json({
        message: "Please fill in all fields (userId, phoneId, content)",
      });
    }

    // Kiểm tra độ dài content
    if (content.length < 10 || content.length > 500) {
      return res.status(400).json({
        message: "Content must be between 10 and 500 characters long",
      });
    }

    // Kiểm tra tính hợp lệ của content (chỉ cho phép chữ, số, và các ký tự đặc biệt cơ bản)
    const contentRegex = /^[\w\s.,!?]+$/i;
    if (!contentRegex.test(content)) {
      return res.status(400).json({
        message: "Content contains invalid characters.",
      });
    }

    if (blog) {
      // Kiểm tra xem blog có tồn tại không
      if (!mongoose.Types.ObjectId.isValid(blog)) {
        return res.status(400).json({ message: "Invalid blog ID" });
      }
      const blogExists = await Blog.findById(blog);
      if (!blogExists) {
        return res.status(404).json({ message: "Blog not found" });
      }
    }

    if (parentComment) {
      if (!mongoose.Types.ObjectId.isValid(parentComment)) {
        return res.status(400).json({ message: "Invalid parent comment ID" });
      }
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      if (parent.isDeleted) {
        return res
          .status(400)
          .json({ message: "Parent comment has been deleted" });
      }
      parent.replies.push(newComment._id); // Thêm bình luận mới vào mảng replies của bình luận cha
      try {
        await parent.save(); // Lưu bình luận cha
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to update parent comment",
          error: error.message,
        });
      }
    }

    // Tạo mới bình luận
    const newComment = new Comment({
      user: userId,
      phone: phoneId,
      content,
      blog: blog || undefined, // Nếu không có blog thì để undefined
      parentComment: parentComment || null, // Nếu không có bình luận cha thì để null
    });

    // Lưu bình luận vào cơ sở dữ liệu
    await newComment.save();

    // Trả về kết quả thành công
    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: newComment,
    });
  } catch (error) {
    // Xử lý lỗi
    res.status(500).json({
      success: false,
      message: "Failed to create comment",
      error: error.message,
    });
  }
};

const getCommentByPhone = async (req, res) => {
  try {
    const phoneId = req.params.phoneId;
    if (!mongoose.Types.ObjectId.isValid(phoneId)) {
      return res.status(400).json({ message: "Invalid phoneId" });
    }
    const comments = await Comment.findByPhone(phoneId);
    const totalComments = await Comment.countDocuments({
      phone: phoneId,
      isDeleted: false,
    });
    return res.status(200).json({
      success: true,
      message: "Comments retrieved successfully",
      data: comments,
      totalComments: totalComments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get comment",
      error: error.message,
    });
  }
};

const getCommentsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }
    const comments = await Comment.findByUserId(userId)
      .populate("phone", "name") // Lấy thông tin điện thoại (nếu có)
      .populate("blog", "title") // Lấy thông tin blog (nếu có)
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Comments retrieved successfully",
      data: comments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get comment" });
  }
};

const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid commentId" });
    }
    // const comment = await Comment.findByIdAndDelete(commentId);
    // if (!comment) {
    //   return res.status(404).json({ message: "Comment not found" });
    // }
    // Tìm bình luận
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }
    // Xóa mềm bình luận
    await comment.deleteComment();
    return res
      .status(200)
      .json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};

const updateComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const { content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid commentId" });
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // Cập nhật nội dung
    comment.content = content;
    comment.updatedAt = Date.now();
    await comment.save();
    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: comment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update comment" });
  }
};

const getBlogComments = async (req, res) => {
  try {
    // const { id } = req.params;
    const id = req.params.id;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit values.",
      });
    }

    // Kiểm tra xem ID có hợp lệ không
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID format.",
      });
    }

    const blog = await Blog.findById(id)
      .populate({
        path: "comments",
        match: { isDeleted: false },
        options: {
          sort: { createdAt: -1 },
          skip: (page - 1) * limit,
          limit: limit,
        },
        populate: {
          path: "user",
          select: "username email",
        },
      })
      .populate({
        path: "likes",
        select: "username email",
      })
      .exec();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found.",
      });
    }

    // Then get comments for this blog
    const comments = await Comment.find({
      blog: id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email")
      .exec();

    // const totalComments = blog.comments.length;
    const totalComments = await Comment.countDocuments({
      blog: id,
      isDeleted: false,
    });
    // const comments = blog.comments.slice((page - 1) * limit, page * limit);

    // Tính tổng số bài viết (cả blog đã publish và chưa publish)
    const totalBlogs = await Blog.countDocuments();

    res.status(200).json({
      success: true,
      message: "Blog and comments fetched successfully.",
      blog: blog,
      // comments: comments,
      comments: blog.comments,
      totalComments,
      totalBlogs, // Trả về tổng số bài blog
      page,
      totalPages: Math.ceil(totalComments / limit),
    });
  } catch (error) {
    // Handle invalid ID error here
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error occurred while fetching data.",
      error: error.message,
    });
  }
};

const getAllComments = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query; // Lấy thông tin phân trang từ query

    page = parseInt(page);
    limit = parseInt(limit);

    // Kiểm tra nếu page hoặc limit không hợp lệ
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Số trang và giới hạn không hợp lệ.",
      });
    }

    // Truy vấn tất cả các bình luận chưa bị xóa
    const comments = await Comment.find({ isDeleted: false })
      .populate("user", "username email") // Populate thông tin người dùng của bình luận
      .populate("phone", "name brand") // Populate thông tin điện thoại nếu có
      .populate("blog", "title") // Populate thông tin bài viết blog nếu có
      .skip((page - 1) * limit) // Bỏ qua số lượng bình luận ở các trang trước
      .limit(limit); // Giới hạn số bình luận trên mỗi trang

    // Tính tổng số bình luận để phân trang
    const totalComments = await Comment.countDocuments({ isDeleted: false });

    res.status(200).json({
      success: true,
      message: "Lấy tất cả bình luận thành công.",
      comments: comments,
      totalComments: totalComments,
      page: page,
      totalPages: Math.ceil(totalComments / limit), // Tổng số trang
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy dữ liệu.",
      error: error.message,
    });
  }
};

const toggleLikeComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid commentId" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userId = req.user._id; // Lấy userId từ token đã xác thực
    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Nếu đã thích, bỏ thích
      comment.likes.splice(likeIndex, 1);
    } else {
      // Nếu chưa thích, thêm thích
      comment.likes.push(userId);
    }

    // Loại bỏ các giá trị null hoặc không hợp lệ trước khi save
    comment.likes = comment.likes.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    await comment.save();
    res.status(200).json({
      success: true,
      message: "Toggled like on comment successfully",
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle like on comment",
      error: error.message,
    });
  }
};
module.exports = {
  createComment,
  getCommentByPhone,
  getCommentsByUser,
  deleteComment,
  updateComment,
  getBlogComments,
  getAllComments,
  toggleLikeComment,
};
