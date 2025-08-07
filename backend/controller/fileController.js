const multer = require("multer");
const axios = require("axios");
const path = require("path");
// Import both fs and fs.promises
const fs = require("fs");
const fsPromises = require("fs").promises;
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const { fileTypeFromBuffer } = require("file-type");
const File = require("../model/fileModel");
const Folder = require("../model/folderModel");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let baseDir = path.join(__dirname, "../files");
    let finalDir = baseDir;
    let folderPathSegments = [];

    const parentFolder = req.body.parentFolder;
    if (parentFolder && mongoose.isValidObjectId(parentFolder)) {
      try {
        let currentFolder = await mongoose
          .model("Folder")
          .findById(parentFolder);
        if (!currentFolder) {
          return cb(new Error("Parent folder does not exist"), null);
        }

        while (currentFolder) {
          folderPathSegments.unshift(currentFolder.slug || currentFolder.name);
          currentFolder = await mongoose
            .model("Folder")
            .findById(currentFolder.parentFolder);
        }

        if (folderPathSegments.length > 0) {
          finalDir = path.join(baseDir, ...folderPathSegments);
        }
      } catch (error) {
        console.error("Error building folder path:", error);
        return cb(error, null);
      }
    }

    try {
      // const dirExists = await fsPromises.access(finalDir).then(() => true).catch(() => false);
      // if (!dirExists) {
      //   await fsPromises.mkdir(finalDir, { recursive: true });
      // }
      await fsPromises.mkdir(finalDir, { recursive: true });
      req.folderPathSegments = folderPathSegments;
      cb(null, finalDir);
    } catch (error) {
      console.error("Error creating directory:", error);
      return cb(
        new Error(`Failed to create directory: ${error.message}`),
        null
      );
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const newFileName = `${name}-${uniqueSuffix}${ext}`;
    cb(null, newFileName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 50 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      "pdf",
      "doc",
      "docx",
      "jpg",
      "png",
      "mp4",
      "js",
      "zip",
      "txt",
    ];
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file extension"), false);
    }
  },
}).array("files", 50);

// Hàm kiểm tra định dạng PDF
async function isValidPdf(filePath) {
  try {
    const buffer = await fsPromises.readFile(filePath, { length: 262 });

    const type = await fileTypeFromBuffer(buffer);
    return type && type.mime === "application/pdf";
  } catch (error) {
    console.error("Error checking file type:", error);
    return false;
  }
}

