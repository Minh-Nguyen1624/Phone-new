const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    carrier: { type: String, required: true, trim: true },
    trackingNumber: { type: String, trim: true },
    shippingStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending",
    },
    estimatedDeliveryDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipping", shippingSchema);
