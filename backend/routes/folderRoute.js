const express = require("express");
const {
  submitFolder,
  cancelFolder,
  createdFolder,
  listFilesInFolder,
  deleteFolder,
  getAllFolders,
  getFolderById,
  updateFolder,
  downloadFolder,
} = require("../controller/folderController");
const router = express.Router();

const { authMiddleware, protect } = require("../middleware/authMiddleware");

router.post("/create", protect, createdFolder);

router.get("/list", protect, listFilesInFolder);

router.delete("/delete/:folderId", protect, deleteFolder);

router.get("/all", protect, getAllFolders);

router.get("/:folderId", protect, getFolderById);

router.put("/:folderId", protect, updateFolder);

router.get("/download/:folderId", protect, downloadFolder);

router.post("/submit", protect, submitFolder);

router.post("/cancel", protect, cancelFolder);

module.exports = router;
