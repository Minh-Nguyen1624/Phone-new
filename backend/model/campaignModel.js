const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed", "canceled"],
      default: "draft",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,
      required: false,
    },
    goals: { type: [String], default: [] },
    channels: { type: [String], default: [] },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    banner: { type: String, trim: true },

    // Lịch sử thay đổi ngân sách
    budgetHistory: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now, required: true },
      },
    ],

    // Tệp đính kèm
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Đối tượng khách hàng mục tiêu
    targetAudience: {
      demographics: {
        ageRange: { type: [Number], default: [] },
        location: { type: String },
        gender: {
          type: String,
          enum: ["male", "female", "all"],
          default: "all",
        },
      },
      interests: { type: [String], default: [] },
    },

    // Sản phẩm liên kết với chiến dịch
    phones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Phone" }],

    // Chi tiết chi tiêu ngân sách
    expenses: [
      {
        category: String, // Ví dụ: quảng cáo, sáng tạo nội dung...
        amount: Number,
        description: String,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to increment impressions
campaignSchema.methods.incrementImpressions = function () {
  this.impressions += 1;
  return this.save();
};

// Method to increment clicks
campaignSchema.methods.incrementClicks = function () {
  this.clicks += 1;
  return this.save();
};

// Method to increment conversions
campaignSchema.methods.incrementConversions = function () {
  this.conversions += 1;
  return this.save();
};

// Method to add a new expense
campaignSchema.methods.addExpense = function (expenseData) {
  this.expenses.push(expenseData);
  return this.save();
};

module.exports = mongoose.model("Campaign", campaignSchema);
