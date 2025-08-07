const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  // console.log("Created uploads directory:", uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // console.log("Multer destination:", uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedFileName}`;
    // console.log("Multer filename:", filename);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const extname = path.extname(file.originalname).toLowerCase();
  // console.log("File filter check:", {
  //   originalname: file.originalname,
  //   mimetype: file.mimetype,
  //   extname,
  // });

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      "Invalid file type. Only images, PDFs, and Word documents are allowed."
    );
    console.error("File rejected:", error.message, {
      mimetype: file.mimetype,
      extname,
    });
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Multer (will be further restricted by Firestore)
  },
});

// Middleware to handle Multer errors for single file upload
const multerErrorHandler = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", {
        code: err.code,
        message: err.message,
        field: err.field,
      });
      req.multerError = err;
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        // console.log("Ignoring unexpected field:", err.field);
        return next();
      }
      return res
        .status(400)
        .json({ success: false, message: `Multer error: ${err.message}` });
    } else if (err) {
      console.error("File upload error:", err.message);
      req.multerError = err;
      return res.status(400).json({ success: false, message: err.message });
    }
    // console.log("Multer processed successfully:", {
    //   file: req.file,
    //   files: req.files,
    // });
    next();
  });
};

module.exports = { upload, multerErrorHandler };
