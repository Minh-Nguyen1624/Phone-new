const express = require("express");
const {
  uploadFile,
  downloadFile,
  deleteFile,
  getFilesDetails,
  uploadFileAndCreateFolder,
  getFiles,
  updateFile,
  incrementDownloadCount, // New function added here
} = require("../controller/fileController");

const { authMiddleware, protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/upload", protect, uploadFile);
router.get("/download/:fileId", protect, downloadFile);
// router.get("/files/:folderId", getFiles); // Lấy danh sách file
router.get("/files", protect, getFiles); // Lấy danh sách file
router.post("/upload-and-create-folder", protect, uploadFileAndCreateFolder); // New route for both file and folder
router.delete("/:fileId", protect, deleteFile);
router.get("/:fileId", protect, getFilesDetails);
router.put("/files/:fileId", protect, updateFile); // Cập nhật file
router.post("/files/:fileId/download", incrementDownloadCount); // Tăng lượt tải

module.exports = router;
