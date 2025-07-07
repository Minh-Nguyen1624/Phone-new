const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    }, // Người dùng (nếu có đăng nhập)
    sessionId: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          // return v.length > 0;
          // return /^[a-fA-F0-9]{36}$/i.test(v);
          return /^[a-z0-9-]{36}$/i.test(v); // Đảm bảo định dạng UUID
        },
        message: "Session ID không được để trống.",
      },
    }, // Session ID để theo dõi người dùng chưa đăng nhập
    page: {
      type: String,
      required: [true, "Page là bắt buộc"],
      trim: true,
      minlength: [1, "Page không được để trống"],
    }, // Trang truy cập
    // product: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Phone",
    //   required: false,
    // }, // Sản phẩm liên quan (nếu có)
    phone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: false,
    }, // Sản phẩm liên quan (nếu có)
    // cartId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Cart",
    //   required: false,
    // }, // Giỏ hàng liên quan (nếu có)
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: false,
    }, // Giỏ hàng liên quan (nếu có)
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    }, // Đơn hàng liên quan (nếu có)
    duration: {
      type: Number,
      default: 0,
      min: [0, "Thời gian phải lớn hơn hoặc bằng 0"],
    }, // Thời gian ở trang (giây)
    timestamp: { type: Date, default: Date.now }, // Thời điểm xảy ra sự kiện
    deviceInfo: {
      browser: { type: String, required: false }, // Trình duyệt
      os: { type: String, required: false }, // Hệ điều hành
      deviceId: {
        type: String,
        required: false,
        minlength: [5, "Device ID quá ngắn"],
      }, // ID thiết bị (nếu cần thiết)
      screenResolution: {
        type: String,
        required: false,
        match: [
          /^\d+x\d+$/,
          "Độ phân giải màn hình không hợp lệ (ví dụ: 1920x1080)",
        ],
      }, // Độ phân giải màn hình
    },
    ipAddress: { type: String, required: false }, // Địa chỉ IP
    action: {
      type: String,
      enum: [
        "page_view",
        "button_click",
        "file_download",
        "form_submit",
        "scroll_depth",
        "video_play",
        "add_to_cart",
        "checkout",
        "category_view",
        "promotion_view",
        "search",
        "add_to_wishlist",
        "order_complete",
        "product_view",
        "product_comparison",
        "uploaded",
      ],
      required: [true, "Action là bắt buộc"],
      default: "page_view",
    },
    eventType: {
      type: String,
      enum: [
        "interaction",
        "transaction",
        "navigation",
        "other",
        "abandon_cart",
      ],
      required: false,
    },
    referrer: { type: String, required: false }, // URL của nguồn truy cập
    isLoggedIn: { type: Boolean, required: true, default: false }, // Trạng thái đăng nhập
    timeZone: { type: String, required: false },
    geoLocation: {
      // country: { type: String, required: false },
      // city: { type: String, required: false },
      // latitude: { type: Number, required: false },
      // longitude: { type: Number, required: false },
      country: { type: String, required: false },
      city: { type: String, required: false },
      latitude: {
        type: Number,
        required: false,
        min: [-90, "Latitude phải từ -90 đến 90"],
        max: [90, "Latitude phải từ -90 đến 90"],
      },
      longitude: {
        type: Number,
        required: false,
        min: [-180, "Longitude phải từ -180 đến 180"],
        max: [180, "Longitude phải từ -180 đến 180"],
      },
      zipCode: {
        type: String,
        required: false,
        maxlength: [10, "Mã bưu điện không được vượt quá 10 ký tự"],
      }, // Mã bưu điện
      region: { type: String, required: false }, // Vùng / khu vực
    },
    timeDetails: {
      hour: { type: Number, required: false }, // Giờ (0-23)
      day: { type: String, required: false }, // Thứ trong tuần
      minute: { type: Number, required: false }, // Phút (0-59)
      month: { type: String, required: false }, // Tháng (tháng năm)
    },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false }, // Dữ liệu tùy chỉnh
    campaign: {
      // utmSource: { type: String, required: false },
      // utmMedium: { type: String, required: false },
      // utmCampaign: { type: String, required: false },
      utmSource: {
        type: String,
        required: false,
        minlength: [3, "utmSource quá ngắn"],
      },
      utmMedium: {
        type: String,
        required: false,
        minlength: [3, "utmMedium quá ngắn"],
      },
      utmCampaign: {
        type: String,
        required: false,
        minlength: [3, "utmCampaign quá ngắn"],
      },
      utmTerm: { type: String, required: false }, // Từ khóa tìm kiếm
      utmContent: { type: String, required: false }, // Nội dung quảng cáo
    },
    deviceType: {
      type: String,
      enum: ["mobile", "desktop", "tablet", "smartwatch", "game_console"],
      required: false,
    },
    error: {
      type: String,
      required: false, // Lỗi nếu có xảy ra trong quá trình tương tác
    },
    interactionDuration: {
      type: Number,
      required: false, // Thời gian tương tác người dùng với sản phẩm (giây)
      min: [0, "Thời gian tương tác phải lớn hơn hoặc bằng 0"],
    },
    referralSource: {
      type: String,
      required: false, // Nguồn giới thiệu (chẳng hạn như từ quảng cáo)
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// analyticsSchema.index({ sessionId: 1 });
// analyticsSchema.index({ user: 1 });
// analyticsSchema.index({ sessionId: 1, user: 1 }, { unique: true });
// analyticsSchema.index({ timestamp: -1 });

analyticsSchema.index({ sessionId: 1, timestamp: -1 });
analyticsSchema.index({ user: 1 });
analyticsSchema.index({ action: 1 });

module.exports = mongoose.model("Analytics", analyticsSchema);
