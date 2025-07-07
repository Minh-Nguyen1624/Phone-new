const Folder = require("../model/folderModel");
const User = require("../model/userModel"); // Assuming you have a User model (adjust if needed)
// const mongoose = require("mongoose");
const multer = require("multer");
const axios = require("axios");
const archiver = require("archiver"); // Thêm thư viện archiver
const path = require("path");
// Import both fs and fs.promises
const fs = require("fs");
const fsPromises = require("fs").promises;
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const { fileTypeFromBuffer } = require("file-type");
const File = require("../model/fileModel");
require("dotenv").config();
// Cố định BASE_DIR
const BASE_DIR = process.env.BASE_DIR || "files"; // Lấy từ biến môi trường hoặc mặc định là "files"

const submitFolder = asyncHandler(async (req, res) => {
  const { folderId } = req.params;

  if (!mongoose.isValidObjectId(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  const folder = await Folder.findById(folderId);
  if (!folder) {
    return res.status(404).json({
      success: false,
      message: "Folder not found",
    });
  }

  const isOwner = folder.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied: You do not have permission to submit this folder",
    });
  }

  if (folder.status !== "draft") {
    return res.status(400).json({
      success: false,
      message: "Only draft folders can be submitted",
    });
  }

  folder.status = "submitted";
  await folder.save();

  res.status(200).json({
    success: true,
    message: "Folder submitted successfully",
    data: folder,
  });
});

const cancelFolder = asyncHandler(async (req, res) => {
  const { folderId } = req.params;

  if (!mongoose.isValidObjectId(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  const folder = await Folder.findById(folderId).populate("user");
  if (!folder) {
    return res.status(404).json({
      success: false,
      message: "Folder not found",
    });
  }

  const isOwner = folder.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied: You do not have permission to cancel this folder",
    });
  }

  if (folder.status !== "draft") {
    return res.status(400).json({
      success: false,
      message: "Only draft folders can be canceled",
    });
  }

  const files = await File.find({ parentFolder: folderId });
  for (const file of files) {
    if (file.storageProvider === "local") {
      const filePath = path.join(__dirname, "..", file.filePath);
      try {
        await fsPromises.unlink(filePath);
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    }
    await File.findByIdAndDelete(file._id);
  }
  await Folder.findByIdAndDelete(folderId);

  res.status(200).json({
    success: true,
    message: "Folder cancelled and files deleted successfully",
  });
});

// Function to create a folder
// const createdFolder = async (req, res) => {
//   try {
//     const { name, parentFolder, user, tags, description } = req.body;

//     // Ensure that the user exists (optional validation)
//     const existingUser = await User.findById(user);
//     if (!existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Ensure that the parent folder exists (optional validation)
//     if (parentFolder) {
//       const existingParentFolder = await Folder.findById(parentFolder);
//       if (!existingParentFolder) {
//         return res.status(400).json({
//           success: false,
//           message: "Parent folder not found",
//         });
//       }
//     }
//     const newFolder = new Folder({
//       name,
//       parentFolder,
//       user,
//       tags,
//       // auditLogs: [
//       //   {
//       //     timestamp: new Date(),
//       //     action: "Folder created",
//       //   },
//       // ],
//       description,
//     });

//     const savedFolder = await newFolder.save();

//     res.status(201).json({
//       success: true,
//       message: "Folder created successfully",
//       data: savedFolder,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error creating folder",
//       error: error.message,
//     });
//   }
// };
const createdFolder = asyncHandler(async (req, res) => {
  const { name, parentFolder, tags } = req.body;
  const userId = req.user._id;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Folder name is required",
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
    const folderExists = await Folder.findById(parentFolder);
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

  const existingFolder = await Folder.findOne({
    name,
    parentFolder: parentFolder || null,
    user: userId,
  });

  if (existingFolder) {
    return res.status(400).json({
      success: false,
      message: "Folder with this name already exists",
    });
  }

  const newFolder = new Folder({
    name,
    parentFolder: parentFolder || null,
    user: userId,
    tags: parsedTags,
    status: "draft",
  });

  const savedFolder = await newFolder.save();

  res.status(201).json({
    success: true,
    message: "Folder created successfully",
    data: savedFolder,
  });
});

// Function to list files in a folder
// const listFilesInFolder = async (req, res) => {
//   try {
//     const { folderId } = req.params;

//     const files = await File.find({ parentFolder: folderId }).populate(
//       "user",
//       "username email"
//     );

