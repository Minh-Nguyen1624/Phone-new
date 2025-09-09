// // utils/reviewUtils.js
// const getBadWordsFilterPromise = require("../utils/bad-words-wrapper");

// let filter = null;
// getBadWordsFilterPromise
//   .then((BadWordsFilter) => {
//     filter = new BadWordsFilter();
//     console.log("BadWordsFilter loaded successfully");
//   })
//   .catch((err) => {
//     console.error("Error loading BadWordsFilter:", err);
//   });

// const { User } = require("../model/userModel");
// const mongoose = require("mongoose");
// const redis = require("redis");
// const Bull = require("bull");
// const natural = require("natural");
// const vietnameseStopwords = require("vietnamese-stopwords");
// const { promisify } = require("util");
// const fs = require("fs");

// const client = redis.createClient({
//   url: process.env.REDIS_URL || "redis://localhost:6379",
// });

// client.on("error", (err) => {
//   console.error("Redis Client Error:", err.message);
// });

// client.on("connect", () => {
//   console.log("Redis Client connected successfully");
// });

// const getAsync = promisify(client.get).bind(client);
// const setExAsync = promisify(client.setEx).bind(client);

// const moderationQueue = new Bull("moderation-queue", {
//   redis: { port: 6379, host: "localhost" },
// });

// const VIOLATION_KEYWORDS = [
//   "chính trị",
//   "tôn giáo",
//   "tội phạm",
//   "bán hàng",
//   "quảng cáo",
// ];
// const Tokenizer = natural.WordTokenizer;
// const tokenizer = new Tokenizer();
// const classifier = new natural.BayesClassifier();

// const trainClassifier = () => {
//   if (!fs.existsSync("classifier.json")) {
//     classifier.addDocument("chính trị tôn giáo tội phạm", "violation");
//     classifier.addDocument("sản phẩm tốt giá rẻ", "safe");
//     classifier.train();
//     classifier.save("classifier.json", (err) => {
//       if (err) {
//         console.error("Error saving classifier:", err);
//       } else {
//         console.log("Classifier saved to classifier.json");
//       }
//     });
//   } else {
//     natural.BayesClassifier.load(
//       "classifier.json",
//       null,
//       (err, loadedClassifier) => {
//         if (err) {
//           console.error("Error loading classifier (invalid JSON):", err);
//           // Nếu lỗi, xóa file và huấn luyện lại
//           fs.unlink("classifier.json", (unlinkErr) => {
//             if (unlinkErr)
//               console.error("Error deleting classifier.json:", unlinkErr);
//             trainClassifier(); // Huấn luyện lại
//           });
//         } else {
//           Object.assign(classifier, loadedClassifier);
//           console.log("Classifier loaded successfully");
//         }
//       }
//     );
//   }
// };
// trainClassifier();

// const validateContent = (content) => {
//   if (!content || content.trim().length === 0) {
//     throw new Error("Content cannot be empty");
//   }
//   if (!filter) {
//     throw new Error(
//       "BadWordsFilter not initialized yet. Please try again later."
//     );
//   }
//   const tokens = tokenizer.tokenize(content.toLowerCase());
//   if (
//     filter.isProfane(content) ||
//     VIOLATION_KEYWORDS.some((keyword) => tokens.includes(keyword))
//   ) {
//     throw new Error(
//       "Content contains inappropriate or prohibited language (initial check)"
//     );
//   }
//   return true;
// };

// const advancedValidateContent = async (content) => {
//   if (!filter) {
//     throw new Error(
//       "BadWordsFilter not initialized yet. Please try again later."
//     );
//   }
//   const tokens = tokenizer
//     .tokenize(content.toLowerCase())
//     .filter((t) => !vietnameseStopwords.includes(t));
//   const cleanedContent = tokens.join(" ");
//   const classification = classifier.getClassifications(cleanedContent)[0];
//   if (classification.label === "violation" || classification.value > 0.7) {
//     throw new Error("Content flagged as inappropriate by AI analysis");
//   }
//   return true;
// };

// const validateConsent = (consent) => {
//   if (!consent || consent !== true) {
//     throw new Error("You must consent to the terms of use for your content");
//   }
//   return true;
// };

// const banUser = async (userId) => {
//   await User.findByIdAndUpdate(
//     userId,
//     { isBanned: true, banReason: "Multiple violations" },
//     { new: true }
//   );
//   await client.del(`user_status:${userId}`);
// };

// const handleViolations = async (reviewId, userId, phoneId) => {
//   const review = await mongoose.model("Review").findById(reviewId);
//   if (review) {
//     try {
//       await validateContent(review.content);
//       await advancedValidateContent(review.content);
//     } catch (error) {
//       await review.deleteReview();
//       await recalcPhoneRating(phoneId); // Giả định hàm này tồn tại
//       console.log(
//         `Review ${reviewId} deleted due to violation: ${error.message}`
//       );

//       const violationCount = await mongoose
//         .model("Review")
//         .countDocuments({ user: userId, isDeleted: true });
//       if (violationCount >= 3) {
//         await banUser(userId);
//         console.log(
//           `User ${userId} banned due to ${violationCount} violations`
//         );
//       }
//     }
//   }
// };

// const queueModeration = (reviewId, userId, phoneId) => {
//   moderationQueue.add(
//     { reviewId, userId, phoneId },
//     { delay: 5000, attempts: 3 }
//   );
// };

// moderationQueue.process(async (job) => {
//   await handleViolations(job.data.reviewId, job.data.userId, job.data.phoneId);
// });

