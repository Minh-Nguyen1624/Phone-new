// config/passportConfig.js
const express = require("express");
const passport = require("passport");
const crypto = require("crypto");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const GitHubStrategy = require("passport-github").Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;
const OAuth2Strategy = require("passport-oauth2").Strategy;
const User = require("../model/userModel");
const Role = require("../model/roleModel");
const bcrypt = require("bcryptjs");
const { default: mongoose } = require("mongoose");
const { sendEmail } = require("../utils/email");
require("dotenv").config();

// console.log("Passport config loaded"); // Debug
// console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
// console.log("FACEBOOK_CLIENT_ID:", process.env.FACEBOOK_CLIENT_ID);
// console.log("GITHUB_CLIENT_ID:", process.env.GITHUB_CLIENT_ID);
// console.log("TWITTER_CONSUMER_KEY:", process.env.TWITTER_CONSUMER_KEY);
// console.log("TIKTOK_CLIENT_ID:", process.env.TIKTOK_CLIENT_ID);

const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("Hashed Password:", hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error("Error in hashing password:", error);
  }
};

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // callbackURL: "http://localhost:8080/api/users/auth/google/callback",
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/user.phonenumbers.read",
        // "https://www.googleapis.com/auth/user.birthdays.read",
      ],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        if (!email) {
          return done(new Error("Google không cung cấp email."), null);
        }

        let user = await User.findOne({ email });
        if (!user) {
          let defaultRole = await Role.findOne({
            roleName: { $regex: "^user$", $options: "i" },
          });
          if (!defaultRole) {
            defaultRole = await Role.create({
              roleName: "user", // Sửa từ name thành roleName
              description: "Default user role",
            });
          }
          const hashedPassword = await bcrypt.hash("temp_password", 10);

          // Lấy gender, dateOfBirth, phone từ profile (nếu có)
          const gender = profile.gender || "other";
          const dateOfBirth = profile.birthday
            ? new Date(profile.birthday)
            : new Date();
          const phone =
            profile.phoneNumbers && profile.phoneNumbers.length > 0
              ? profile.phoneNumbers[0].value
              : "0368800168";

          user = new User({
            username: profile.displayName || "Unknown User",
            email,
            password: hashedPassword,
            role: defaultRole._id,
            isVerified: false,
            // gender,
            // dateOfBirth,
            // phone,
            // isProfileComplete: false,
            // verificationToken: crypto.randomBytes(20).toString("hex"),
            // verificationTokenExpires: Date.now() + 86400000,
            gender: "other", // Giá trị mặc định
            dateOfBirth: new Date(), // Giá trị mặc định (có thể thay bằng null nếu cho phép)
            phone: "0368800168", // Giá trị mặc định
            isProfileComplete: false, // Chưa hoàn thiện
            verificationToken: crypto.randomBytes(20).toString("hex"),
            verificationTokenExpires: Date.now() + 86400000, // Đồng bộ 24 giờ
          });
          await user.save();

          // const verificationUrl = `http://localhost:3000/verify-email?token=${user.verificationToken}`;
          const verificationUrl = `http://localhost:5173/verify-email?token=${user.verificationToken}`;
          try {
            await sendEmail(
              email,
              "Xác minh email",
              `Vui lòng nhấp vào liên kết để xác minh email: ${verificationUrl}`,
              `<p>Vui lòng <a href="${verificationUrl}">nhấp vào đây</a> để xác minh email. Liên kết sẽ hết hạn sau 24 giờ.</p>`
            );
          } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            return done(
              new Error(
                "Tài khoản đã được tạo nhưng không thể gửi email xác minh. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
              ),
              null
            );
          }

          return done(
            new Error(
              "Tài khoản mới đã được tạo. Vui lòng kiểm tra email để xác nhận danh tính trước khi đăng nhập qua Google. Nếu không nhận được email, kiểm tra thư mục spam hoặc liên hệ hỗ trợ."
            ),
            null
          );
        }

        if (!user.isVerified) {
          const verificationToken = crypto.randomBytes(20).toString("hex");
          user.verificationToken = verificationToken;
          user.verificationTokenExpires = Date.now() + 86400000;
          await user.save();

          // const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
          const verificationUrl = `http://localhost:5173/verify-email?token=${verificationToken}`;
          try {
            await sendEmail(
              email,
              "Xác minh email",
              `Vui lòng nhấp vào liên kết để xác minh email: ${verificationUrl}`,
              `<p>Vui lòng <a href="${verificationUrl}">nhấp vào đây</a> để xác minh email. Liên kết sẽ hết hạn sau 24 giờ.</p>`
            );
          } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            return done(
              new Error(
                "Không thể gửi email xác minh. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
              ),
              null
            );
          }

          return done(
            new Error(
              "Email này đã được sử dụng. Vui lòng kiểm tra email để xác nhận danh tính trước khi đăng nhập qua Google. Nếu không nhận được email, kiểm tra thư mục spam hoặc liên hệ hỗ trợ."
            ),
            null
          );
        }

        user.lastLogin = new Date();
        await user.save();

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return done(
            new Error("JWT_SECRET chưa được cấu hình trong biến môi trường."),
            null
          );
        }

        const token = jwt.sign(
          { userId: user._id, name: user.username, role: user.role?.roleName },
          jwtSecret,
          { expiresIn: "24h" }
        );

        user.token = token;
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Facebook Strategy
if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_CLIENT_SECRET) {
  console.error("Missing Facebook OAuth credentials");
} else {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        // callbackURL: "http://localhost:8080/api/users/auth/facebook/callback",
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ["id", "displayName", "emails"],
        scope: ["email"], // Thêm scope để yêu cầu email
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value
              : null;
          if (!email) {
            return done(new Error("No email provided by Google"), null);
          }

          let user = await User.findOne({ email });
          if (!user) {
            // Lấy role "user" từ collection Role
            const defaultRole = await Role.findOne({ roleName: "user" });
            if (!defaultRole) {
              throw new Error("Default role 'user' not found in database");
            }
            const hashedPassword = await hashPassword("temp_password");

            user = new User({
              username: profile.displayName,
              // email: profile.emails[0].value,
              email: email,
              // password: null,
              // isActive: true,
              password: hashedPassword, // Giá trị tạm thời (sẽ yêu cầu đổi sau)
              // role: "user",              // Giá trị mặc định              // Giá trị mặc định
              // role: mongoose.Types.ObjectId(),   // Tạo ObjectId tạm thời (cần tham chiếu đúng Role sau)           // Giá trị mặc định
              role: defaultRole._id, //Sử dụng ObjectId từ Role
              gender: "other", // Giá trị mặc định
              dateOfBirth: new Date(), // Giá trị mặc định (có thể thay bằng null nếu cho phép)
              phone: "0368800168", // Giá trị mặc định
              isProfileComplete: false, // Chưa hoàn thiện
            });
            await user.save();
          }
          done(null, user);
        } catch (error) {
          console.error("Error in GoogleStrategy:", error);
          done(error, null);
        }
      }
    )
  );
}

