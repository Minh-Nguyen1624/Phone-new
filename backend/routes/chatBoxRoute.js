const express = require("express");
const router = express.Router();
const {
  setIo,
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessageAsRead,
  addReaction,
} = require("../controller/chatBoxController");
const {
  protect,
  verifyFirebaseToken,
} = require("../middleware/authMiddleware");
// const { upload } = require("../middleware/upload");
const { multerErrorHandler } = require("../middleware/upload");

// Initialize Socket.IO (assuming it's passed from server.js)
let io;
const initializeIo = (socketIo) => {
  io = socketIo;
  setIo(io); // Pass Socket.IO instance to controller
};

// Routes
// Get all conversations for the authenticated user
router.get("/conversations", protect, getConversations);

// Get messages in a specific conversation
router.get("/conversations/:conversationId/messages", protect, getMessages);
// router.get(
//   "/conversations/:conversationId/messages",
//   protect,
//   verifyFirebaseToken,
//   getMessages
// );

// Create a new conversation
router.post("/conversations/add", protect, createConversation);

// Send a message (text or file)
router.post(
  "/conversations/:conversationId/messages/send",
  protect,
  // upload.single("file"), // Handle file upload
  verifyFirebaseToken,
  multerErrorHandler, // Handle errors from multer
  sendMessage,
  (req, res) => {
    console.log("Test upload file:", req.file);
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    res.json({ success: true, file: req.file });
  }
);

// Edit a message
router.patch("/messages/:messageId", protect, editMessage);

// Delete a message
router.delete("/messages/:messageId", protect, deleteMessage);

// Mark a message as read
router.post("/messages/:messageId/read", protect, markMessageAsRead);

// Add or remove a reaction to a message
router.post("/messages/:messageId/reactions", protect, addReaction);

module.exports = { router, initializeIo };
