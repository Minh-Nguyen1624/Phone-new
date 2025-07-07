import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaEnvelope,
  FaLock,
  FaFacebook,
  FaGoogle,
  FaTwitter,
  FaGit,
  FaGithub,
} from "react-icons/fa"; // Import icon
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import "../css/Login.css"; // Import custom CSS for styling

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
      console.log("Phản hồi từ server:", response.data);
      const { token, redirect, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("userRole", user.role);

      navigate(redirect || "/");
    } catch (error) {
      console.error(
        "Lỗi đăng nhập:",
        error.response ? error.response.data : error.message
      );
      if (error.response) {
        setErrors({
          general: error.response.data.message || "Đăng nhập không thành công.",
        });
      } else {
        setErrors({ general: "Lỗi mạng. Vui lòng thử lại." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          Login
        </h2>
        {errors.general && (
          <p className="text-red-500 text-center mb-4">{errors.general}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2 font-bold"
            >
              Email
            </label>
            <div className="relative">
              {/* <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /> */}

              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value.trim() })
                }
                className="w-full pl-10 p-3 border-b border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent text-color "
                placeholder="Type your username"
                autoComplete="username"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    fill="#888"
                    d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.5-.5a.5.5 0 0 0-.5.5v.379l8 5.334 8-5.334V6.5a.5.5 0 0 0-.5-.5h-15Zm15 12a.5.5 0 0 0 .5-.5v-8.379l-7.5 5-7.5-5V17.5a.5.5 0 0 0 .5.5h15Z"
                  ></path>
                </svg>
              </span>
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2 font-bold"
            >
              Password
            </label>
            <div className="relative">
              {/* <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /> */}
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full pl-10 p-3 border-b border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent text-color"
                placeholder="Type your password"
                autoComplete="current-password"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    fill="#888"
                    d="M17 10V8a5 5 0 0 0-10 0v2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2Zm-8-2a3 3 0 1 1 6 0v2H9V8Zm10 10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6Z"
                  ></path>
                </svg>
              </span>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            <div className="flex justify-end mt-2">
              <a
                href="#"
                className="text-gray-500 text-sm hover:underline font-bold"
              >
                Forgot password?
              </a>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-3 rounded-full font-semibold text-white transition duration-300"
            style={{
              background:
                "linear-gradient(90deg, #43e97b 0%, #38f9d7 50%, #fa8bff 100%)",
              boxShadow: "0 4px 14px 0 rgba(34, 139, 230, 0.15)",
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            LOGIN
          </button>
        </form>
        <div className="my-6 text-center text-gray-500 font-medium">
          Or Sign Up Using
        </div>
        <div className="flex justify-center gap-6 mb-6">
          <a
            href="#"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-800 text-white text-xl shadow hover:scale-110 transition"
          >
            {/* <i className="fab fa-facebook-f"></i> */}
            <FaFacebook className="text-white" />
            <span className="sr-only">Facebook</span>
          </a>
          <a
            href="#"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-400 text-white text-xl shadow hover:scale-110 transition"
          >
            {/* <i className="fab fa-twitter"></i> */}
            <FaTwitter className="text-white" />
            <span className="sr-only">Twitter</span>
          </a>
          <a
            href="#"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white text-xl shadow hover:scale-110 transition"
          >
            {/* <i className="fab fa-google"></i> */}
            <FaGoogle className="text-white" />
            <span className="sr-only">Google</span>
          </a>
          <a
            href="#"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black-500 text-xl shadow hover:scale-110 transition"
          >
            {/* <i className="fab fa-google"></i> */}
            <FaGithub className="text-gray-900" />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
        <div className="text-center text-gray-500 font-medium mb-2">
          Or Sign Up Using
        </div>
        <div className="text-center">
          <a
            href="/register"
            className="text-gray-700 font-semibold hover:underline"
          >
            SIGN UP
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