// GitHub Strategy
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.error("Missing GitHub OAuth credentials");
} else {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        // callbackURL: "http://localhost:8080/api/users/auth/github/callback",
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ["user:email"], // Thêm scope để yêu cầu email
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value
              : null;
          if (!email) {
            // Nếu không có email, tạo email tạm thời dựa trên profile.id
            const tempEmail = `${profile.id}@github.temp`;
            console.warn(
              `No email provided by GitHub, using temp email: ${tempEmail}`
            );

            let user = await User.findOne({ email: tempEmail });
            if (!user) {
              const hashedPassword = await hashPassword("temp_password");
              user = new User({
                username:
                  profile.displayName ||
                  profile.username ||
                  `github_user_${profile.id}`,
                email: tempEmail,
                // password: "temp_password", // Giá trị tạm thời
                password: hashedPassword, // Giá trị tạm thời
                role: (await Role.findOne({ roleName: "user" }))._id, // Lấy ObjectId từ Role
                gender: "other",
                dateOfBirth: new Date(),
                phone: "0368800168",
                isProfileComplete: false,
              });
              await user.save();
            }
            return done(null, user);
          }

          let user = await User.findOne({ email });
          if (!user) {
            // const hashedPassword = await hashedPassword("temp_password");
            user = new User({
              username:
                profile.displayName ||
                profile.username ||
                `github_user_${profile.id}`,
              email: email,
              // password: "temp_password",
              password: hashedPassword,
              role: (await Role.findOne({ name: "user" }))._id,
              gender: "other",
              dateOfBirth: new Date(),
              phone: "0368800168",
              isProfileComplete: false,
            });
            await user.save();
          }
          return done(null, user);
        } catch (error) {
          console.error("Error in GitHubStrategy:", error);
          return done(error, null);
        }
      }
    )
  );
}

