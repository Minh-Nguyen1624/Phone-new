import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaGoogle, FaCartPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../css/Header.css";
import Header from "../components/Header";
import Logout from "../components/Logout";

const API_URL = "http://localhost:8080/api"; // Địa chỉ API quản trị
const AdminDashboard = () => {
  return (
    <>
      {/* <Header /> */}
      <a href="/" className="header-logo">
        <FaGoogle />
        <span>NamPhương-Store</span>
      </a>
      <a href="/admin" className="header-cart">
        Thông tin quản trị
      </a>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Bảng Điều Khiển Quản Trị
          </h2>
          <p className="text-gray-700 mb-4">
            Chào mừng đến với bảng điều khiển quản trị. Tại đây, bạn có thể quản
            lý người dùng, sản phẩm, đơn hàng và nhiều hơn nữa.
          </p>

          {/* Thêm các thành phần quản trị khác ở đây */}
          <Logout />
        </div>
      </div>
    </>
  );
};
export default AdminDashboard;
