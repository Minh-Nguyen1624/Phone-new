import { useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "./Header";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Login.css";

const API_URL = "http://localhost:8080/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/users/user-resetPassword`, {
        token,
        password,
      });
      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data.message || "Lỗi khi đặt lại mật khẩu");
    } finally {
      setIsLoading(false);
    }
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
            Đặt lại mật khẩu
          </h2>
          {message && (
            <div className="alert alert-success text-center">{message}</div>
          )}
          {error && (
            <div className="alert alert-danger text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2 font-bold"
              >
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control w-full pl-10 p-3 border-b border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent"
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </div>
            </div>
            <div className="form-group mt-5">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2 font-bold"
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-control w-full pl-10 p-3 border-b border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent "
                  placeholder="Xác nhận mật khẩu mới"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-3 rounded-full font-semibold text-white transition duration-300 btn-gradient mt-5"
            >
              {isLoading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "Đặt lại mật khẩu"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
