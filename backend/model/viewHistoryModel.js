// const mongoose = require("mongoose");

// const ViewHistorySchema = new mongoose.Schema(
//   {
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Phone",
//       required: true,
//       index: true,
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     viewCount: { type: Number, default: 1, index: true },
//     lastViewed: { type: Date, default: Date.now },
//     sessionId: { type: String }, // Tùy chọn, để theo dõi phiên
//   },
//   {
//     timestamps: true, // Tự động thêm createdAt và updatedAt
//   }
// );

// // Tạo index compound để tăng tốc độ query theo user và product
// ViewHistorySchema.index({ user: 1, product: 1 }, { unique: true });

// const ViewHistory = mongoose.model("ViewHistory", ViewHistorySchema);

// module.exports = ViewHistory;

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

// Index compound để tránh trùng lặp
ViewHistorySchema.index(
  { user: 1, product: 1 },
  { unique: true, sparse: true }
);
ViewHistorySchema.index(
  { anonymousId: 1, product: 1 },
  { unique: true, sparse: true }
);

const ViewHistory = mongoose.model("ViewHistory", ViewHistorySchema);

module.exports = ViewHistory;

ViewHistory.updateViewHistory = async function (
  productId,
  userId = null,
  anonymousId = null
) {
  const filter = {
    product: productId,
    ...(userId ? { user: userId } : { anonymousId }),
  };

  // Tìm record có sẵn
  let record = await this.findOne(filter);

  if (record) {
    record.viewCount += 1;
    record.lastViewed = new Date();
    await record.save();
  } else {
    // Tạo mới an toàn
    await this.create(filter);
  }
};
