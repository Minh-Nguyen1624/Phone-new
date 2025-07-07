import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  FaEnvelope,
  FaLock,
  FaFacebook,
  FaGoogle,
  FaTwitter,
} from "react-icons/fa"; // Import icon
import "../css/Register.css"; // Import custom CSS for styling

const API_URL = "http://localhost:8080/api";

// ID của vai trò "user" (thay bằng ID thực tế từ MongoDB)
const USER_ROLE_ID = "683177819d7469f3eaedd9da"; // Thay bằng ID thực tế của "user"

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "male",
    role: USER_ROLE_ID, // Gán ID vai trò "user" mặc định
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const newErrors = {};
    if (!formData.username || formData.username.length < 3) {
      newErrors.username = "Tên người dùng phải có ít nhất 3 ký tự.";
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ.";
    }
    if (
      formData.password.length < 8 ||
      !/[!@#$%^&*.]/.test(formData.password)
    ) {
      newErrors.password =
        "Mật khẩu phải có ít nhất 8 ký tự và chứa ký tự đặc biệt.";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu và xác nhận không khớp.";
    }
    if (!/^\d{10,15}$/.test(formData.phone)) {
      newErrors.phone = "Số điện thoại phải từ 10 đến 15 chữ số.";
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Vui lòng chọn ngày sinh.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      console.log("Dữ liệu gửi đi:", {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth),
        address: [],
      });
      const response = await axios.post(
        `${API_URL}/users/register`,
        {
          ...formData,
          dateOfBirth: new Date(formData.dateOfBirth),
          address: [],
        },
        { headers: { "x-client-type": "frontend" } }
      );
      console.log("Phản hồi từ server:", response.data);
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        dateOfBirth: "",
        gender: "male",
        role: USER_ROLE_ID,
      });
      navigate("/login", {
        state: {
          message: "Đăng ký thành công. Vui lòng kiểm tra email để xác minh.",
        },
      });
    } catch (error) {
      console.error(
        "Lỗi đăng ký:",
        error.response ? error.response.data : error.message
      );
      if (error.response) {
        if (error.response.status === 404) {
          setErrors({
            general: "Endpoint không tồn tại. Vui lòng kiểm tra server.",
          });
        } else if (error.response.status === 400) {
          setErrors({
            general:
              error.response.data.errors?.[0]?.msg ||
              error.response.data.message ||
              "Dữ liệu không hợp lệ.",
          });
        } else {
          setErrors({ general: "Đăng ký không thành công. Vui lòng thử lại." });
        }
      } else {
        setErrors({ general: "Lỗi mạng hoặc yêu cầu bị gián đoạn." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // <div className="min-h-screen flex items-center justify-center bg-gray-100">
    //   <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
    //     <h2 className="text-2xl font-bold mb-6 text-center">Đăng Ký</h2>
    //     {errors.general && (
    //       <p className="text-red-500 text-center mb-4">{errors.general}</p>
    //     )}
    //     <form onSubmit={handleSubmit}>
    //       <div className="mb-4">
    //         <label
    //           className="block text-gray-700 text-sm font-bold mb-2"
    //           htmlFor="username"
    //         >
    //           Tên người dùng
    //         </label>
    //         <input
    //           type="text"
    //           id="username"
    //           value={formData.username}
    //           onChange={(e) =>
    //             setFormData({ ...formData, username: e.target.value.trim() })
    //           }
    //           className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    //           placeholder="Nhập tên của bạn"
    //         />
    //         {errors.username && (
    //           <p className="text-red-500 text-sm">{errors.username}</p>
    //         )}
    //       </div>
    //       <div className="mb-4">
    //         <label
    //           className="block text-gray-700 text-sm font-bold mb-2"
    //           htmlFor="email"
    //         >
    //           Email
    //         </label>
    //         <input
    //           type="email"
    //           id="email"
    //           value={formData.email}
    //           onChange={(e) =>
    //             setFormData({ ...formData, email: e.target.value.trim() })
    //           }
    //           className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    //           placeholder="Nhập email của bạn"
    //         />
    //         {errors.email && (
    //           <p className="text-red-500 text-sm">{errors.email}</p>
    //         )}
    //       </div>
    //       <div className="mb-4">
    //         <label
    //           className="block text-gray-700 text-sm font-bold mb-2"
    //           htmlFor="password"
    //         >
    //           Mật khẩu
    //         </label>
    //         <input
    //           type="password"
    //           id="password"
    //           value={formData.password}
    //           onChange={(e) =>
    //             setFormData({ ...formData, password: e.target.value })
    //           }
    //           className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    //           placeholder="Nhập mật khẩu của bạn"
    //         />
    //         {errors.password && (
    //           <p className="text-red-500 text-sm">{errors.password}</p>
    //         )}
    //       </div>
    //       <div className="mb-4">
    //         <label
    //           className="block text-gray-700 text-sm font-bold mb-2"
    //           htmlFor="confirmPassword"
    //         >
    //           Xác nhận mật khẩu
    //         </label>
    //         <input
    //           type="password"
    //           id="confirmPassword"
    //           value={formData.confirmPassword}
    //           onChange={(e) =>
    //             setFormData({ ...formData, confirmPassword: e.target.value })
    //           }
    //           className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    //           placeholder="Xác nhận mật khẩu của bạn"
    //         />
    //         {errors.confirmPassword && (
    //           <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
    //         )}
    //       </div>
    //       <div className="mb-4">
    //         <label
    //           className="block text-gray-700 text-sm font-bold mb-2"
    //           htmlFor="phone"
    //         >
    //           Số điện thoại
    //         </label>
    //         <input
    //           type="tel"
    //           id="phone"
    //           value={formData.phone}
    //           onChange={(e) =>
    //             setFormData({ ...formData, phone: e.target.value.trim() })
    //           }
    //           className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    //           placeholder="Nhập số điện thoại"
    //         />
    //         {errors.phone && (
    //           <p className="text-red-500 text-sm">{errors.phone}</p>
    //         )}
    //       </div>
    //       <div className="mb-4">
    //         <label
    //           className="block text-gray-700 text-sm font-bold mb-2"
    //           htmlFor="dateOfBirth"
    //         >
    //           Ngày sinh
    //         </label>
    //         <input
    //           type="date"
    //           id="dateOfBirth"
    //           value={formData.dateOfBirth}
    //           onChange={(e) =>
    //             setFormData({ ...formData, dateOfBirth: e.target.value })
    //           }
    //           className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    //         />
    //         {errors.dateOfBirth && (
    //           <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>
    //         )}
    //       </div>
    //       <div className="mb-4">
    //         <label
    //           className="block text-gray-700 text-sm font-bold mb-2"
    //           htmlFor="gender"
    //         >
    //           Giới tính
    //         </label>
    //         <select
    //           id="gender"
    //           value={formData.gender}
    //           onChange={(e) =>
    //             setFormData({ ...formData, gender: e.target.value })
    //           }
    //           className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    //         >
    //           <option value="male">Nam</option>
    //           <option value="female">Nữ</option>
    //           <option value="other">Khác</option>
    //         </select>
    //       </div>
    //       <button
    //         type="submit"
    //         disabled={isLoading}
    //         className={`w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition ${
    //           isLoading ? "opacity-50 cursor-not-allowed" : ""
    //         }`}
    //       >
    //         {isLoading ? "Đang xử lý..." : "Đăng Ký"}
    //       </button>
    //     </form>
    //     <p className="mt-4 text-center">
    //       Đã có tài khoản?{" "}
    //       <a href="/login" className="text-blue-500 hover:underline">
    //         Đăng nhập ngay
    //       </a>
    //     </p>
    //   </div>
    // </div>
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2
          className="text-3xl font-bold mb-6 text-center"
          style={{ textShadow: "2px 2px 0 #e0e7ef" }}
        >
          Đăng Ký
        </h2>
        {errors.general && (
          <p className="text-red-500 text-center mb-4">{errors.general}</p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
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
                className="w-full p-3 bg-gray-300 rounded focus:outline-none"
                placeholder="Nhập email của bạn"
                autoComplete="email"
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
              <p className="text-red-500 text-sm">{errors.email}</p>
            )}
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
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
                className="w-full p-3 bg-gray-300 rounded focus:outline-none"
                placeholder="Nhập mật khẩu của bạn"
                autoComplete="new-password"
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
              <p className="text-red-500 text-sm">{errors.password}</p>
            )}
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="confirmPassword"
            >
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="w-full p-3 bg-gray-300 rounded focus:outline-none"
                placeholder="Xác nhận mật khẩu của bạn"
                autoComplete="new-password"
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
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
            )}
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="username"
            >
              Tên người dùng
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value.trim() })
              }
              className="w-full p-3 bg-gray-300 rounded focus:outline-none"
              placeholder="Nhập tên của bạn"
            />
            {errors.username && (
              <p className="text-red-500 text-sm">{errors.username}</p>
            )}
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="phone"
            >
              Số điện thoại
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value.trim() })
              }
              className="w-full p-3 bg-gray-300 rounded focus:outline-none"
              placeholder="Nhập số điện thoại"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm">{errors.phone}</p>
            )}
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="dateOfBirth"
            >
              Ngày sinh
            </label>
            <input
              type="date"
              id="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
              className="w-full p-3 bg-gray-300 rounded focus:outline-none"
            />
            {errors.dateOfBirth && (
              <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>
            )}
          </div>
          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="gender"
            >
              Giới tính
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              className="w-full p-3 bg-gray-300 rounded focus:outline-none"
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-3 rounded-full font-semibold text-white"
            style={{
              background: "linear-gradient(90deg, #36e6a5 0%, #b37cf5 100%)",
              boxShadow: "0 4px 16px 0 rgba(179,124,245,0.15)",
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Đang xử lý..." : "ĐĂNG KÝ"}
          </button>
        </form>
        <div className="mt-6 text-center text-gray-600">
          <div className="mb-2">Hoặc đăng ký bằng</div>
          <div className="flex justify-center gap-6 mb-4">
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
          </div>
          <div>
            Đã có tài khoản?{" "}
            <a
              href="/login"
              className="text-blue-500 font-semibold hover:underline"
            >
              ĐĂNG NHẬP
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
