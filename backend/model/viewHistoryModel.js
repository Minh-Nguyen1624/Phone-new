const mongoose = require("mongoose");

const ViewHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }, // Không bắt buộc
    anonymousId: { type: String, index: true }, // Dùng cho người dùng chưa đăng nhập
    viewCount: { type: Number, default: 1, index: true },
    lastViewed: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Sửa index: partialFilterExpression để unique chỉ khi user exists (không áp dụng cho null/missing)
ViewHistorySchema.index(
  { user: 1, product: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { user: { $exists: true } }, // Unique chỉ khi user có giá trị (không cho null/anonymous)
  }
);
ViewHistorySchema.index(
  { anonymousId: 1, product: 1 },
  { unique: true, sparse: true } // Giữ nguyên cho anonymous
);

const ViewHistory = mongoose.model("ViewHistory", ViewHistorySchema);

// Sửa method: Không set user: null explicit cho anonymous (omit field), dùng findOneAndUpdate upsert
ViewHistory.updateViewHistory = async function (
  productId,
  userId = null,
  anonymousId = null
) {
  if (!userId && !anonymousId) {
    throw new Error("Must provide userId or anonymousId");
  }

  const productObjectId = new mongoose.Types.ObjectId(productId);

  let filter = { product: productObjectId };
  let update = {
    $set: { lastViewed: new Date() },
    $inc: { viewCount: 1 },
  };

  if (userId) {
    filter.user = new mongoose.Types.ObjectId(userId);
    filter.anonymousId = { $exists: false };
  } else {
    filter.anonymousId = anonymousId;
    // Omit user field hoàn toàn cho anonymous (không set null, để sparse skip)
    filter.user = { $exists: false };
  }

  console.log("ViewHistory filter:", filter); // Log debug

  const options = {
    upsert: true, // Tạo mới nếu không tồn tại
    new: true,
    setDefaultsOnInsert: true,
  };

  try {
    const record = await this.findOneAndUpdate(filter, update, options);
    console.log(
      `ViewHistory updated for product ${productId}: viewCount = ${record.viewCount}`
    );
    return record;
  } catch (error) {
    if (error.code === 11000) {
      console.warn("Duplicate key detected, deleting old record and retrying");
      // Fallback: Xóa record cũ với user: null (1 lần thủ công)
      await this.deleteOne({ product: productObjectId, user: null });
      const record = await this.findOneAndUpdate(filter, update, options);
      return record;
    }
    console.error("ViewHistory update error:", error);
    throw error;
  }
};

module.exports = ViewHistory;