// Twitter Strategy
if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) {
  console.error("Missing Twitter OAuth credentials");
} else {
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        // callbackURL: "http://localhost:8080/api/users/auth/twitter/callback",
        callbackURL: process.env.TWITTER_CALLBACK_URL,
        includeEmail: true, // Yêu cầu Twitter trả về email (nếu người dùng cho phép)
      },
      async (token, tokenSecret, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value
              : null;
          const username =
            profile.username ||
            profile.displayName ||
            `twitter_user_${profile.id}`;

          if (!email && !username) {
            return done(
              new Error("No email or username provided by Twitter"),
              null
            );
          }

          let user = await User.findOne({ email: email || { username } }); // Tìm bằng email hoặc username
          if (!user) {
            const defaultRole = await Role.findOne({ roleName: "user" });
            if (!defaultRole) {
              throw new Error("Default role 'user' not found in database");
            }
            const hashedPassword = await hashPassword("temp_password");

            user = new User({
              username: username,
              email: email || `${username}@twitter.temp`, // Tạo email tạm nếu không có
              password: hashedPassword, // Mật khẩu tạm thời
              role: defaultRole._id, // Sử dụng ObjectId từ Role
              gender: "other", // Giá trị mặc định
              dateOfBirth: new Date(), // Giá trị mặc định
              phone: "0368800168", // Giá trị mặc định
              isProfileComplete: false, // Chưa hoàn thiện
            });
            await user.save();
          }
          return done(null, user);
        } catch (error) {
          console.error("Error in TwitterStrategy:", error);
          return done(error, null);
        }
      }
    )
  );
}

// Kiểm tra biến môi trường
if (!process.env.TIKTOK_CLIENT_ID || !process.env.TIKTOK_CLIENT_SECRET) {
  console.error("Missing TikTok OAuth credentials");
  process.exit(1); // Thoát nếu thiếu thông tin
}

