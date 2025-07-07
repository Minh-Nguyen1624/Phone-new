const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters long"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    body: {
      type: String,
      required: [true, "Body content is required"],
      minlength: [20, "Body content must be at least 20 characters long"],
    },
    type: {
      type: String,
      enum: ["page", "article", "faq", "news", "blog"],
      required: [true, "Content type is required"],
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "in review", "scheduled"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    scheduledAt: {
      type: Date,
    },
    visibility: {
      type: String,
      enum: ["public", "private", "restricted"],
      default: "public",
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author ID is required"],
    },
    // tags: [
    //   {
    //     type: String,
    //     trim: true,
    //     index: true,
    //   },
    // ],
    // tags: [
    //   {
    //     name: { type: String, required: true },
    //     description: { type: String },
    //   },
    // ],
    tags: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
      index: true,
    },
    // categories: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Category",
    //   },
    // ],
    categories: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
      trim: true,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    meta: {
      ogTitle: { type: String, maxlength: 150 },
      ogImage: { type: String },
      ogDescription: { type: String, maxlength: 160 },
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    translations: [
      {
        language: { type: String, required: true },
        title: { type: String, required: true },
        body: { type: String, required: true },
        localeCode: { type: String, required: true }, // e.g., en-US, vi-VN
        isDefault: { type: Boolean, default: false },
      },
    ],
    revisions: [
      {
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changes: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

contentSchema.pre("save", function (next) {
  if (this.tags && Array.isArray(this.tags)) {
    this.tags = this.tags.join(", ");
  }
  next();
});

// Middleware: Validate `scheduledAt` to prevent past dates
contentSchema.pre("save", function (next) {
  if (this.scheduledAt && this.scheduledAt < new Date()) {
    next(new Error("Scheduled date cannot be in the past."));
  } else {
    next();
  }
});

// Middleware: Add revision log on save if modified
contentSchema.pre("save", function (next) {
  if (this.isModified()) {
    const revision = {
      updatedAt: new Date(),
      updatedBy: this.authorId,
      changes: "Content updated",
    };
    this.revisions.push(revision);
  }
  next();
});

// Index for text search optimization
contentSchema.index(
  {
    title: "text",
    body: "text",
    // metaDescription: "text",
    metaDescription: "text", // Weight: default 1
    "translations.title": "text", // Weight: default 1
    "translations.body": "text",
    // tags: "text",
    "tags.name": "text", // Tìm kiếm text theo thuộc tính name trong tags
  },
  {
    weights: {
      title: 10,
      "translations.title": 8,
      body: 5,
      "translations.body": 4,
      metaDescription: 2,
      // tags: 1,
      "tags.name": 1,
    },
  }
);

// Additional indexes for efficient querying
// contentSchema.index({ tags: 1 });
contentSchema.index({ "tags.name": "text" });
contentSchema.index({ keywords: 1 });

module.exports = mongoose.model("Content", contentSchema);
