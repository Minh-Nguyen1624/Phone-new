const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  parentCategory: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Category",
    default: null,
    validate: {
      validator: function (v) {
        if (!v || !this._id) return true;
        return v.toString() !== this._id.toString();
      },
      message: "A category cannot be its own parent.",
    },
  },

  discount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Discount",
    default: null,
    validate: {
      validator: async function (v) {
        if (!v) return true; // Nếu không có discount, trả về true (không lỗi)

        const Discount = mongoose.model("Discount");
        const discountDoc = await Discount.findById(v); // Kiểm tra discount theo ID

        if (!discountDoc) {
          return false; // Nếu discount không tồn tại, trả về lỗi
        }

        const now = new Date();
        // Kiểm tra discount có active và trong phạm vi thời gian hợp lệ không
        return (
          discountDoc.isActive &&
          now >= discountDoc.startDate &&
          now <= discountDoc.endDate
        );
      },
      message: "The assigned discount is not active or valid.",
    },
  },

  imageUrl: {
    type: String,
    required: [true, "Image URL is required"],
    trim: true,
    validate: {
      validator: function (v) {
        return /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/.test(v);
      },
      message: (props) =>
        `${props.value} is not a valid image URL (must end with .jpg, .jpeg, .png, or .gif)`,
    },
    // validate: {
    //   validator: function (v) {
    //     const validExtensions = /\.(jpg|jpeg|png|gif)$/i;
    //     return validator.isURL(v) && validExtensions.test(v);
    //   },
    //   message: (props) => `${props.value} is not a valid image URL.`,
    // },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

categorySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

categorySchema.pre("save", async function (next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  const existing = await this.constructor.findOne({ slug: this.slug });
  if (existing && existing._id.toString() !== this._id.toString()) {
    return next(new Error("Slug must be unique."));
  }
  next();
});

module.exports = mongoose.model("Category", categorySchema);
