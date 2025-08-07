import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Logout from "../components/Logout";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Profiler.css";

const API_URL = "http://localhost:8080/api";

const Profiler = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/get-user-profile`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });
      setUser(response.data.data);
    } catch (error) {
      setError("Không thể tải thông tin profile từ api");
      console.error("Lỗi tải thông tin profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchUserProfile();
  }, [navigate]);

  if (loading) return <div className="text-center p-4">Đang tải....</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Thông tin cá nhân
        </h2>
        <div className="space-y-4">
          <p>
            <strong>Tên người dùng:</strong>
            {user.username || "Chưa cập nhật"}
          </p>
          <p>
            <strong>Email:</strong>
            {user.email || "Chưa cập nhật"}
          </p>
          <p>
            <strong>Số điện thoại:</strong> {user.phone || "Chưa cập nhật"}
          </p>
          <p>
            <strong>Giới tính:</strong>
            {user.gender || "Chưa cập nhật"}
          </p>
          <p>
            <strong>Ngày sinh:</strong>
            {""}
            {user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString()
              : "Chưa cập nhật"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full mt-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Quay lại trang chủ
          </button>
          <Logout key={user.id} />
        </div>
      </div>
    </div>
  );
};

export default Profiler;
