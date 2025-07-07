const mongoose = require("mongoose");
const Blog = require("../model/blogModel");
const Comment = require("../model/commentModel");
const Role = require("../model/roleModel");
const User = require("../model/userModel");
const asyncHandler = require("express-async-handler");

// Tạo bài viết mới
const createBlog = asyncHandler(async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      tags,
      category,
      thumbnail,
      user,
      views,
      likes,
      comments,
    } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!title || !slug || !content || !category || !user) {
      return res.status(400).json({
        success: false,
        message: "Các trường title, slug, content, category, user là bắt buộc.",
      });
    }

    // Kiểm tra slug đã tồn tại
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        success: false,
        message: "Slug đã tồn tại. Vui lòng chọn slug khác.",
      });
    }

    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }

    const newBlog = new Blog({
      title,
      slug,
      content,
      tags,
      category,
      thumbnail,
      user,
      views: views || 0,
      likes: likes || [],
      comments: comments || [],
    });

    await newBlog.save();

    res.status(201).json({
      success: true,
      message: "Tạo bài viết thành công.",
      data: newBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo bài viết.",
      error: error.message,
    });
  }
});

// Lấy tất cả bài viết
const getAllBlogs = async (req, res) => {
  try {
    const {
      search,
      category,
      isPublished,
      page = 1,
      limit = 10,
      sort = "createdAt",
    } = req.query;
    // const filter = {};
    const filter = { isDeleted: false }; // Chỉ lấy bài viết chưa xóa
    let parsedPage = parseInt(page);
    let parsedLimit = parseInt(limit);

    if (
      isNaN(parsedPage) ||
      isNaN(parsedLimit) ||
      parsedPage < 1 ||
      parsedLimit < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Trang hoặc giới hạn không hợp lệ.",
      });
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" }; // Tìm kiếm theo tiêu đề
    }
    if (category) {
      filter.category = category; // Lọc theo danh mục
    }
    if (isPublished) {
      filter.isPublished = isPublished === "true"; // Lọc theo trạng thái
    }

    const blogs = await Blog.find(filter)
      .populate("user", "username email") // Lấy thông tin tác giả
      .sort({ [sort]: -1 }) // Sắp xếp theo trường được chỉ định
      .skip((parsedPage - 1) * parsedLimit) // Bỏ qua các bài viết trước đó
      .limit(parsedLimit); // Giới hạn số lượng bài viết trả về;

    const total = await Blog.countDocuments(filter);

    res.status(200).json({
      success: true,
      blogs,
      total,
      page: parsedPage,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy danh sách bài viết.",
      error: error.message,
    });
  }
};

// Lấy bài viết theo ID
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    // const { incrementViews = "false" } = req.query; // Default to "false" if not provided
    const incrementViews = req.query.incrementViews === "true"; // Chuyển thành boolean

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID bài viết không hợp lệ.",
      });
    }

    // // Kiểm tra tham số incrementViews
    // if (incrementViews && incrementViews !== "true") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Tham số incrementViews không hợp lệ.",
    //   });
    // }

    // Truy vấn bài viết chỉ một lần
    // let blog = await Blog.findById(id)
    //   // const blog = await Blog.findById(id)
    //   .populate("user", "username email role createdAt")
    //   .populate({
    //     path: "comments",
    //     populate: { path: "user", select: "username email role createdAt" },
    //   })
    //   .populate({
    //     path: "likes",
    //     select: "username email role createdAt", // Lấy các trường mong muốn từ User
    //   });

    const blog = await Blog.findOne({ _id: id, isDeleted: false })
      .populate("user", "username email role createdAt")
      .populate({
        path: "comments",
        match: { isDeleted: false },
        populate: { path: "user", select: "username email role createdAt" },
      })
      .populate({
        path: "likes",
        select: "username email role createdAt",
      });

    // Kiểm tra bài viết tồn tại không
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại hoặc đã bị xóa.",
      });
    }

    // Tăng lượt xem nếu incrementViews === "true"
    // if (incrementViews === "true") {
    //   await blog.incrementViews();
    // }
    if (incrementViews) {
      await blog.incrementViews();
    }

    // // Tăng lượt xem tự động
    // blog.views += 1;
    // await blog.save();

    res.status(200).json({
      success: true,
      message: "Lấy bài viết thành công.",
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy bài viết.",
      error: error.message,
    });
  }
};

// Cập nhật bài viết
// const updateBlog = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "ID bài viết không hợp lệ.",
//       });
//     }

//     if (updates.slug) {
//       return res.status(400).json({
//         success: false,
//         message: "Không thể thay đổi slug của bài viết.",
//       });
//     }

//     // Nếu `isPublished` được bật, cập nhật `publicationDate`
//     // if (updates.isPublished && updates.isPublished === true) {
//     //   updates.publicationDate = new Date();
//     // }
//     if (!updates.content && !("isPublished" in updates)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No valid fields to update" });
//     }

