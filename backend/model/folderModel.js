const mongoose = require("mongoose");
const slugify = require("slugify");

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Folder name is required"],
      trim: true,
    },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      validate: {
        validator: async function (folderId) {
          if (!folderId) return true; // Allow null for root-level folders
          const folder = await mongoose.model("Folder").findById(folderId);
          return !!folder; // Ensure the parent folder exists
        },
        message: "Parent folder does not exist",
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => Array.isArray(tags) && tags.length <= 10,
        message: "You can add up to 10 tags only",
      },
    },
    auditLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        action: { type: String, enum: ["created", "updated", "deleted"] },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    slug: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Unique folder names within a parent folder
folderSchema.index({ name: 1, parentFolder: 1, user: 1 }, { unique: true });

// Middleware to create slug from name
folderSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Prevent circular references in parentFolder
folderSchema.pre("save", async function (next) {
  if (this.parentFolder) {
    const parentFolder = await mongoose
      .model("Folder")
      .findById(this.parentFolder);
    if (parentFolder && parentFolder.id === this.id) {
      return next(new Error("A folder cannot be its own parent"));
    }
  }
  next();
});

folderSchema.pre("save", async function (next) {
  if (this.isModified("name")) {
    let slug = slugify(this.name, { lower: true, strict: true });
    const Folder = mongoose.model("Folder");

    // Kiểm tra trùng lặp slug
    let slugExists = await Folder.exists({ slug });
    let counter = 1;

    // Tạo slug duy nhất nếu bị trùng
    while (slugExists) {
      slug = `${slug}-${counter}`;
      slugExists = await Folder.exists({ slug });
      counter++;
    }

    this.slug = slug;
  }
  next();
});

folderSchema.pre("save", function (next) {
  if (this.isNew) {
    this.auditLog.push({
      userId: this.user,
      action: "created",
      timestamp: new Date(),
    });
  } else if (this.isModified()) {
    this.auditLog.push({
      userId: this.user,
      action: "updated",
    });
  }
  next();
});

folderSchema.pre("remove", function (next) {
  this.auditLog.push({
    userId: this.user,
    action: "deleted",
  });
  next();
});

module.exports = mongoose.model("Folder", folderSchema);
