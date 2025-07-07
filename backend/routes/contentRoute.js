const express = require("express");
const {
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
} = require("../controller/contentController");

const router = express.Router();

router.post("/add", createContent);

router.get("/", getContents);

router.get("/:id", getContentById);

router.put("/update/:id", updateContentById);

router.delete("/delete/:id", deleteContentById);

router.put("/:id/views", incrementViews);

router.put("/:id/publish", publishScheduledContent);

router.post("/:id/comments", addComment);

router.post("/:id/revisions", addRevision);

router.get("/search", searchContents);

module.exports = router;
