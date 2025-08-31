import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaFilter, FaCaretDown } from "react-icons/fa";
import axios from "axios";
import Header from "../components/Header";
import MainProduct from "../components/MainProduct";
import "../css/LapTop.css";

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const LapTop = () => {
  const [phones, setPhones] = useState([]);
  const [allPhones, setAllPhones] = useState([]);
  const [soldQuantities, setSoldQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPhones, setTotalPhones] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [laptopCategoryId, setLaptopCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(InitialDisplayLimit);
  const navigate = useNavigate();

  const categoryNameMap = {
    asus: "Laptop Asus",
    hp: "Laptop Hp",
    dell: "Laptop Dell",
  };

  const categoryMap2 = categories
    ? categories.reduce((map, cat) => {
        map[cat._id] = categoryNameMap[cat.name] || cat.name || "Laptop";
        return map;
      }, {})
    : {};

  const fetchCategoriesAndPhones = async (category = null) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories
      const categoryResponse = await axios.get(
        `${API_URL}/categorys/all?isActive=true`
      );
      console.log("Categories response:", categoryResponse.data);
      if (categoryResponse.data.success) {
        const categoriesData = categoryResponse.data.data || [];
        setCategories(categoriesData);

        // Create category map
        const parentNameMap = {};
        const map = {};
        categoriesData.forEach((cat) => {
          if (
            !cat.parentCategory ||
            (Array.isArray(cat.parentCategory) &&
              cat.parentCategory.length === 0)
          ) {
            parentNameMap[cat._id] = cat.name ? cat.name.toLowerCase() : null;
          }

          let parentValue = null;
          if (cat.parentCategory && cat.parentCategory.length > 0) {
            const firstParent = Array.isArray(cat.parentCategory)
              ? cat.parentCategory[0]._id || cat.parentCategory[0]
              : cat.parentCategory._id || cat.parentCategory;
            parentValue = parentNameMap[firstParent] || firstParent;
          }
          map[cat._id] = {
            name: cat.name ? cat.name.toLowerCase() : "unknown",
            parent: parentValue,
          };
        });
        setCategoryMap(map);

        // Find laptop category
        const laptopCategory = categoriesData.find(
          (cat) => cat.name && cat.name.toLowerCase() === "lap top"
        );
        const laptopCategoryIdNew = laptopCategory ? laptopCategory._id : null;
        setLaptopCategoryId(laptopCategoryIdNew);

        // Fetch phones
        const phoneResponse = await axios.get(`${API_URL}/phones/search`, {
          params: { limit: Limit * 10, isActive: "true", page: 1 },
        });
        console.log("Search Phones response:", phoneResponse.data);
        if (phoneResponse.data.success) {
          const allPhoneData = phoneResponse.data.data || [];
          setAllPhones(allPhoneData);

          // Get child category IDs
          let childCategoryIds = categoriesData
            .filter((cat) => {
              const parentIds = Array.isArray(cat.parentCategory)
                ? cat.parentCategory.map((p) => p._id || p)
                : [cat.parentCategory?._id || cat.parentCategory];
              return parentIds.includes(laptopCategoryIdNew);
            })
            .map((cat) => cat._id.toString());
          console.log("Child Category IDs:", childCategoryIds);

          // Filter phones
          let filteredPhones = allPhoneData;
          if (category) {
            filteredPhones = allPhoneData.filter((phone) => {
              const phoneCategoryId = phone.category?._id?.toString() || null;
              return phoneCategoryId === category;
            });
            if (filteredPhones.length === 0) {
              console.warn(
                `No phones found for category: ${category}. Falling back to child categories.`
              );
              filteredPhones = allPhoneData.filter((phone) => {
                const phoneCategoryId = phone.category?._id?.toString() || null;
                return (
                  phoneCategoryId && childCategoryIds.includes(phoneCategoryId)
                );
              });
            }
          } else {
            // Default to child categories of "lap top"
            filteredPhones = allPhoneData.filter((phone) => {
              const phoneCategoryId = phone.category?._id?.toString() || null;
              return (
                phoneCategoryId && childCategoryIds.includes(phoneCategoryId)
              );
            });
          }

          setTotalPhones(filteredPhones.length);
          setPhones(filteredPhones);
          console.log("Filtered Phones:", filteredPhones);

          // Fetch sold quantities
          const phoneIds = filteredPhones
            .map((phone) => phone?._id || null)
            .filter((id) => id);
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
        } else {
          setError("Không thể tải danh sách sản phẩm từ server.");
        }
      } else {
        setError("Không thể tải danh sách danh mục.");
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
    fetchCategoriesAndPhones();
  }, []);

  const handleSearch = async (query) => {
    try {
      setSearchQuery(query);
      setSearchMode(true);
      setDisplayLimit(InitialDisplayLimit);
      await fetchCategoriesAndPhones(selectedCategoryId);
    } catch (error) {
      console.error("Error during search:", error);
      setError("Lỗi khi tìm kiếm laptop.");
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = async (categoryId) => {
    try {
      const newCategoryId =
        categoryId === selectedCategoryId ? null : categoryId;
      setSelectedCategoryId(newCategoryId);
      setSearchMode(false);
      setDisplayLimit(InitialDisplayLimit);
      await fetchCategoriesAndPhones(newCategoryId);
    } catch (error) {
      console.error("Error filtering by category:", error);
      setError("Lỗi khi lọc theo danh mục.");
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
      alert("Lỗi khi thích sản phẩm. Vui lòng thử lại.");
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
      await fetchCategoriesAndPhones(selectedCategoryId);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi mua hàng.");
      console.error("Error purchasing phone:", err);
    }
  };

  const loadMore = () => {
    setDisplayLimit((prevLimit) => prevLimit + InitialDisplayLimit);
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}`);
  };

  const getChildCategories = () => {
    if (!categories || !laptopCategoryId) return [];
    return categories.filter((cat) => {
      const parentIds = Array.isArray(cat.parentCategory)
        ? cat.parentCategory.map((p) => p._id || p)
        : [cat.parentCategory?._id || cat.parentCategory];
      return parentIds.includes(laptopCategoryId);
    });
  };

  if (loading) return <p className="text-center text-gray-600">Đang tải...</p>;
  if (error)
    return <p className="text-center text-red-500">{`Lỗi: ${error}`}</p>;
  if (!Array.isArray(phones) || phones.length === 0) {
    return (
      <p className="text-center text-gray-600">
        Không có laptop nào phù hợp với tìm kiếm của bạn.
      </p>
    );
  }

  return (
    <>
      <div className="header-top-bar">
        <div className="banner-top">
          <div className="item">
            <a href="#" className="item-link">
              <img src="//cdnv2.tgdd.vn/mwg-static/tgdd/Banner/3f/8d/3f8d409679edbe42ae3e1e908d62b630.png" />
            </a>
          </div>
        </div>
      </div>

      <Header onSearch={handleSearch} />

      <section className="block" style={{ margin: "auto" }}>
        <ul className="breadcrumb-block">
          <li className="title_category">
            <Link to="/">Trang chủ</Link>
          </li>
          {/* <li className="number_category">{`> ${totalPhones} Laptop`}</li> */}
          <li className="number_category">{`> ${totalPhones} ${
            categoryMap2[selectedCategoryId || "Laptop"] === undefined
              ? "Laptop"
              : categoryMap2[selectedCategoryId || "Laptop"]
          }`}</li>
        </ul>
      </section>

      {searchMode && phones.length > 0 && (
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

      <div className="container mx-auto mt-8">
        <div
          className="container mx-auto px-4"
          style={{
            backgroundColor: "#fff",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            borderRadius: "0.5rem",
            padding: "40px",
          }}
        >
          <div className="cate-main-filter">
            <button
              className="filter_brand-icon"
              style={{
                borderWidth: "1px",
                borderColor: "#939ee8",
                borderStyle: "solid",
              }}
              onClick={() => console.log("Filter button clicked")}
            >
              <FaFilter
                className="filter-icon"
                style={{ marginRight: "5px", color: "#939ee8" }}
              />
              <span className="filter-text">Lọc</span>
            </button>
            <button
              className="filter_brand"
              onClick={() => filterByCategory(null)}
              style={{
                backgroundColor:
                  selectedCategoryId === null ? "#939ee8" : "transparent",
                color: selectedCategoryId === null ? "#fff" : "#000",
                padding: "5px 10px",
                margin: "0 5px",
                borderRadius: "5px",
                border: "1px solid #939ee8",
                height: "40px",
              }}
            >
              Tất cả
            </button>
            {getChildCategories().map((category) => (
              <button
                key={category._id}
                className="filter_brand"
                onClick={() => filterByCategory(category._id)}
                style={{
                  backgroundColor:
                    selectedCategoryId === category._id
                      ? "#939ee8"
                      : "transparent",
                  color: selectedCategoryId === category._id ? "#fff" : "#000",
                  padding: "5px 10px",
                  margin: "0 5px",
                  borderRadius: "5px",
                  border: "1px solid #939ee8",
                  height: "40px",
                }}
              >
                {category.name
                  ? category.name.charAt(0).toUpperCase() +
                    category.name.slice(1)
                  : "Unknown"}
              </button>
            ))}
          </div>

          {/* <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            style={{ paddingTop: "40px", paddingBottom: "40px" }}
          >
            {phones.slice(0, displayLimit).map((phone) => (
              <MainProduct
                key={phone._id}
                phone={phone}
                soldQuantities={soldQuantities}
                toggleLike={toggleLike}
                purchasePhone={purchasePhone}
              />
            ))}
          </div> */}
          <ul className="listproduct">
            {phones.slice(0, displayLimit).map((phone) => (
              <MainProduct
                key={phone._id}
                phone={phone}
                soldQuantities={soldQuantities}
                toggleLike={toggleLike}
                purchasePhone={purchasePhone}
              />
            ))}
          </ul>

          {displayLimit < phones.length && (
            <div
              className="text-center mt-4"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <button
                onClick={loadMore}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
              >
                Xem thêm sản phẩm
                <FaCaretDown style={{ marginLeft: "5px" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LapTop;
