const Content = require("../model/contentModel");
const mongoose = require("mongoose");

const createContent = async (req, res) => {
  try {
    const contentData = req.body;
    // Check for existing slug
    const existingContent = await Content.findOne({ slug: contentData.slug });
    if (existingContent) {
      return res.status(400).json({
        success: false,
        message: "Slug already exists. Please choose a different slug.",
      });
    }
    const content = new Content(contentData);
    const savedContent = await content.save();
    res
      .status(201)
      .json({ message: "Content created successfully", data: savedContent });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating content", error: error.message });
  }
};
const getContents = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { body: new RegExp(search, "i") },
        { tags: new RegExp(search, "i") },
        // { "tags.name": new RegExp(search, "i") },
      ];
    }

    const contents = await Content.find(query)
      .populate("authorId", "username email")
      .populate("categories", "name")
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Content.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Contents fetched successfully",
      data: contents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching contents",
      error: error.message,
    });
  }
};

const getContentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid content id" });
    }

    const content = await Content.findById(id)
      .populate("authorId", "username email")
      .populate("categories", "name")
      .populate("tags", "name");

    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    res.status(200).json({
      success: true,
      message: "Content fetched successfully",
      data: content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching content",
      error: error.message,
    });
  }
};

const updateContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid content id" });
    }

    const updatedContent = await Content.findByIdAndUpdate(id, updates, {
      new: true,
    })
      .populate("authorId", "username email")
      .populate("categories", "name")
      .populate("tags", "name");

    if (!updatedContent) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    res.status(200).json({
      success: true,
      message: "Content updated successfully",
      data: updatedContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating content",
      error: error.message,
    });
  }
};

const deleteContentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid content id" });
    }

    const deletedContent = await Content.findByIdAndDelete(id);
    if (!deletedContent) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }
    res.status(200).json({
      success: true,
      message: "Content deleted successfully",
      data: deletedContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting content",
      error: error.message,
    });
  }
};

const incrementViews = async (req, res) => {
  try {
    const { id } = req.params;
    // const { id } = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid content id" });
    }

    const updatedContent = await Content.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      {
        new: true,
      }
    ).populate("authorId", "username email");

    if (!updatedContent) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }
    res.status(200).json({
      success: true,
      message: "Content views incremented successfully",
      data: updatedContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error incrementing content views",
      error: error.message,
    });
  }
};

const publishScheduledContent = async () => {
  try {
    const now = new Date();
    const contents = await Content.updateMany(
      { scheduledAt: { $lte: now }, status: "scheduled" },
      { status: "published", publishedAt: now }
    );
    console.log(`${contents.modifiedCount} contents published.`);
  } catch (error) {
    console.error("Error publishing scheduled contents:", error.message);
  }
};

const addComment = async (req, res) => {
  try {
    const { userId, comment, parentId } = req.body;
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: "Content not found" });

    content.comments.push({ userId, comment, parentId });
    await content.save();
    res
      .status(201)
      .json({ message: "Comment added successfully", data: content });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error adding comment", error: error.message });
  }
};

const addRevision = async (req, res) => {
  try {
    const { changes, updatedBy } = req.body;
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: "Content not found" });

    content.revisions.push({ changes, updatedBy });
    await content.save();
    res
      .status(201)
      .json({ message: "Revision added successfully", data: content });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error adding revision", error: error.message });
  }
};

const searchContents = async (req, res) => {
  const { query, tags, categories } = req.query;
  const filter = {};

  if (query) filter.$text = { $search: query };
  if (tags) filter.tags = { $in: tags.split(",") };
  if (categories) filter.categories = { $in: categories.split(",") };

  try {
    const results = await Content.find(filter);
    res.status(200).json({ data: results });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error searching contents", error: error.message });
  }
};

const advancedSearch = async (req, res) => {
  try {
    const { tags, categories, search } = req.query;

    const filter = {};

    if (tags) {
      filter.tags = { $in: tags.split(",") };
    }
    if (categories) {
      filter.categories = { $in: categories.split(",") };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const results = await Content.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error performing advanced search",
      error: error.message,
    });
  }
};

const likeContent = async (req, res) => {
  try {
    const { id } = req.params; // ID của nội dung
    const userId = req.user.id; // Lấy user ID từ auth middleware

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    // Kiểm tra xem người dùng đã like hay chưa
    if (content.likedBy.includes(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "You already liked this content" });
    }

    // Thêm userId vào likedBy và tăng số lượng likes
    content.likedBy.push(userId);
    content.likes += 1;

    await content.save();

    res.status(200).json({
      success: true,
      message: "Content liked successfully",
      data: { likes: content.likes, likedBy: content.likedBy },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error liking content",
        error: error.message,
      });
  }
};

const unlikedContent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    // Kiểm tra xem người dùng đã like hay chưa
    if (!content.likedBy.includes(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "You haven't liked this content" });
    }

    // Xóa userId và giảm số lượng likes
    // content.likedBy = content.likedBy.filter(likedUserId => likedUserId!== userId);
    content.likedBy = content.likedBy.filter((id) => id.toString() !== userId);
    content.likes -= 1;

    await content.save();

    res.status(200).json({
      success: true,
      message: "Content unliked successfully",
      data: { likes: content.likes, likedBy: content.likedBy },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error unliking content",
        error: error.message,
      });
  }
};

module.exports = {
  createContent,
  getContents,
  getContentById,
  updateContentById,
  deleteContentById,
  incrementViews,
  publishScheduledContent,
  addComment,
  addRevision,
  searchContents,
  advancedSearch,
};
