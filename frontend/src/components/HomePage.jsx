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
// import "../css/ProductDetailInfo.css";
// import "../css/MainProduct.css";

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
  const [totalPhones, setTotalPhones] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(InitialDisplayLimit);
  const [user, setUserProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false); // Thêm state để theo dõi chế độ tìm kiếm
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // Theo dõi categoryId
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const navigate = useNavigate();

  const filterCategories = async (category = null) => {
    console.log("filterCategories - category:", category); // Debug category
    try {
      setLoading(true);
      const categoryResponse = await axios.get(
        `${API_URL}/categories/all?isActive=true`
      );
      console.log("Fetched categories:", categoryResponse.data); // Debug fetched categories
      if (categoryResponse.data.success) {
        const categoryData = categoryResponse.data.data || [];
        setCategories(categoryData);
        const map = {};
        categoryData.forEach((cat) => {
          if (cat._id) {
            map[cat._id] = cat.name;
          }
        });
        console.log("Category map:", map); // Debug category map
        setCategoryMap(map);

        const phoneResponse = await axios.get(`${API_URL}/phones/search`, {
          params: {
            page: 1,
            limit: Limit * 10, // Lấy nhiều hơn để đảm bảo đủ dữ liệu
            isActive: "true",
          },
        });
        console.log("Fetched phones:", phoneResponse.data); // Debug fetched phones
        if (phoneResponse.data.success) {
          const allPhoneData = phoneResponse.data.data || [];
          setPhones(allPhoneData);
          setTotalPhones(phoneResponse.data.pagination?.total || 0);

          const phoneIds = allPhoneData.map((phone) => phone._id);
          const quantities = {};
          await Promise.all(
            phoneIds.map(async (id) => {
              try {
                const soldResponse = await axios.get(
                  `${API_URL}/phones/${id}/sold`
                );
                quantities[id] = soldResponse.data.soldQuantity || 0;
              } catch (error) {
                console.error(
                  `Error fetching sold quantity for phone ${id}:`,
                  error
                );
                quantities[id] = 0;
              }
            })
          );
          setSoldQuantities(quantities);
          // Lọc sản phẩm theo category (client-side) với populate
          let filteredPhones = allPhoneData;
          if (category) {
            filteredPhones = allPhoneData.filter((phone) => {
              const phoneCategoryId = phone.category?._id?.toString() || null; // Sử dụng _id từ populate
              console.log(
                `Filtering phone ${
                  phone.name || "Unnamed"
                }: category=${category}, phoneCategoryId=${phoneCategoryId}`
              );
              return phoneCategoryId === category;
            });
            if (filteredPhones.length === 0) {
              console.warn(
                `No phones found for category: ${category}. Falling back to all phones.`
              );
              filteredPhones = allPhoneData; // Fallback
            }
          }
          setPhones(filteredPhones);
        } else {
          console.error("Failed to fetch phones:", phoneResponse.data.message);
        }
      } else {
        console.error(
          "Failed to fetch categories:",
          categoryResponse.data.message
        );
      }
    } catch (error) {
      console.error(
        "Error fetching categories and phones:",
        error.response ? error.response.data : error.message
      );
      setError("Lỗi kết nối đến server. Vui lòng kiểm tra API.");
    } finally {
      setLoading(false);
    }
  };

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
  }, [currentPage, searchQuery, selectedCategoryId]); // Thêm searchQuery vào dependency

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("fetchData - currentPage:", currentPage); // Debug page
      console.log("fetchData - searchQuery:", searchQuery); // Debug search query
      console.log("fetchData - selectedCategoryId:", selectedCategoryId);

      // Gọi fetchPhones và dựa vào log URL từ api.js
      const { phones: phoneData, totalPages: newTotalPages } =
        await fetchPhones(
          currentPage,
          //  null,
          selectedCategoryId || null, //
          searchQuery
        );
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
      setDisplayLimit(InitialDisplayLimit); // Reset display limit khi tìm kiếm
      setSearchQuery(query); // Cập nhật state searchQuery
      setSearchMode(true); // Bật chế độ tìm kiếm
      setSelectedCategoryId(null); // Reset selectedCategoryId khi tìm kiếm
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
      // fetchData();
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
      setDisplayLimit(InitialDisplayLimit); // Reset display limit khi lọc danh mục
      setSearchMode(false);
      setSearchQuery(""); // Reset search query khi lọc danh mục
      setSelectedCategoryId(categoryId); // Cập nhật selectedCategoryId
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
            <p className="text-gray-500">
              Đã tìm thấy {matchedProducts.length} sản phẩm
            </p>
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

        <h3 className="title">{searchMode ? "" : "Khuyến mãi Online"}</h3>
        <div className="header_main">
          <div>
            <ul className="main-menu">
              <li className="item">
                <a
                  href="#"
                  // onClick={(e) => {
                  //   e.preventDefault();
                  //   // if (onFilterByCategory) onFilterByCategory("smartphones");
                  //   navigate("/category/smartphones");
                  // }}
                  onClick={(e) => {
                    e.preventDefault();
                    filterByCategory("smartphones");
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
                  // onClick={(e) => {
                  //   e.preventDefault();
                  //   if (onFilterByCategory)
                  //     onFilterByCategory("categoryId2");
                  // }}
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
                  // onClick={(e) => {
                  //   e.preventDefault();
                  //   if (onFilterByCategory)
                  //     onFilterByCategory("categoryId3");
                  // }}
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
                  // onClick={(e) => {
                  //   e.preventDefault();
                  //   if (onFilterByCategory)
                  //     onFilterByCategory("categoryId4");
                  // }}
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
                  // onClick={(e) => {
                  //   e.preventDefault();
                  //   if (onFilterByCategory)
                  //     onFilterByCategory("categoryId4");
                  // }}
                >
                  <i>
                    <img
                      src="https://cdn.tgdd.vn/content/phu-kien-24x24.png"
                      alt="Phụ kiện"
                    />
                  </i>
                  <span>Phụ kiện</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="container">
          <div
            className="container mx-auto"
            style={{
              backgroundColor: "#fff",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              paddingLeft: "2.5rem",
              paddingRight: "2.5rem",
            }}
          >
            <ul className="listproduct">
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
            </ul>

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
              <div className="pagination flex justify-center items-center mt-8 space-x-2 p-4">
                <button
                  className="pagination-button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  // disabled={currentPage === 1}
                >
                  Trước
                </button>

                {(() => {
                  const pages = [];
                  const maxVisible = 3; // số trang hiển thị liên tiếp
                  let start = Math.max(2, currentPage - 1);
                  let end = Math.min(totalPages - 1, currentPage + 1);

                  if (currentPage <= 2) {
                    start = 2;
                    end = Math.min(totalPages - 1, maxVisible);
                  }
                  if (currentPage >= totalPages - 2) {
                    start = Math.max(2, totalPages - (maxVisible - 1));
                    end = totalPages - 1;
                  }

                  // Trang đầu tiên
                  pages.push(
                    <button
                      key={1}
                      className={`pagination-button ${
                        currentPage === 1 ? "active" : ""
                      }`}
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </button>
                  );

                  // Dấu ...
                  if (start > 2) {
                    pages.push(<span key="start-ellipsis">...</span>);
                  }

                  // Các trang ở giữa
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`pagination-button ${
                          currentPage === i ? "active" : ""
                        }`}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Dấu ...
                  if (end < totalPages - 1) {
                    pages.push(<span key="end-ellipsis">...</span>);
                  }

                  // Trang cuối
                  if (totalPages > 1) {
                    pages.push(
                      <button
                        key={totalPages}
                        className={`pagination-button ${
                          currentPage === totalPages ? "active" : ""
                        }`}
                        style={{
                          backgroundColor:
                            !currentPage && !totalPages ? "white" : "black",
                          color:
                            !currentPage && !totalPages ? "black" : "white",
                        }}
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}

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
