const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Ensure every file belongs to a user
    },
    fileName: {
      // type: String,
      // required: [true, "File name is required"],
      // trim: true,
      type: String,
      required: [true, "File name is required"],
      trim: true,
      validate: {
        validator: (value) => value.includes("."), // File phải có extension
        message: "File name must include an extension",
      },
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
      validate: {
        validator: (value) => /.+\/.+/.test(value), // MIME type check
        message: "Invalid file type format",
      },
    },
    fileCategory: {
      type: String,
      enum: ["Word", "PDF", "Image", "Spreadsheet", "Video", "Other"],
      default: "Other",
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [1, "File size must be greater than 0"],
      max: [1024 * 1024 * 100, "File size exceeds 100MB"],
    },
    url: {
      type: String,
      required: [true, "URL is required"],
      trim: true,
      validate: {
        // validator: (value) => /^https?:\/\/.+/.test(value),
        validator: (value) => {
          return /^\/files\/.+|^https?:\/\/.+/.test(value);
        },
        message: "Invalid URL format",
      },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    storageProvider: {
      type: String,
      enum: ["local", "aws", "gcs", "azure"],
      default: "local",
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
    version: {
      type: String,
      default: "1.0",
    },
    permissions: {
      read: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: [],
        validate: {
          validator: (value) =>
            value.length === new Set(value.map(String)).size,
          message: "Duplicate user IDs are not allowed in permissions",
        },
      },
      write: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: [],
        validate: {
          validator: (value) =>
            value.length === new Set(value.map(String)).size,
          message: "Duplicate user IDs are not allowed in permissions",
        },
      },
    },
    expirationDate: {
      type: Date,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    thumbnailUrl: {
      type: String,
      validate: {
        validator: (value) => /^https?:\/\/.+/.test(value),
        message: "Invalid URL format for thumbnail",
      },
    },
    auditLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        action: {
          type: String,
          enum: ["uploaded", "downloaded", "updated", "deleted", "shared"],
        },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    encryption: {
      isEncrypted: { type: Boolean, default: false },
      encryptionMethod: {
        type: String,
        validate: {
          validator: function () {
            return (
              !this.isEncrypted || (this.isEncrypted && this.encryptionMethod)
            );
          },
          message: "Encryption method is required when the file is encrypted",
        },
      },
    },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      validate: {
        validator: async function (folderId) {
          if (!folderId) return true; // Allow null for top-level files
          const folder = await mongoose.model("Folder").findById(folderId);
          return !!folder; // Ensure the folder exists
        },
        message: "Parent folder does not exist",
      },
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

// fileSchema.pre("save", function (next) {
//   const extension = this.fileName.split(".").pop().toLowerCase();
//   const allowedExtensions = ["pdf", "doc", "docx", "jpg", "png", "mp4"];
//   if (!allowedExtensions.includes(extension)) {
//     return next(new Error("Unsupported file extension"));
//   }
//   next();
// });

// Middleware để ánh xạ file type dựa vào extension
// fileSchema.pre("save", function (next) {
//   const fileExtension = this.fileName.split(".").pop().toLowerCase();
//   const categoryMapping = {
//     doc: "Word",
//     docx: "Word",
//     pdf: "PDF",
//     jpg: "Image",
//     png: "Image",
//     gif: "Image",
//     xls: "Spreadsheet",
//     xlsx: "Spreadsheet",
//     mp4: "Video",
//     avi: "Video",
//   };

//   this.fileCategory = categoryMapping[fileExtension] || "Other";
//   next();
// });

// Middleware kiểm tra file extension
fileSchema.pre("save", function (next) {
  if (!this.fileName || !this.fileName.includes(".")) {
    return next(new Error("Invalid file name. File must have an extension"));
  }

  const extension = this.fileName.split(".").pop().toLowerCase();
  const allowedExtensions = ["pdf", "doc", "docx", "jpg", "png", "mp4", "js"];

  if (!allowedExtensions.includes(extension)) {
    return next(new Error("Unsupported file extension"));
  }

  // Ánh xạ fileCategory
  const categoryMapping = {
    doc: "Word",
    docx: "Word",
    pdf: "PDF",
    jpg: "Image",
    png: "Image",
    gif: "Image",
    xls: "Spreadsheet",
    xlsx: "Spreadsheet",
    mp4: "Video",
    avi: "Video",
  };

  this.fileCategory = categoryMapping[extension] || "Other";
  next();
});

fileSchema.index({ fileName: 1, user: 1 }); // Compound index for efficient queries
fileSchema.index({ status: 1, fileType: 1 }); // Tìm kiếm file theo trạng thái và loại file

module.exports = mongoose.model("File", fileSchema);
