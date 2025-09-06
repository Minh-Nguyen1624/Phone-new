import React, { useState, useEffect } from "react";
import {
  FaGoogle,
  FaSearch,
  FaUser,
  FaHeadphones,
  FaCartPlus,
  FaCaretDown,
  FaCaretUp,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Logout from "./Logout";
import AdminDashboard from "../components/AdminDashboard";
import AddressTag from "../components/AddressTag";
import "../css/Header.css";

const API_URL = "http://localhost:8080/api";

const Header = ({ onSearch, onFilterByCategory, user: propUser }) => {
  const [user, setUser] = useState(propUser);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState([]);
  const [totalPhones, setTotalPhones] = useState(0); // Tổng số điện thoại
  const [isHover, setIsHover] = useState("monitors");

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const fetchUserProfile = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/users/get-user-profile`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
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

    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/categorys/all`, {
          params: { isActive: "true" }, // Chỉ lấy danh mục active
        });
        if (response.data.success) {
          setCategory(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching categories: ", error.message);
      }
    };
    fetchCategories();
  }, []);

  const handleClickReload = () => {
    window.location.reload();
  };

  const handleViewInfoAdmin = () => {
    navigate("/admin");
  };

  const handleViewProfile = () => {
    navigate("/profile");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (onSearch && trimmedQuery) {
      onSearch(trimmedQuery); // Gửi query trực tiếp
    }
  };

  return (
    <header className="header">
      <div className="header__top">
        <a href="/" className="header-logo">
          <FaGoogle />
          <span>NamPhương-Store</span>
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
              <a
                href="#"
                className="header__cart mr-4"
                onClick={handleViewProfile}
              >
                <FaUser />
                <span>Chào, {user.username || "Người dùng"}</span>
              </a>
              {user.role.roleName === "admin" && (
                <a
                  href="#"
                  className="header-cart"
                  onClick={handleViewInfoAdmin}
                >
                  Thông tin quản trị
                </a>
              )}
            </>
          ) : (
            <a href="/login" className="name-order">
              <FaUser />
              <span>Đăng nhập</span>
            </a>
          )}
          <a href="#" className="header__cart">
            <FaCartPlus />
            <span>Giỏ Hàng</span>
          </a>
        </div>
      </div>
      <a href="#" className="header__map">
        <AddressTag />
      </a>
      <div className="header__main">
        <div>
          <ul className="main-menu">
            <li className="item">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // if (onFilterByCategory) onFilterByCategory("smartphones");
                  navigate("/smartphones");
                  handleClickReload();
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
                  // if (onFilterByCategory) onFilterByCategory("categoryId2");
                  navigate("/laptops");
                  handleClickReload();
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
                  // if (onFilterByCategory) onFilterByCategory("categoryId3");
                  navigate("/monitors");
                  handleClickReload();
                }}
                onMouseEnter={() => setIsHover("monitors")}
                onMouseLeave={() => setIsHover(false)}
              >
                <i>
                  <img
                    src="https://cdn.tgdd.vn/content/PC-24x24.png"
                    alt="Màn hình"
                  />
                </i>
                <span>Màn hình</span>
                {isHover === "monitors" ? (
                  <FaCaretUp style={{ marginLeft: "5px" }} />
                ) : (
                  <FaCaretDown style={{ marginLeft: "5px" }} />
                )}
                {/* <FaCaretDown style={{ marginLeft: "5px" }} /> */}
              </a>
            </li>
            <li className="item">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // if (onFilterByCategory) onFilterByCategory("categoryId4");
                  navigate("/tablets");
                  handleClickReload();
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
            <li className="item">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // if (onFilterByCategory) onFilterByCategory("categoryId4");
                  navigate("/accessories");
                  handleClickReload();
                }}
                onMouseEnter={() => setIsHover("accessories")}
                onMouseLeave={() => setIsHover(false)}
              >
                <i>
                  <img
                    src="https://cdn.tgdd.vn/content/phu-kien-24x24.png"
                    alt="Phụ kiện"
                  />
                </i>
                <span>Phụ kiện</span>
                {isHover === "accessories" ? (
                  <FaCaretUp style={{ marginLeft: "5px" }} />
                ) : (
                  <FaCaretDown style={{ marginLeft: "5px" }} />
                )}
                {/* <FaCaretDown style={{ marginLeft: "5px" }} /> */}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