// Hàm download file
const uploadFile = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(500).json({
        success: false,
        message: "Error uploading file",
        error: err.message,
      });
    }

    const effectiveStorageProvider = req.body.storageProvider || "local";
    let savedFiles = [];
    const BASE_DIR = path.resolve(__dirname, "../files");
    let finalDir = BASE_DIR;
    let folderPathSegments = req.folderPathSegments || [];

    if (folderPathSegments.length > 0) {
      finalDir = path.join(finalDir, ...folderPathSegments);
    }

    // Kiểm tra xác thực và parentFolder
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No authenticated user found",
      });
    }
    if (!mongoose.isValidObjectId(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    if (
      req.body.parentFolder &&
      !mongoose.isValidObjectId(req.body.parentFolder)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid parentFolder ID: must be a valid ObjectId",
      });
    }
    if (req.body.parentFolder) {
      const folderExists = await Folder.findById(req.body.parentFolder);
      if (!folderExists) {
        return res.status(400).json({
          success: false,
          message: "Parent folder does not exist",
        });
      }
      const existingFiles = await File.countDocuments({
        parentFolder: req.body.parentFolder,
        status: "active",
      });
      if (existingFiles + (req.files?.length || 1) > 3) {
        return res.status(400).json({
          success: false,
          message: "Maximum number of files (3) exceeded for this folder",
        });
      }
    }

    if (effectiveStorageProvider === "local") {
      if (!req.files && !req.body.url) {
        return res.status(400).json({
          success: false,
          message: "A file upload or URL is required for local storage",
        });
      }

      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const filePath = path.join(finalDir, file.filename);
          if (path.extname(file.originalname).toLowerCase() === ".pdf") {
            const buffer = await fs.readFile(filePath, { length: 262 });
            if (!(await isValidPdf(filePath))) {
              await fs.unlink(filePath).catch(console.error);
              return res.status(400).json({
                success: false,
                message: `File ${file.originalname} is not a valid PDF`,
              });
            }
          }

          const relativePath =
            folderPathSegments.length > 0
              ? `/files/${folderPathSegments.join("/")}/${file.filename}`
              : `/files/${file.filename}`;
          const fileDoc = new File({
            user: req.user._id,
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            url: relativePath,
            isPublic: req.body.isPublic === "true" || false,
            storageProvider: effectiveStorageProvider,
            description: req.body.description || "No description",
            tags: Array.isArray(req.body.tags)
              ? req.body.tags
              : typeof req.body.tags === "string"
              ? JSON.parse(
                  req.body.tags.replace(/^"|"$/g, "").replace(/\\"/g, '"')
                )
              : [],
            version: req.body.version || "1.0",
            permissions:
              typeof req.body.permissions === "object" &&
              req.body.permissions !== null
                ? req.body.permissions
                : typeof req.body.permissions === "string"
                ? JSON.parse(req.body.permissions)
                : { read: [], write: [] },
            parentFolder: req.body.parentFolder || null,
            auditLog: [
              {
                userId: req.user._id,
                action: "uploaded",
                timestamp: new Date(),
              },
            ],
          });
          savedFiles.push(await fileDoc.save());
        }
      } else if (req.body.url) {
        const { fileName, fileType, fileSize } = req.body;
        if (!fileName || !fileType || !fileSize) {
          return res.status(400).json({
            success: false,
            message:
              "fileName, fileType, and fileSize are required when providing a URL for local storage",
          });
        }
        const size = parseInt(fileSize, 10);
        if (size <= 0) {
          return res.status(400).json({
            success: false,
            message: "File size must be greater than 0",
          });
        }

        try {
          const response = await axios({
            url: req.body.url,
            method: "GET",
            responseType: "stream",
          });

          const contentLength = response.headers["content-length"];
          if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
            return res.status(400).json({
              success: false,
              message: "File size exceeds the 100MB limit",
            });
          }

          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = path.extname(fileName);
          const name = path.basename(fileName, ext);
          const newFileName = `${name}-${uniqueSuffix}${ext}`;
          const filePath = path.join(finalDir, newFileName);

          await fs.mkdir(finalDir, { recursive: true });
          const writer = require("fs").createWriteStream(filePath);
          let totalBytes = 0;
          response.data.on("data", (chunk) => {
            totalBytes += chunk.length;
          });

          await new Promise((resolve, reject) => {
            writer.on("finish", () => {
              if (contentLength && parseInt(contentLength) !== totalBytes) {
                reject(
                  new Error(
                    "Downloaded file size does not match content-length"
                  )
                );
              }
              resolve();
            });
            writer.on("error", reject);
          });

          const relativePath =
            folderPathSegments.length > 0
              ? `/files/${folderPathSegments.join("/")}/${newFileName}`
              : `/files/${newFileName}`;
          const fileDoc = new File({
            user: req.user._id,
            fileName: fileName,
            fileType: fileType,
            fileSize: size,
            url: relativePath,
            isPublic: req.body.isPublic === "true" || false,
            storageProvider: effectiveStorageProvider,
            description: req.body.description || "No description",
            tags: Array.isArray(req.body.tags)
              ? req.body.tags
              : typeof req.body.tags === "string"
              ? JSON.parse(
                  req.body.tags.replace(/^"|"$/g, "").replace(/\\"/g, '"')
                )
              : [],
            version: req.body.version || "1.0",
            permissions:
              typeof req.body.permissions === "object" &&
              req.body.permissions !== null
                ? req.body.permissions
                : typeof req.body.permissions === "string"
                ? JSON.parse(req.body.permissions)
                : { read: [], write: [] },
            parentFolder: req.body.parentFolder || null,
            auditLog: [
              {
                userId: req.user._id,
                action: "uploaded",
                timestamp: new Date(),
              },
            ],
          });
          savedFiles.push(await fileDoc.save());
        } catch (error) {
          console.error("Error downloading file from URL:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to download file from URL",
            error: error.message,
          });
        }
      }
    } else {
      if (!req.body.url) {
        return res.status(400).json({
          success: false,
          message: "A URL is required for non-local storage",
        });
      }
      const fileData = req.files
        ? req.files[0]
        : {
            originalname: req.body.fileName,
            mimetype: req.body.fileType,
            size: parseInt(req.body.fileSize, 10) || 0,
          };
      const fileDoc = new File({
        user: req.user._id,
        fileName: fileData.originalname,
        fileType: fileData.mimetype,
        fileSize: fileData.size,
        url: req.body.url,
        isPublic: req.body.isPublic === "true" || false,
        storageProvider: effectiveStorageProvider,
        description: req.body.description || "No description",
        tags: Array.isArray(req.body.tags)
          ? req.body.tags
          : typeof req.body.tags === "string"
          ? JSON.parse(req.body.tags.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
          : [],
        version: req.body.version || "1.0",
        permissions:
          typeof req.body.permissions === "object" &&
          req.body.permissions !== null
            ? req.body.permissions
            : typeof req.body.permissions === "string"
            ? JSON.parse(req.body.permissions)
            : { read: [], write: [] },
        parentFolder: req.body.parentFolder || null,
        auditLog: [
          { userId: req.user._id, action: "uploaded", timestamp: new Date() },
        ],
      });
      savedFiles.push(await fileDoc.save());
    }

    res.status(201).json({
      success: true,
      message:
        savedFiles.length > 1
          ? "Files uploaded successfully"
          : "File uploaded successfully",
      data: savedFiles,
    });
  });
});

