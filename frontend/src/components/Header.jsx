import React, { useState, useEffect } from "react";
import { FaGoogle, FaSearch, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Logout from "./Logout";
import "../css/Header.css";

const API_URL = "http://localhost:8080/api";

const Header = ({ onSearch, onFilterByCategory }) => {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Token:", token); // Kiểm tra token
    if (token) {
      const fetchUserProfile = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/users/get-user-profile`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log("User data:", response.data); // Log dữ liệu trả về
          if (response.data.success && response.data.data) {
            setUser(response.data.data);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error(
            "Error fetching user profile: ",
            error.response?.data || error.message
          );
          setUser(null);
          localStorage.removeItem("token");
        }
      };
      fetchUserProfile();
    }
  }, []);

  const handleViewProfile = () => {
    navigate("/profile");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    console.log("Header search - query:", trimmedQuery); // Debug
    if (onSearch && trimmedQuery) {
      onSearch(trimmedQuery); // Gửi query trực tiếp
    }
  };

  return (
    <header className="header">
      <div className="header__top">
        <a href="/" className="header-logo">
          <FaGoogle />
          <span>Điện thoại tốt</span>
        </a>
        <form onSubmit={handleSearch} className="header__search">
          <button type="submit" aria-label="Search">
            <FaSearch />
          </button>
          <input
            type="text"
            className="header__top-search"
            placeholder="Bạn muốn tìm gì..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleSearch(e); // Trigger search on Enter
            }}
          />
        </form>
        <div className="profile">
          {user ? (
            <>
              <span className="name-order mr-4">
                <FaUser />
                <span>Chào, {user.username || "Người dùng"}</span>
              </span>
              <a
                href="#"
                className="header__cart mr-4"
                onClick={handleViewProfile}
              >
                <FaUser />
                <span>Xem Profile</span>
              </a>
              <Logout setUser={setUser} />
            </>
          ) : (
            <a href="/login" className="name-order">
              <FaUser />
              <span>Đăng nhập</span>
            </a>
          )}
          <a href="#" className="header__cart">
            <FaGoogle />
            <span>Giỏ Hàng</span>
          </a>
        </div>
      </div>
      <div className="header__main">
        <div>
          <ul className="main-menu">
            <li className="item">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // if (onFilterByCategory) onFilterByCategory("smartphones");
                  navigate("/category/smartphones");
                }}
              >
                <i>
                  <img
                    src="https://cdn.tgdd.vn/content/phonne-24x24.png"
                    alt="Điện Thoại"
                  />
                </i>
                <span>Điện Thoại</span>
              </a>
            </li>
            <li className="item">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (onFilterByCategory) onFilterByCategory("categoryId2");
                }}
              >
                <i>
                  <img
                    src="https://cdn.tgdd.vn/content/laptop-24x24.png"
                    alt="LapTop"
                  />
                </i>
                <span>LapTop</span>
              </a>
            </li>
            <li className="item">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (onFilterByCategory) onFilterByCategory("categoryId3");
                }}
              >
                <i>
                  <img
                    src="https://cdn.tgdd.vn/content/PC-24x24.png"
                    alt="Máy tính"
                  />
                </i>
                <span>Máy tính</span>
              </a>
            </li>
            <li className="item">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (onFilterByCategory) onFilterByCategory("categoryId4");
                }}
              >
                <i>
                  <img
                    src="https://cdn.tgdd.vn/content/tablet-24x24.png"
                    alt="Tablet"
                  />
                </i>
                <span>Tablet</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