// Cấu hình Passport với TikTok OAuth2 Strategy
passport.use(
  "tiktok",
  new OAuth2Strategy(
    {
      authorizationURL: "https://www.tiktok.com/v2/auth/authorize/", // Endpoint xác thực
      tokenURL: "https://open.tiktokapis.com/v2/oauth/token/", // Endpoint lấy token
      clientID: process.env.TIKTOK_CLIENT_ID,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      // callbackURL: "https://localhost:8080/api/users/auth/tiktok/callback", // Đảm bảo khớp với TikTok Developer Portal
      callbackURL: process.env.TIKTOK_CALLBACK_URL, // Đảm bảo khớp với TikTok Developer Portal
      scope: "user.info.basic", // Scope cơ bản, có thể thêm 'user.info.profile' sau khi kiểm tra
      passReqToCallback: true,
      pkce: true,
      state: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // console.log("Access Token:", accessToken);
        // console.log("Refresh Token:", refreshToken);
        // console.log("Profile:", profile);

        if (!profile || !profile.open_id) {
          console.error("Invalid TikTok profile data:", profile);
          return done(new Error("Invalid TikTok profile data"));
        }

        const tiktokId = profile.open_id;
        let user = await User.findOne({ tiktokId });

        if (!user) {
          const defaultRole = await Role.findOne({ roleName: "user" });
          if (!defaultRole) {
            console.error('Default role "user" not found');
            return done(new Error('Default role "user" not found'));
          }

          user = new User({
            tiktokId,
            username: profile.display_name || "TikTok User",
            isProfileComplete: false,
            role: defaultRole._id,
            email: null,
            phone: null,
            dateOfBirth: null,
            gender: null,
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        console.error("Error in TikTok OAuth:", error);
        return done(error);
      }
    }
  )
);

// Kiểm tra biến môi trường
console.log("Checking environment variables...");
if (
  !process.env.TIKTOK_CLIENT_ID ||
  !process.env.TIKTOK_CLIENT_SECRET ||
  !process.env.TIKTOK_CLIENT_KEY
) {
  console.error(
    "Missing TikTok OAuth credentials (client_id, client_secret, or client_key)"
  );
  process.exit(1);
}

// Hàm tạo code_verifier và code_challenge
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

const codeVerifiers = new Map();
const states = new Map();

// Cấu hình TikTok Strategy
// console.log("Configuring TikTok strategy...");
passport.use(
  "tiktok",
  new OAuth2Strategy(
    {
      authorizationURL: "https://www.tiktok.com/auth/authorize/", // Sử dụng endpoint legacy
      tokenURL: "https://open.tiktokapis.com/v2/oauth/token/",
      clientID: process.env.TIKTOK_CLIENT_ID,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/api/users/auth/tiktok", // Khớp với redirect_uri
      scope: "user.info.basic",
      passReqToCallback: true,
      pkce: true,
      state: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      // console.log("Inside OAuth2Strategy callback...");
      // console.log("Access Token:", accessToken);
      // console.log("Refresh Token:", refreshToken);
      // console.log("Profile:", profile);

      if (!profile || !profile.open_id) {
        return done(new Error("Invalid TikTok profile data"));
      }

      const tiktokId = profile.open_id;
      let user = await User.findOne({ tiktokId });

      if (!user) {
        const defaultRole = await Role.findOne({ roleName: "user" });
        if (!defaultRole) return done(new Error("Default role not found"));
        user = new User({
          tiktokId,
          username: profile.display_name || "TikTok User",
          isProfileComplete: false,
          role: defaultRole._id,
        });
        await user.save();
      }

      return done(null, user);
    },
    function authorizationParams(options) {
      // console.log("Generating authorization params...");
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(16).toString("hex");
      codeVerifiers.set(this._callbackURL, codeVerifier);
      states.set(this._callbackURL, state);
      return {
        client_key: process.env.TIKTOK_CLIENT_KEY, // Đảm bảo khớp với awc5ekefiqvjzem2
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state,
      };
    },
    function tokenParams(options) {
      // console.log("Generating token params...");
      const codeVerifier = codeVerifiers.get(this._callbackURL);
      if (!codeVerifier) throw new Error("No code verifier found");
      codeVerifiers.delete(this._callbackURL);
      states.delete(this._callbackURL);
      return {
        client_key: process.env.TIKTOK_CLIENT_KEY,
        code_verifier: codeVerifier,
      };
    }
  )
);

passport._strategies["tiktok"].userProfile = async (accessToken, done) => {
  // console.log("Fetching user profile...");
  if (!accessToken) {
    return done(new Error("Access token is missing"));
  }

  const fetch = (await import("node-fetch")).default;
  const url =
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name";
  // console.log("Fetching TikTok user profile with URL:", url);
  // console.log("Access Token:", accessToken);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Key": process.env.TIKTOK_CLIENT_KEY,
    },
  });

  const text = await response.text();
  // console.log("Raw TikTok API Response:", text);

  if (!response.ok) {
    throw new Error(`TikTok API error: ${response.status} - ${text}`);
  }

  const userData = JSON.parse(text);
  // console.log("Parsed TikTok User Data:", userData);

  if (!userData.data || !userData.data.user) {
    return done(
      new Error("Invalid TikTok user data: " + JSON.stringify(userData))
    );
  }

  done(null, userData.data.user);
};

// Lưu user vào session
passport.serializeUser((user, done) => {
  // console.log("Serializing user:", user.id);
  done(null, user.id);
});

// Lấy user từ session
passport.deserializeUser(async (id, done) => {
  try {
    // console.log("Deserializing user with id:", id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