//     const blog = await Blog.findByIdAndUpdate(id, updates, {
//       new: true,
//       runValidators: true,
//     }).populate("user", "name email");

//     if (!blog) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy bài viết.",
//       });
//     }

//     // Kiểm tra quyền (so sánh role của user với role admin)
//     const userRole = await Role.findById(req.user.role);
//     const adminRole = await Role.findOne({ roleName: "admin" });
//     if (
//       blog.user._id.toString() !== req.user.id &&
//       userRole._id.toString() !== adminRole._id.toString()
//     ) {
//       return res.status(403).json({ success: false, message: "Unauthorized" });
//     }

//     if (updates.isPublished && updates.isPublished === true) {
//       updates.publicationDate = new Date();
//     }

//     const updatedBlog = await Blog.findByIdAndUpdate(id, updates, {
//       new: true,
//       runValidators: true,
//     }).populate("user", "username email");

//     res.status(200).json({
//       success: true,
//       message: "Cập nhật bài viết thành công.",
//       // data: blog,
//       data: updatedBlog,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Có lỗi xảy ra khi cập nhật bài viết.",
//       error: error.message,
//     });
//   }
// };
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Kiểm tra tính hợp lệ của ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID bài viết không hợp lệ.",
      });
    }

    // Cấm thay đổi slug
    if (updates.slug) {
      return res.status(400).json({
        success: false,
        message: "Không thể thay đổi slug của bài viết.",
      });
    }

    // Kiểm tra các trường hợp hợp lệ
    if (
      !updates.content &&
      !("isPublished" in updates) &&
      !("comments" in updates) &&
      !("title" in updates) &&
      !("tags" in updates) &&
      !("category" in updates)
    ) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Lấy blog hiện tại để kiểm tra
    const blog = await Blog.findById(id).populate("user", "username email");
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết.",
      });
    }

    // Kiểm tra quyền trước khi cập nhật
    const userRole = await Role.findById(req.user.role);
    const adminRole = await Role.findOne({ roleName: "admin" });
    if (
      blog.user._id.toString() !== req.user.id &&
      userRole._id.toString() !== adminRole._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Cập nhật publicationDate nếu isPublished là true
    if (updates.isPublished && updates.isPublished === true) {
      updates.publicationDate = new Date();
    }

    // Xử lý cập nhật comments (thêm _id vào mảng)
    if (updates.comments && mongoose.Types.ObjectId.isValid(updates.comments)) {
      updates.$push = { comments: updates.comments }; // Sử dụng $push để thêm vào mảng
      delete updates.comments; // Loại bỏ trường comments khỏi updates
    }

    // Thực hiện cập nhật
    const updatedBlog = await Blog.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("user", "username email");

    res.status(200).json({
      success: true,
      message: "Cập nhật bài viết thành công.",
      data: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật bài viết.",
      error: error.message,
    });
  }
};

// Xóa bài viết
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // const blog = await Blog.findByIdAndDelete(id);
    // if (!blog) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Không tìm thấy bài viết.",
    //   });
    // }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid blog ID" });
    }

    const blog = await Blog.findOne({ _id: id, isDeleted: false });
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    // Kiểm tra quyền
    const userRole = await Role.findById(req.user.role);
    const adminRole = await Role.findOne({ roleName: "admin" });
    if (
      blog.user._id.toString() !== req.user.id &&
      userRole._id.toString() !== adminRole._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    blog.isDeleted = true;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Xóa bài viết thành công.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa bài viết.",
      error: error.message,
    });
  }
};

// Thêm hoặc hủy lượt thích bài viết
// const toggleLikeBlog = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id; // Lấy từ token
//     const blog = await Blog.findById(id);
//     if (!blog) {
//       return res.status(404).json({
//         success: false,
//         message: "Bài viết không tồn tại.",
//       });
//     }
//     const index = blog.likes.indexOf(userId);
//     if (index === -1) {
//       blog.likes.push(userId);
//       await blog.save();
//       return res.status(200).json({
//         success: true,
//         message: "Thích bài viết thành công.",
//       });
//     } else {
//       blog.likes.splice(index, 1);
//       await blog.save();
//       return res.status(200).json({
//         success: true,
//         message: "Hủy thích bài viết thành công.",
//       });
//     }
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Có lỗi xảy ra khi cập nhật lượt thích.",
//       error: error.message,
//     });
//   }
// };
const toggleLikeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid blog ID" });
    }

    const blog = await Blog.findOne({ _id: id, isDeleted: false });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại hoặc đã bị xóa.",
      });
    }

    const index = blog.likes.indexOf(userId);
    if (index === -1) {
      blog.likes.push(userId);
    } else {
      blog.likes.splice(index, 1);
    }

    const updatedBlog = await blog.save();

    res.status(200).json({
      success: true,
      message:
        index === -1
          ? "Thích bài viết thành công."
          : "Hủy thích bài viết thành công.",
      data: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật lượt thích.",
      error: error.message,
    });
  }
};

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  toggleLikeBlog,
};
