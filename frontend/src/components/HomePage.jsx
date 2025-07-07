import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaGoogle,
  FaSearch,
  FaUser,
  FaProcedures,
  FaStar,
} from "react-icons/fa";
import Header from "../components/Header";
import MainProduct from "../components/MainProduct";
import { fetchPhones, fetchSoldQuantities } from "../services/api";
import "../css/HomePage.css";

const API_URL = "http://localhost:8080/api";
const Limit = 8;
const InitialDisplayLimit = 4;

const HomePage = () => {
  const [phones, setPhones] = useState([]);
  const [soldQuantities, setSoldQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [displayLimit, setDisplayLimit] = useState(InitialDisplayLimit);
  const [user, setUserProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false); // Thêm state để theo dõi chế độ tìm kiếm
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
          setUserProfile(response.data);
        } catch (error) {
          console.log("Error fetching user profile:", error);
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      };
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
    fetchData();
  }, [currentPage, searchQuery]); // Thêm searchQuery vào dependency

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("fetchData - currentPage:", currentPage); // Debug page
      console.log("fetchData - searchQuery:", searchQuery); // Debug search query

      // Gọi fetchPhones và dựa vào log URL từ api.js
      const { phones: phoneData, totalPages: newTotalPages } =
        await fetchPhones(currentPage, null, searchQuery);
      console.log("Fetched phones:", phoneData); // Debug fetched data
      console.log("Total pages:", newTotalPages); // Debug total pages
      if (!phoneData || (Array.isArray(phoneData) && phoneData.length === 0)) {
        console.log("No phones found for query:", searchQuery);
      } else if (!Array.isArray(phoneData)) {
        console.log("Unexpected phoneData format:", phoneData);
      }
      setPhones(Array.isArray(phoneData) ? phoneData : []);
      setTotalPages(newTotalPages || 1);

      const phoneIds = Array.isArray(phoneData)
        ? phoneData.map((phone) => phone?._id || null).filter((id) => id)
        : [];
      console.log("Phone IDs for sold quantities:", phoneIds); // Debug phone IDs
      const quantities = await fetchSoldQuantities(phoneIds);
      console.log("Sold quantities:", quantities); // Debug quantities
      setSoldQuantities(quantities || {});
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err.message); // Debug error message
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
      } else {
        console.error("No response object, possible network error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-center text-gray-600">Đang tải...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!Array.isArray(phones) || phones.length === 0) {
    return <p className="text-center text-gray-600">Không có sản phẩm nào.</p>;
  }

  const handleSearch = async (query) => {
    try {
      setLoading(true);
      setCurrentPage(1);
      setSearchQuery(query); // Cập nhật state searchQuery
      setSearchMode(true); // Bật chế độ tìm kiếm
      console.log("handleSearch - query received:", query); // Debug query received
      console.log("handleSearch - searchQuery state:", searchQuery); // Debug state trước khi fetch
      await fetchData();
      console.log("handleSearch - searchQuery after fetch:", searchQuery); // Debug state sau fetch
    } catch (error) {
      setError("Không thể tải sản phẩm từ API");
      console.error("Lỗi tải sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
      fetchData();
    }
  };

  // const filterByCategory = async (categoryId) => {
  //   setLoading(true);
  //   try {
  //     const { phones: phoneData, totalPages: newTotalPages } =
  //       await fetchPhones(currentPage, categoryId, "");
  //     console.log("Filtered phones:", phoneData);
  //     setPhones(phoneData);
  //     setTotalPages(newTotalPages);
  //     setSearchMode(false); // Tắt chế độ tìm kiếm khi lọc danh mục

  //     const phoneIds = phoneData.map((phone) => phone._id);
  //     const quantities = await fetchSoldQuantities(phoneIds);
  //     setSoldQuantities(quantities);
  //   } catch (err) {
  //     setError("Không thể lọc danh mục.");
  //     console.error("Filter error:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const filterByCategory = async (categoryId) => {
    try {
      setLoading(true);
      setCurrentPage(1);
      setSearchMode(false);
      console.log("filterByCategory - categoryId:", categoryId); // Debug categoryId
      const { phones: phoneData, totalPages: newTotalPages } =
        await fetchPhones(currentPage, categoryId, "");
      console.log("Filtered phones:", phoneData); // Debug filtered phones
      setPhones(phoneData);
      setTotalPages(newTotalPages);
      const phoneIds = phoneData.map((phone) => phone._id);
      const quantities = await fetchSoldQuantities(phoneIds);
      setSoldQuantities(quantities);
    } catch (error) {
      setError("Không thể lọc danh mục");
      console.error("Lỗi lọc danh mục:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (phoneId) => {
    try {
      const response = await axios.post(
        `${API_URL}/phones/${phoneId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setPhones(
        phones.map((p) => (p._id === phoneId ? response.data.data : p))
      );
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const purchasePhone = async (phoneId, quantity = 1) => {
    try {
      const response = await axios.post(
        `${API_URL}/phones/${phoneId}/purchase`,
        { quantity },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      alert(response.data.message);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi mua hàng.");
      console.error("Error purchasing phone:", err);
    }
  };

  const loadMore = () => {
    setDisplayLimit((prevLimit) => prevLimit + InitialDisplayLimit);
  };

  // Lọc tất cả sản phẩm có tên chứa searchQuery
  const matchedProducts = phones.filter((phone) =>
    phone.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  console.log("Matched products:", matchedProducts); // Debug tất cả sản phẩm khớp

  return (
    <div className="home">
      <div className="header-top-bar">
        <div className="banner-top">
          <div className="item">
            <a href="#" className="item-link">
              <img src="//cdnv2.tgdd.vn/mwg-static/tgdd/Banner/3f/8d/3f8d409679edbe42ae3e1e908d62b630.png" />
            </a>
          </div>
        </div>
      </div>
      <Header onSearch={handleSearch} onFilterByCategory={filterByCategory} />

      <div className="min-h-screen bg-gray-100 py-6">
        {searchMode && matchedProducts.length > 0 && (
          <div className="container mx-auto mb-4 p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800">
              Kết quả tìm kiếm cho: {searchQuery}
            </h2>
          </div>
        )}

        <div className="container mx-auto">
          <div className="section-divider">
            <hr className="section-divider__line" />
            <span className="section-divider__title">
              {searchMode ? "Kết quả tìm kiếm" : "Danh Sách Sản Phẩm"}
            </span>
            <hr className="section-divider__line" />
          </div>
        </div>

        <div className="container">
          <div
            className="container mx-auto px-4"
            style={{
              backgroundColor: "#fff",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              borderRadius: "0.5rem",
            }}
          >
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              style={{ paddingTop: "20px" }}
            >
              {searchMode
                ? matchedProducts
                    .slice(0, displayLimit)
                    .map((phone) => (
                      <MainProduct
                        key={phone._id}
                        phone={phone}
                        soldQuantities={soldQuantities}
                        toggleLike={toggleLike}
                        purchasePhone={purchasePhone}
                      />
                    ))
                : phones
                    .slice(0, displayLimit)
                    .map((phone) => (
                      <MainProduct
                        key={phone._id}
                        phone={phone}
                        soldQuantities={soldQuantities}
                        toggleLike={toggleLike}
                        purchasePhone={purchasePhone}
                      />
                    ))}
            </div>

            {displayLimit <
              (searchMode ? matchedProducts.length : phones.length) && (
              <div
                className="text-center mt-4"
                style={{ paddingBottom: "2rem" }}
              >
                <a
                  className="text-blue py-2 px-4 rounded-lg transition duration-300"
                  onClick={loadMore}
                  style={{ paddingBottom: "20px" }}
                >
                  Xem thêm sản phẩm
                </a>
              </div>
            )}

            {totalPages > 1 && !searchMode && (
              <div className="pagination flex justify-center items-center mt-8 space-x-2">
                <button
                  className="pagination-button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={`pagination-button ${
                        currentPage === page ? "active" : ""
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  className="pagination-button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Tiếp
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