// module.exports = {
//   validateContent,
//   advancedValidateContent,
//   validateConsent,
//   banUser,
//   queueModeration,
// };

// utils/reviewUtils.js
const getBadWordsFilterPromise = require("../utils/bad-words-wrapper");
const axios = require("axios");
const Bull = require("bull");
const mongoose = require("mongoose");
const redis = require("redis");
const { User } = require("../model/userModel");
const { promisify } = require("util");

let filter = null;

getBadWordsFilterPromise
  .then((BadWordsFilter) => {
    filter = new BadWordsFilter();
    console.log("BadWordsFilter instance ready");
  })
  .catch((err) => {
    console.error("Error loading BadWordsFilter:", err);
  });

// Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
client.on("error", (err) => console.error("Redis Error:", err));
// const getAsync = promisify(client.get).bind(client);
// Kết nối Redis
(async () => {
  try {
    await client.connect();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  }
})();

// Thay cho promisify
const getAsync = async (key) => {
  return await client.get(key);
};

const setExAsync = async (key, ttl, value) => {
  return await client.setEx(key, ttl, value);
};

// Bull queue
const moderationQueue = new Bull("moderation-queue", {
  redis: { port: 6379, host: "localhost" },
});

// Keywords heuristic
const VIOLATION_KEYWORDS = ["chính trị", "tôn giáo", "tội phạm", "quảng cáo"];
function isSpammy(content) {
  if (content.length < 3 || content.length > 2000) return true;
  if (/(.)\1{6,}/.test(content)) return true;
  return false;
}

// Layer 1: Local validation
const validateContent = (content) => {
  if (!content || !content.trim()) {
    throw new Error("Content cannot be empty");
  }
  if (filter && filter.isProfane(content)) {
    throw new Error("Content contains profanity");
  }
  if (VIOLATION_KEYWORDS.some((kw) => content.toLowerCase().includes(kw))) {
    throw new Error("Content contains prohibited keywords");
  }
  if (isSpammy(content)) {
    throw new Error("Content flagged as spam");
  }
  return true;
};

// Layer 2: External AI moderation
// const aiModerationCheck = async (content) => {
//   try {
//     const response = await axios.post(
//       "https://api.openai.com/v1/moderations",
//       { input: content },
//       { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
//     );

//     const result = response.data.results[0];
//     if (result.flagged) {
//       throw new Error(`Content flagged by AI moderation`);
//     }
//     return true;
//   } catch (err) {
//     console.error("AI moderation error:", err.message);
//     // fallback: chấp nhận nội dung, hoặc đưa vào queue manual review
//     return true;
//   }
// };
const aiModerationCheck = async (content) => {
  console.log("=== [AI Moderation Debug] ===");

  // Debug: check biến môi trường
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "[AI Moderation] OPENAI_API_KEY is missing. Skipping moderation check."
    );
    return true; // fallback
  }

  console.log(
    `[AI Moderation] OPENAI_API_KEY loaded. Length = ${process.env.OPENAI_API_KEY.length}`
  );

  try {
    console.log("[AI Moderation] Sending request to OpenAI Moderation API...");
    const response = await axios.post(
      "https://api.openai.com/v1/moderations",
      { input: content },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 5000,
      }
    );

    console.log("[AI Moderation] API Response:", JSON.stringify(response.data));

    const result = response.data.results[0];
    if (result.flagged) {
      console.warn(
        `[AI Moderation] Content flagged. Categories: ${JSON.stringify(
          result.categories
        )}`
      );
      throw new Error("Content flagged by AI moderation");
    }

    console.log("[AI Moderation] Content passed moderation ✅");
    return true;
  } catch (err) {
    console.error("=== [AI Moderation Error] ===");

    if (err.response) {
      console.error(
        `Status: ${err.response.status}, Data: ${JSON.stringify(
          err.response.data
        )}`
      );
    } else {
      console.error(`Request failed: ${err.message}`);
    }

    console.warn(
      "[AI Moderation] Fallback activated → review allowed but unmoderated ❗"
    );
    return true; // fallback
  }
};

const validateConsent = (consent) => {
  if (!consent) throw new Error("You must consent to terms before posting");
  return true;
};

const banUser = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    isBanned: true,
    banReason: "Multiple violations",
  });
  await client.del(`user_status:${userId}`);
};

const handleViolations = async (reviewId, userId, phoneId) => {
  const Review = mongoose.model("Review");
  const review = await Review.findById(reviewId);
  if (!review) return;

  try {
    validateContent(review.content);
    await aiModerationCheck(review.content); // thêm bước AI
  } catch (error) {
    await review.deleteReview();
    if (typeof recalcPhoneRating === "function") {
      await recalcPhoneRating(phoneId);
    }
    console.log(`Review ${reviewId} deleted: ${error.message}`);

    const violationCount = await Review.countDocuments({
      user: userId,
      isDeleted: true,
    });
    if (violationCount >= 3) {
      await banUser(userId);
    }
  }
};

const queueModeration = (reviewId, userId, phoneId) => {
  moderationQueue.add(
    { reviewId, userId, phoneId },
    { delay: 3000, attempts: 2 }
  );
};

moderationQueue.process(async (job) => {
  await handleViolations(job.data.reviewId, job.data.userId, job.data.phoneId);
});

module.exports = {
  validateContent,
  aiModerationCheck,
  validateConsent,
  banUser,
  queueModeration,
  getAsync,
  setExAsync,
};