// Function to upload a file and create a folder in one request
const downloadFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  if (!mongoose.isValidObjectId(fileId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid file ID",
    });
  }

  const file = await File.findById(fileId).populate("user");
  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  const isOwner =
    req.user && file.user._id.toString() === req.user._id.toString();
  const hasReadPermission =
    req.user &&
    file.permissions.read.some(
      (id) => id.toString() === req.user._id.toString()
    );
  const isAdmin = req.user && req.user.role?.roleName.toLowerCase() === "admin";
  if (!file.isPublic && !isOwner && !hasReadPermission && !isAdmin) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied: You do not have permission to download this file",
    });
  }

  if (file.expirationDate && new Date(file.expirationDate) < new Date()) {
    return res.status(403).json({
      success: false,
      message: "File has expired",
    });
  }

  await File.findByIdAndUpdate(fileId, {
    $inc: { downloadCount: 1 },
    $push: {
      auditLog: {
        userId: req.user._id,
        action: "downloaded",
        timestamp: new Date(),
      },
    },
  });

  const BASE_DIR = path.resolve(__dirname, "../files");

  if (file.storageProvider === "local") {
    const filePath = path.join(BASE_DIR, file.url.replace(/^\/files\//, ""));

    try {
      const stat = await fsPromises.stat(filePath); // Lấy thông tin file
      await fsPromises.access(filePath, fsPromises.constants.R_OK); // Kiểm tra quyền đọc

      // Đặt header để kích hoạt tải về
      res.setHeader(
        "Content-Type",
        file.fileType || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(file.fileName)}"`
      );
      res.setHeader("Content-Length", stat.size);

      // Gửi file bằng res.download
      res.download(filePath, path.basename(file.fileName), (err) => {
        if (err) {
          console.error("Download error:", err.stack);
          return res.status(500).json({
            success: false,
            message: "Error downloading file",
            error: err.message,
          });
        }
      });
    } catch (error) {
      console.error("File access error:", error.stack);
      return res.status(404).json({
        success: false,
        message: "File not found on server",
        error: `File at ${filePath} does not exist, details: ${error.message}`,
      });
    }
  } else {
    res.redirect(file.url);
  }
});

const deleteFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  if (!mongoose.isValidObjectId(fileId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid file ID",
    });
  }

  const file = await File.findById(fileId).populate("user");
  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  const isOwner =
    req.user && file.user._id.toString() === req.user._id.toString();
  const hasWritePermission =
    req.user &&
    file.permissions.write.some(
      (id) => id.toString() === req.user._id.toString()
    );
  const isAdmin = req.user && req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !hasWritePermission && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You do not have permission to delete this file",
    });
  }

  if (file.storageProvider === "local") {
    const filePath = path.join(__dirname, "../", file.url);
    try {
      await fsPromises.access(filePath, fsPromises.constants.F_OK);
      await fsPromises.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file from disk:", error);
      // Continue deletion even if file is not found on disk
    }
  }

  await File.findByIdAndUpdate(fileId, {
    status: "deleted",
    $push: {
      auditLog: {
        userId: req.user._id,
        action: "deleted",
        timestamp: new Date(),
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "File marked as deleted",
    data: { fileId },
  });
});

const getFiles = asyncHandler(async (req, res) => {
  const { folderId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "desc",
    fileType,
  } = req.query;

  // Validate folderId if provided
  if (folderId) {
    if (!mongoose.isValidObjectId(folderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid folder ID",
      });
    }
    const folderExists = await mongoose.model("Folder").findById(folderId);
    if (!folderExists) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }
  }

  // Build query with permission checks
  const query = {
    status: "active",
    parentFolder: folderId || null,
    $or: [
      { isPublic: true },
      { user: req.user._id },
      { "permissions.read": req.user._id },
      { "permissions.write": req.user._id },
    ],
  };
  if (req.user.role?.roleName.toLowerCase() === "admin") {
    delete query.$or; // Admins see all files
  }
  if (fileType) {
    query.fileType = fileType; // Lọc theo loại file
  }

  // Phân trang và sắp xếp
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === "desc" ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  const files = await File.find(query)
    .populate("user", "username email")
    .populate("parentFolder", "name")
    .populate("permissions.read", "username email role")
    .populate("permissions.write", "username email role")
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const total = await File.countDocuments(query);

  res.status(200).json({
    success: true,
    files,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

// Function to get file details
const getFilesDetails = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  if (!mongoose.isValidObjectId(fileId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid file ID",
    });
  }

  const file = await File.findById(fileId)
    .populate("user", "username email")
    .populate("parentFolder", "name")
    .populate("permissions.read", "username email role")
    .populate("permissions.write", "username email role");

  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  if (file.status !== "active") {
    return res.status(403).json({
      success: false,
      message: "File is not active",
    });
  }

  const isOwner =
    req.user && file.user._id.toString() === req.user._id.toString();
  const hasReadPermission =
    req.user &&
    file.permissions.read.some(
      (id) => id.toString() === req.user._id.toString()
    );
  const isAdmin = req.user && req.user.role?.roleName.toLowerCase() === "admin";
  if (!file.isPublic && !isOwner && !hasReadPermission && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You do not have permission to view this file",
    });
  }

  res.status(200).json({
    success: true,
    message: "File details retrieved successfully",
    data: {
      ...file.toObject(),
      downloadCount: file.downloadCount,
      auditLog: file.auditLog,
    },
  });
});

