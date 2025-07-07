const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ["info", "warning", "error"], required: true },
    message: { type: String, required: true },
    metadata: { type: Object },
    timestamp: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["frontend", "backend", "database", "api", "auth"],
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      required: true,
    },
    resolved: { type: Boolean, default: false },
    errorCode: { type: String },
    stackTrace: { type: String },
    category: {
      type: String,
      enum: ["authentication", "payment", "system", "other"],
      default: "other",
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

module.exports = mongoose.model("Log", logSchema);
