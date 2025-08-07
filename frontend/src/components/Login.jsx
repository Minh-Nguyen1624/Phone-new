import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import {
  FaEnvelope,
  FaLock,
  FaFacebook,
  FaGoogle,
  FaTwitter,
  FaGithub,
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Login.css";

const API_URL = "http://localhost:8080/api";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const newErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ.";
    }
    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/users/login`, formData, {
        headers: { "x-client-type": "frontend" },
      });
      const { token, redirect, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userRole", user.role || "user");

      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate(redirect || "/");
      }
    } catch (error) {
      console.error(
        "Lỗi đăng nhập:",
        error.response ? error.response.data : error.message
      );
      if (error.response) {
        const message =
          error.response.data.message || "Đăng nhập không thành công.";
        setErrors({ general: message });
        if (message.includes("xác minh")) {
          setErrors({
            general: message,
            showResend: true, // Hiển thị nút gửi lại email xác minh
          });
        }
      } else {
        setErrors({ general: "Lỗi mạng. Vui lòng thử lại." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/users/resend-verification`, {
        email: formData.email,
      });
      setErrors({
        general:
          "Email xác minh đã được gửi lại. Vui lòng kiểm tra hộp thư của bạn.",
        showResend: false,
      });
    } catch (error) {
      setErrors({
        general:
          error.response?.data.message || "Lỗi khi gửi lại email xác minh.",
        showResend: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickBack = () => {
    navigate("/");
  };

  const handleClickForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div
          className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-transparent"
          style={{
            borderImage: "linear-gradient(90deg, #a1c4fd 0%, #c2e9fb 100%) 1",
          }}
        >
          <h2
            className="text-4xl font-bold text-center text-gray-900 mb-8"
            style={{ textShadow: "2px 2px 0 #eee" }}
          >
            Đăng nhập
          </h2>
          {errors.general && (
            <div className="alert alert-danger text-center">
              {errors.general}
            </div>
          )}
          {errors.showResend && (
            <div className="text-center mb-4">
              <button
                onClick={handleResendVerification}
                disabled={isLoading}
                className="btn btn-link text-primary"
              >
                Gửi lại email xác minh
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2 font-bold"
              >
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value.trim() })
                  }
                  className="form-control w-full pl-10 p-3 border-b border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent"
                  placeholder="Nhập email của bạn"
                  autoComplete="username"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <FaEnvelope />
                </span>
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
            <div className="form-group">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2 font-bold"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="form-control w-full pl-10 p-3 border-b border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent"
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <FaLock />
                </span>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
              <div className="flex justify-end mt-2">
                <a
                  onClick={handleClickForgotPassword}
                  className="text-gray-500 text-sm hover:underline font-bold"
                  style={{ cursor: "pointer" }}
                >
                  Quên mật khẩu?
                </a>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-3 rounded-full font-semibold text-white transition duration-300 btn-gradient"
            >
              {isLoading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "ĐĂNG NHẬP"
              )}
            </button>
          </form>
          <div className="my-6 text-center text-gray-500 font-medium">
            Hoặc đăng nhập bằng
          </div>
          <div className="flex justify-center gap-6 mb-6">
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-800 text-white text-xl shadow hover:scale-110 transition"
            >
              <FaFacebook />
              <span className="sr-only">Facebook</span>
            </a>
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-400 text-white text-xl shadow hover:scale-110 transition"
            >
              <FaTwitter />
              <span className="sr-only">Twitter</span>
            </a>
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white text-xl shadow hover:scale-110 transition"
            >
              <FaGoogle />
              <span className="sr-only">Google</span>
            </a>
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-white text-xl shadow hover:scale-110 transition"
            >
              <FaGithub className="text-gray-900" />
              <span className="sr-only">GitHub</span>
            </a>
          </div>
          <div className="text-center text-gray-500 font-medium mb-2">
            Hoặc đăng ký
          </div>
          <div className="text-center">
            <a
              href="/register"
              className="text-gray-700 font-semibold hover:underline"
            >
              ĐĂNG KÝ
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