const uploadFileAndCreateFolder = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "File upload failed",
        error: err.message,
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No authenticated user found",
      });
    }

    const {
      fileType,
      isPublic,
      storageProvider = "local",
      description,
      tags,
      version,
      permissions,
      expirationDate,
      thumbnailUrl,
      folderName,
      parentFolder,
    } = req.body;
    const userId = req.user._id;

    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
      });
    }

    const hasFiles =
      req.files && Array.isArray(req.files) && req.files.length > 0;
    const hasUrl = req.body.url;
    if (!hasFiles && !hasUrl) {
      return res.status(400).json({
        success: false,
        message: "A file upload (via 'files') or URL is required",
      });
    }
    if (hasFiles && hasUrl) {
      return res.status(400).json({
        success: false,
        message: "Cannot upload both files and URL at the same time",
      });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (parentFolder) {
      if (!mongoose.isValidObjectId(parentFolder)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parentFolder ID",
        });
      }
      const folderExists = await mongoose
        .model("Folder")
        .findById(parentFolder);
      if (!folderExists) {
        return res.status(400).json({
          success: false,
          message: "Parent folder does not exist",
        });
      }
    }

    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
      ? JSON.parse(tags.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
      : [];

    let savedFolder = await mongoose.model("Folder").findOne({
      name: folderName,
      parentFolder: parentFolder || null,
      user: userId,
    });

    if (!savedFolder) {
      const newFolder = new Folder({
        name: folderName,
        parentFolder: parentFolder || null,
        user: userId,
        tags: parsedTags,
        status: "draft", // Use status to track draft vs. submitted
      });
      savedFolder = await newFolder.save();
    } else {
      savedFolder.tags = parsedTags;
      savedFolder.auditLog.push({
        userId: userId,
        action: "updated",
        timestamp: new Date(),
      });
      await savedFolder.save();
    }

    // Check if the folder already has 3 files
    // const existingFiles = await File.countDocuments({
    //   parentFolder: savedFolder._id,
    //   status: "active",
    // });
    // if (existingFiles + (req.files?.length || 1) > 3) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Maximum number of files (3) exceeded for this folder",
    //   });
    // }

    let folderPathSegments = req.folderPathSegments || [];
    let currentFolderPathSegments = [...folderPathSegments, folderName];
    let finalDir = path.join(__dirname, "../files");
    if (currentFolderPathSegments.length > 0) {
      finalDir = path.join(finalDir, ...currentFolderPathSegments);
    }

    let savedFiles = [];
    if (hasFiles) {
      for (const file of req.files) {
        const filePath = path.join(finalDir, file.filename);

        let currentParentFolder = savedFolder._id;
        let fileFolderPathSegments = [...currentFolderPathSegments];
        if (file.originalname.includes("/")) {
          const pathParts = file.originalname.split("/").slice(0, -1);
          let parentId = savedFolder._id;

          for (const part of pathParts) {
            let subFolder = await mongoose.model("Folder").findOne({
              name: part,
              parentFolder: parentId,
              user: userId,
            });

            if (!subFolder) {
              subFolder = new Folder({
                name: part,
                parentFolder: parentId,
                user: userId,
                tags: parsedTags,
              });
              await subFolder.save();
            }
            parentId = subFolder._id;
            fileFolderPathSegments.push(part);
          }
          currentParentFolder = parentId;
        }

        if (path.extname(file.originalname).toLowerCase() === ".pdf") {
          // Pre-read file details
          const buffer = await fsPromises.readFile(filePath, { length: 262 });
          const type = await fileTypeFromBuffer(buffer);
          const header = buffer.slice(0, 5).toString();

          if (!(await isValidPdf(filePath))) {
            await fsPromises
              .unlink(filePath)
              .catch((err) =>
                console.error("Error deleting invalid file:", err)
              );
            return res.status(400).json({
              success: false,
              message: `File ${file.originalname} is not a valid PDF`,
              errorCode: "INVALID_PDF",
              details: {
                detectedHeader: header,
                detectedType: type || "unknown",
              },
            });
          }
        }

        const relativePath = `/files/${fileFolderPathSegments.join("/")}/${
          file.filename
        }`;
        const fileDoc = new File({
          user: userId,
          fileName: file.originalname.split("/").pop(),
          fileType: fileType || file.mimetype,
          fileSize: file.size,
          url: relativePath,
          isPublic: isPublic === "true" || false,
          storageProvider: storageProvider,
          description: description || "No description",
          tags: parsedTags,
          version: version || "1.0",
          permissions:
            typeof permissions === "object" && permissions !== null
              ? permissions
              : typeof permissions === "string"
              ? JSON.parse(permissions)
              : { read: [], write: [] },
          expirationDate,
          thumbnailUrl,
          parentFolder: currentParentFolder,
          auditLog: [{ userId, action: "uploaded", timestamp: new Date() }],
        });
        savedFiles.push(await fileDoc.save());
      }
    } else if (hasUrl) {
      const { fileName, fileType, fileSize } = req.body;
      if (!fileName || !fileType || !fileSize) {
        return res.status(400).json({
          success: false,
          message:
            "fileName, fileType, and fileSize are required for URL upload",
          errorCode: "MISSING_FIELDS",
        });
      }
      const size = parseInt(fileSize, 10);
      if (size <= 0) {
        return res.status(400).json({
          success: false,
          message: "File size must be greater than 0",
          errorCode: "INVALID_SIZE",
        });
      }

      if (
        !req.body.url.startsWith("http://") &&
        !req.body.url.startsWith("https://")
      ) {
        return res.status(400).json({
          success: false,
          message: "URL must be a valid public URL (http:// or https://)",
          errorCode: "INVALID_URL",
        });
      }

      let filePath;
      try {
        const response = await axios({
          url: req.body.url,
          method: "GET",
          responseType: "stream",
          timeout: 10000,
        });

        const contentLength = response.headers["content-length"];
        if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: "File size exceeds the 100MB limit",
            errorCode: "FILE_TOO_LARGE",
          });
        }

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(fileName);
        const name = path.basename(fileName, ext);
        const newFileName = `${name}-${uniqueSuffix}${ext}`;
        filePath = path.join(finalDir, newFileName);

        await fsPromises.mkdir(finalDir, { recursive: true });
        const writer = fs.createWriteStream(filePath);
        let totalBytes = 0;

        response.data.on("data", (chunk) => {
          totalBytes += chunk.length;
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", () => {
            if (contentLength && parseInt(contentLength) !== totalBytes) {
              reject(
                new Error(
                  `Downloaded file size (${totalBytes} bytes) does not match content-length (${contentLength} bytes)`
                )
              );
            } else {
              resolve();
            }
          });
          writer.on("error", (err) => {
            reject(new Error(`Failed to write file to disk: ${err.message}`));
          });
        });

        if (ext.toLowerCase() === ".pdf") {
          // Pre-read file details
          const buffer = await fsPromises.readFile(filePath, { length: 262 });
          const type = await fileTypeFromBuffer(buffer);
          const header = buffer.slice(0, 5).toString();

          if (!(await isValidPdf(filePath))) {
            await fsPromises
              .unlink(filePath)
              .catch((err) =>
                console.error("Error deleting invalid file:", err)
              );
            return res.status(400).json({
              success: false,
              message: `File ${fileName} is not a valid PDF`,
              errorCode: "INVALID_PDF",
              details: {
                detectedHeader: header,
                detectedType: type || "unknown",
              },
            });
          }
        }

        const relativePath = `/files/${currentFolderPathSegments.join(
          "/"
        )}/${newFileName}`;
        const fileDoc = new File({
          user: userId,
          fileName: fileName,
          fileType: fileType,
          fileSize: contentLength ? parseInt(contentLength) : size,
          url: relativePath,
          isPublic: isPublic === "true" || false,
          storageProvider: storageProvider,
          description: description || "No description",
          tags: parsedTags,
          version: version || "1.0",
          permissions:
            typeof permissions === "object" && permissions !== null
              ? permissions
              : typeof permissions === "string"
              ? JSON.parse(permissions)
              : { read: [], write: [] },
          expirationDate,
          thumbnailUrl,
          parentFolder: savedFolder._id,
          auditLog: [{ userId, action: "uploaded", timestamp: new Date() }],
        });
        savedFiles.push(await fileDoc.save());
      } catch (error) {
        if (filePath) {
          try {
            await fsPromises.access(filePath, fs.constants.F_OK);
            await fsPromises.unlink(filePath);
          } catch (accessErr) {
            if (accessErr.code !== "ENOENT") {
              console.error("Error checking/deleting file:", accessErr);
            }
          }
        }
        console.error("Error downloading file from URL:", error);
        let errorMessage = "Failed to download file from URL";
        let errorCode = "DOWNLOAD_FAILED";
        if (error.code === "ECONNABORTED") {
          errorMessage = "Request timeout while downloading file from URL";
          errorCode = "DOWNLOAD_TIMEOUT";
        } else if (error.response) {
          errorMessage = `Failed to download file: Server responded with status ${error.response.status}`;
          errorCode = "DOWNLOAD_HTTP_ERROR";
        }
        return res.status(500).json({
          success: false,
          message: errorMessage,
          errorCode,
          details: error.message,
        });
      }
    }

    if (savedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files were uploaded",
      });
    }

    res.status(201).json({
      success: true,
      message: "File(s) uploaded and folder created successfully",
      data: {
        files: savedFiles,
        folder: savedFolder,
      },
    });
  });
});

const updateFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const {
    fileType,
    isPublic,
    storageProvider,
    description,
    tags,
    version,
    permissions,
    expirationDate,
    thumbnailUrl,
  } = req.body;

  if (!mongoose.isValidObjectId(fileId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid file ID",
    });
  }

  const file = await File.findById(fileId).populate("user");
  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  const isOwner =
    req.user && file.user._id.toString() === req.user._id.toString();
  const hasWritePermission =
    req.user &&
    file.permissions.write.some(
      (id) => id.toString() === req.user._id.toString()
    );
  const isAdmin = req.user && req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !hasWritePermission && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You do not have permission to update this file",
    });
  }

  const parsedTags = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
    ? JSON.parse(tags.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
    : file.tags;

  const parsedPermissions =
    typeof permissions === "object" && permissions !== null
      ? permissions
      : typeof permissions === "string"
      ? JSON.parse(permissions)
      : file.permissions;

  const updateData = {
    fileType,
    isPublic: isPublic === "true" || file.isPublic,
    storageProvider: storageProvider || file.storageProvider,
    description: description || file.description,
    tags: parsedTags,
    version: version || file.version,
    permissions: parsedPermissions,
    expirationDate,
    thumbnailUrl,
  };

  const updatedFile = await File.findByIdAndUpdate(
    fileId,
    {
      $set: updateData,
      $push: {
        auditLog: {
          userId: req.user._id,
          action: "updated",
          timestamp: new Date(),
        },
      },
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "File updated successfully",
    data: updatedFile,
  });
});

