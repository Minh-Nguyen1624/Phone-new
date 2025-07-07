import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8080/api";

const Logout = ({ setUser }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const userRole = localStorage.getItem("userRole");
      await axios.post(
        `${API_URL}/users/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");

      if (setUser) {
        setUser(null);
      }
      if (userRole !== "admin") {
        navigate("/");
      } else {
        navigate("/login");
      }
      //   navigate("/login");
      //   //   navigate("/");
      alert("Đăng xuất thành công");
    } catch (error) {
      console.error("Error logging out: ", error);
      alert("Đăng xuất không thành công");
    }
  };
  return (
    <a
      href="#"
      className="header__cart logout-link"
      onClick={(e) => {
        e.preventDefault();
        handleLogout();
      }}
    >
      Đăng xuất
    </a>
  );
};

export default Logout;