//     res.status(200).json({
//       success: true,
//       message: "Files in folder retrieved successfully",
//       data: files,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error listing files in folder",
//       error: error.message,
//     });
//   }
// };
const listFilesInFolder = asyncHandler(async (req, res) => {
  const { folderId } = req.params;

  if (!mongoose.isValidObjectId(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  const folder = await Folder.findById(folderId);
  if (!folder) {
    return res.status(404).json({
      success: false,
      message: "Folder not found",
    });
  }

  const isOwner = folder.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied: You do not have permission to view files in this folder",
    });
  }

  const files = await File.find({ parentFolder: folderId }).populate(
    "user",
    "username email"
  );

  res.status(200).json({
    success: true,
    message: "Files in folder retrieved successfully",
    data: files,
  });
});

// const getAllFolders = async (req, res) => {
//   try {
//     // const { userId } = req.params;
//     const { userId } = req.body.user;
//     const { page = 1, limit = 100 } = req.query;
//     // const folders = await Folder.find({ user: userId })
//     if (
//       isNaN(parseInt(page)) ||
//       isNaN(parseInt(limit)) ||
//       parseInt(page) <= 0 ||
//       parseInt(limit) <= 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid pagination parameters",
//       });
//     }
//     const folders = await Folder.find()
//       .populate("parentFolder", "name") // Populate parent folder name
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     res.status(200).json({
//       success: true,
//       message: "Folders retrieved successfully",
//       folders: folders,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch folders",
//       error: error.message,
//     });
//   }
// };

// Function to delete a folder
// const deleteFolder = async (req, res) => {
//   try {
//     const { folderId } = req.params;

//     // if (!isValidObjectId(folderId)) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Invalid folder ID",
//     //   });
//     // }

//     const folder = await Folder.findByIdAndDelete(folderId, { delete: true });

//     if (!folder) {
//       return res.status(404).json({
//         success: false,
//         message: "Folder not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Folder deleted successfully",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error deleting folder",
//       error: error.message,
//     });
//   }
// };
const getAllFolders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const query = {
    $or: [
      { user: req.user._id },
      { "permissions.read": req.user._id },
      { "permissions.write": req.user._id },
    ],
  };
  if (req.user.role?.roleName.toLowerCase() === "admin") {
    delete query.$or; // Admins see all folders
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === "desc" ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  const folders = await Folder.find(query)
    .populate("user", "username email")
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const total = await Folder.countDocuments(query);

  res.status(200).json({
    success: true,
    folders,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

const deleteFolder = asyncHandler(async (req, res) => {
  const { folderId } = req.params;

  if (!mongoose.isValidObjectId(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  const folder = await Folder.findById(folderId).populate("user");
  if (!folder) {
    return res.status(404).json({
      success: false,
      message: "Folder not found",
    });
  }

  const isOwner = folder.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied: You do not have permission to delete this folder",
    });
  }

  // Delete associated files
  const files = await File.find({ parentFolder: folderId });
  for (const file of files) {
    if (file.storageProvider === "local") {
      const filePath = path.join(__dirname, "../", file.url);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }
    await File.findByIdAndDelete(file._id);
  }

  await Folder.findByIdAndDelete(folderId);

  res.status(200).json({
    success: true,
    message: "Folder and associated files deleted",
  });
});

// const getFolderById = async (req, res) => {
//   try {
//     const { folderId } = req.params;
//     // if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//     if (!mongoose.Types.ObjectId.isValid(folderId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid folder ID",
//       });
//     }
//     // const folder = await Folder.findById(req.params.id)
//     const folder = await Folder.findById(folderId)
//       .populate("parentFolder", "name") // Populate parent folder name
//       .populate("user", "name email"); // Populate user details

//     if (!folder) {
//       return res.status(404).json({
//         success: false,
//         message: "Folder not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       folder,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch folder",
//       error: error.message,
//     });
//   }
// };
const getFolderById = asyncHandler(async (req, res) => {
  const { folderId } = req.params;

  if (!mongoose.isValidObjectId(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  const folder = await Folder.findById(folderId).populate(
    "user",
    "username email"
  );
  if (!folder) {
    return res.status(404).json({
      success: false,
      message: "Folder not found",
    });
  }

  const isOwner = folder.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You do not have permission to view this folder",
    });
  }

  res.status(200).json({
    success: true,
    folder,
  });
});

// const updateFolder = async (req, res) => {
//   try {
//     const { folderId } = req.params;
//     // if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Invalid folder ID",
//     //   });
//     // }
//     if (!mongoose.Types.ObjectId.isValid(folderId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid folder ID",
//       });
//     }
//     const { name, parentFolder, description, tags } = req.body;
//     const folder = await Folder.findById(folderId);

//     if (!folder) {
//       return res.status(404).json({
//         success: false,
//         message: "Folder not found",
//       });
//     }

//     // Update the folder fields
//     folder.name = name || folder.name;
//     folder.parentFolder = parentFolder || folder.parentFolder;
//     folder.description = description || folder.description;
//     folder.tags = tags || folder.tags;

//     // Save the updated folder
//     await folder.save();

//     res.status(200).json({
//       success: true,
//       message: "Folder updated successfully",
//       folder,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update folder",
//       error: error.message,
//     });
//   }
// };
const updateFolder = asyncHandler(async (req, res) => {
  const { folderId } = req.params;
  const { name, tags } = req.body;

  if (!mongoose.isValidObjectId(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  const folder = await Folder.findById(folderId).populate("user");
  if (!folder) {
    return res.status(404).json({
      success: false,
      message: "Folder not found",
    });
  }

  const isOwner = folder.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role?.roleName.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied: You do not have permission to update this folder",
    });
  }

  const parsedTags = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
    ? JSON.parse(tags.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
    : folder.tags;

  const updateData = {
    name: name || folder.name,
    tags: parsedTags,
  };

  const updatedFolder = await Folder.findByIdAndUpdate(
    folderId,
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
    message: "Folder updated successfully",
    data: updatedFolder,
  });
});

const downloadFolder = asyncHandler(async (req, res) => {
  const { folderId } = req.params;

  if (!mongoose.isValidObjectId(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  const folder = await Folder.findById(folderId).populate("user");
  if (!folder) {
    return res.status(404).json({
      success: false,
      message: "Folder not found",
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Please log in to access this resource",
    });
  }

  const isOwner = folder.user._id.toString() === req.user._id.toString();
  const hasReadPermission = folder.permissions?.read?.includes(
    req.user._id.toString()
  );
  const isAdmin = req.user.role?.roleName.toLowerCase() === "admin";

  if (!isOwner && !isAdmin && !hasReadPermission && !folder.isPublic) {
    return res.status(403).json({
      success: false,
      message:
        "Access denied: You do not have permission to download this folder",
    });
  }

  const folderPath = path.join(BASE_DIR, folder.name || "NewFolder");
  console.log("Zipping folder path:", folderPath);

  // Kiểm tra và thử lại nếu file bị khóa
  const checkAndWait = async (path, maxAttempts = 5, delay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await fsPromises.access(path, fsPromises.constants.R_OK);
        return true;
      } catch (error) {
        if (error.code === "EACCES" && attempt < maxAttempts) {
          console.log(`File locked, retrying (${attempt}/${maxAttempts})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    return false;
  };

  try {
    if (!(await checkAndWait(folderPath))) {
      return res.status(500).json({
        success: false,
        message: `Cannot access folder ${folderPath}: File is locked by another process`,
      });
    }
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: `Folder not found on server: ${folderPath}`,
      error: error.message,
    });
  }

  const tempDir = BASE_DIR;
  try {
    await fsPromises.access(tempDir, fsPromises.constants.W_OK);
  } catch {
    await fsPromises.mkdir(tempDir, { recursive: true });
  }

  const tempZipPath = path.join(tempDir, `dummy-${folderId}.zip`);
  const output = fs.createWriteStream(tempZipPath);
  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  archive.on("warning", (err) => {
    console.warn("Archiver warning:", err);
  });

  archive.on("error", (err) => {
    console.error("Archiver error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating ZIP file",
      error: err.message,
    });
  });

  output.on("error", (err) => {
    console.error("Output stream error:", err);
    res.status(500).json({
      success: false,
      message: "Error writing ZIP file",
      error: err.message,
    });
  });

  output.on("close", () => {
    console.log(`Archive created: ${archive.pointer()} total bytes`);
  });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${folder.name}.zip"`
  );

  archive.pipe(output);
  archive.directory(folderPath, false);
  console.log("Directory added to ZIP:", folderPath);
  await archive.finalize();

  const zipBuffer = await fsPromises.readFile(tempZipPath);
  res.send(zipBuffer);

  // Phần này sẽ xóa file tạm thời sau khi gửi
  // res.on("finish", async () => {
  //   try {
  //     await fsPromises.unlink(tempZipPath);
  //     console.log(`Temporary ZIP file ${tempZipPath} deleted`);
  //   } catch (error) {
  //     console.error(`Error deleting temporary ZIP file: ${error.message}`);
  //   }
  // });
});

module.exports = {
  createdFolder,
  listFilesInFolder,
  deleteFolder,
  getAllFolders,
  getFolderById,
  updateFolder,
  submitFolder,
  cancelFolder,
  downloadFolder,
};