// const incrementDownloadCount = asyncHandler(async (req, res) => {
//   const { fileId } = req.params;

//   if (!mongoose.isValidObjectId(fileId)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid file ID",
//     });
//   }

//   const file = await File.findById(fileId);
//   if (!file) {
//     return res.status(404).json({
//       success: false,
//       message: "File not found",
//     });
//   }

//   if (file.status !== "active") {
//     return res.status(403).json({
//       success: false,
//       message: "File is not active",
//     });
//   }

//   const isOwner = file.user.toString() === req.user._id.toString();
//   const hasReadPermission = file.permissions.read.some(
//     (id) => id.toString() === req.user._id.toString()
//   );
//   const isAdmin = req.user.role?.roleName.toLowerCase() === "admin";
//   if (!file.isPublic && !isOwner && !hasReadPermission && !isAdmin) {
//     return res.status(403).json({
//       success: false,
//       message: "Access denied: You do not have permission to track this file",
//     });
//   }

//   // Kiểm tra file tồn tại trên hệ thống (nếu local storage)
//   if (file.storageProvider === "local") {
//     const filePath = path.join(__dirname, "../files", path.basename(file.url));
//     if (!fs.existsSync(filePath)) {
//       return res.status(404).json({
//         success: false,
//         message: "File not found on server",
//       });
//     }
//   }

//   file.downloadCount += 1;
//   file.auditLog.push({
//     userId: req.user._id,
//     action: "download_tracked",
//     timestamp: new Date(),
//   });
//   await file.save();

//   res.status(200).json({
//     success: true,
//     message: "Download count updated",
//     downloadCount: file.downloadCount,
//   });
// });
const incrementDownloadCount = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  if (!mongoose.isValidObjectId(fileId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid file ID",
    });
  }

  const file = await File.findById(fileId);
  if (!file) {
    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  }

  await File.findByIdAndUpdate(fileId, {
    $inc: { downloadCount: 1 },
    $push: {
      auditLog: {
        userId: req.user._id,
        action: "downloaded",
        timestamp: new Date(),
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Download count incremented",
  });
});

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile,
  getFilesDetails,
  uploadFileAndCreateFolder, // New function added here
  getFiles,
  updateFile,
  incrementDownloadCount, // New function added here
};
