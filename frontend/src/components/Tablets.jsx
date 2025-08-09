import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import MainProduct from "../components/MainProduct";
import { FaFilter, FaCaretDown } from "react-icons/fa";
import "../css/Tablets.css";

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const Tablets = () => {
  const [phones, setPhones] = useState([]);
  const [allPhones, setAllPhones] = useState([]);
  const [soldQuantities, setSoldQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPhones, setTotalPhones] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [tabletCategoryId, setTabletCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(InitialDisplayLimit);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [allTabletData, setAllTabletData] = useState([]);
  const [isCategorySelected, setIsCategorySelected] = useState(false);
  const [showSubCategories, setShowSubCategories] = useState(true);

  const navigate = useNavigate();

  // Map để hiển thị tên category thân thiện (tuỳ biến nếu cần)
  const categoryNameMap = {
    tablet: "Máy tính bảng",
    samsung: "Máy tính bảng Samsung",
    apple: "Máy tính bảng Apple",
    xiaomi: "Máy tính bảng Xiaomi",
    tcl: "Máy tính bảng TCL",
    lenovo: "Máy tính bảng Lenovo",
    masstel: "Máy tính bảng MassTel",
    honor: "Máy tính bảng Honor",
  };

  // Mapped display name theo _id (dùng khi cần show breadcrumb)
  const categoryNameMap2 = categories.reduce((map, cat) => {
    const key = cat._id;
    const lookupKey = cat.name?.toLowerCase();
    map[key] = categoryNameMap[lookupKey] || cat.name || "Máy tính bảng";
    return map;
  }, {});

  // Hàm handle search: set searchQuery + searchMode
  const handleSearch = async (query) => {
    try {
      setSearchQuery(query);
      setSearchMode(!!query);
      setDisplayLimit(InitialDisplayLimit);
      // fetchTablets sẽ được gọi bởi useEffect
    } catch (err) {
      console.error("Error in handleSearch:", err);
      setError("Lỗi khi tìm kiếm. Vui lòng thử lại.");
    }
  };

  const fetchTablets = async (category = null, brand = null) => {
    setLoading(true);
    setError(null);

    try {
      const categoryResponse = await axios.get(
        `${API_URL}/categorys/all?isActive=true`
      );
      if (!categoryResponse.data.success) {
        throw new Error(
          "Không thể tải danh mục: " + categoryResponse.data.message
        );
      }

      const categoriesData = categoryResponse.data.data || [];
      setCategories(categoriesData);
      console.log("Categories:", categoriesData);

      const parentNameMap = {};
      const map = {};
      categoriesData.forEach((cat) => {
        if (
          !cat.parentCategory ||
          (Array.isArray(cat.parentCategory) && cat.parentCategory.length === 0)
        ) {
          if (cat.name) parentNameMap[cat._id] = cat.name.toLowerCase();
        }
      });
      categoriesData.forEach((cat) => {
        let parentValue = null;
        if (cat.parentCategory && cat.parentCategory.length > 0) {
          const firstParent = Array.isArray(cat.parentCategory)
            ? cat.parentCategory[0]._id || cat.parentCategory[0]
            : cat.parentCategory._id || cat.parentCategory;
          parentValue = parentNameMap[firstParent] || firstParent;
        }
        map[cat._id] = {
          name: cat.name ? cat.name.toLowerCase() : null,
          parentValue,
        };
      });
      setCategoryMap(map);

      const tabletCategory = categoriesData.find(
        (cat) => cat.name && cat.name.toLowerCase().trim() === "tablet"
      );
      if (!tabletCategory) {
        throw new Error("Không tìm thấy danh mục 'tablet' trong dữ liệu API.");
      }
      setTabletCategoryId(tabletCategory._id);
      console.log("Tablet Category ID:", tabletCategory._id);

      const getAllChildCategoryIds = (parentId) => {
        const directChildren = categoriesData
          .filter((cat) => {
            const parentIds = Array.isArray(cat.parentCategory)
              ? cat.parentCategory.map((p) => p._id || p)
              : [cat.parentCategory?._id || cat.parentCategory];
            return parentIds.includes(parentId);
          })
          .map((cat) => cat._id);

        let all = [...directChildren];
        directChildren.forEach((childId) => {
          all = all.concat(getAllChildCategoryIds(childId));
        });
        return all;
      };

      const validCategoryIds = [
        tabletCategory._id,
        ...getAllChildCategoryIds(tabletCategory._id),
      ];
      console.log("Valid Category IDs:", validCategoryIds);

      const tabletResponse = await axios.get(`${API_URL}/phones/search`, {
        params: { limit: Limit * 10, isActive: true, page: 1 },
      });
      if (!tabletResponse.data.success) {
        throw new Error(
          "Không thể tải dữ liệu tablet: " + tabletResponse.data.message
        );
      }
      const allTabletData = tabletResponse.data.data || [];
      console.log("All tablet data:", allTabletData);
      setAllPhones(allTabletData);

      const invalidProducts = allTabletData.filter(
        (phone) => !phone.category || !phone.category._id
      );
      if (invalidProducts.length > 0) {
        console.warn(
          "Products with missing or invalid category:",
          invalidProducts
        );
      }

      let filteredTablets = allTabletData;

      // Lọc theo category trước
      if (category) {
        if (
          validCategoryIds.some((id) => id.toString() === category.toString())
        ) {
          filteredTablets = filteredTablets.filter(
            (phone) =>
              phone.category &&
              phone.category._id &&
              phone.category._id.toString() === category.toString()
          );
          console.log("After category filter:", filteredTablets);
        } else {
          console.warn(`Category ${category} không thuộc tablet group.`);
          setError(
            `Danh mục "${categoryNameMap2[category] || category}" không hợp lệ.`
          );
        }
      }

      // Lọc theo brand sau
      if (brand) {
        const normalizedBrand = brand.toLowerCase().trim();
        filteredTablets = filteredTablets.filter(
          (phone) => (phone.brand || "").toLowerCase() === normalizedBrand
        );
        console.log("After brand filter:", filteredTablets);
      }

      // Lọc theo search query
      if (searchMode && searchQuery) {
        filteredTablets = filteredTablets.filter((phone) =>
          (phone.name || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (!filteredTablets || filteredTablets.length === 0) {
        console.warn("No tablets found after filtering.", {
          category,
          brand,
          searchQuery,
          allTabletDataLength: allTabletData.length,
        });
        filteredTablets = allTabletData;
      }

      const validTablets = filteredTablets.filter(
        (m) => m && m._id && typeof m._id === "string"
      );

      setTotalPhones(validTablets.length);
      setPhones(validTablets);
      console.log("Filtered Tablets:", validTablets);

      // const tabletIds = validTablets.map((tablet) => tablet._id).filter(Boolean);
      const tabletIds = validTablets
        .map((tablet) => tablet._id)
        .filter((id) => id);
      const quantities = {};
      await Promise.all(
        tabletIds.map(async (id) => {
          try {
            const soldResponse = await axios.get(
              `${API_URL}/phones/${id}/sold`
            );
            quantities[id] = soldResponse.data.soldQuantity || 0;
          } catch (err) {
            console.error(`Error fetching sold quantity for ${id}`, err);
            quantities[id] = 0;
          }
        })
      );
      setSoldQuantities(quantities);
    } catch (err) {
      console.error(
        "Error fetching tablets:",
        err.response ? err.response.data : err.message
      );
      setError("Lỗi kết nối đến server. Vui lòng kiểm tra API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablets(tabletCategoryId, selectedFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, tabletCategoryId, selectedFilter]);

  const filterByCategory = async (categoryName) => {
    try {
      setLoading(true);
      const normalizedCategoryName = (categoryName || "").toLowerCase().trim();

      // Nếu không có categoryName => reset về tất cả tablets
      if (!normalizedCategoryName) {
        setSelectedCategoryId(null);
        setSelectedFilter(null);
        setDisplayLimit(InitialDisplayLimit);
        setIsCategorySelected(false);
        setShowSubCategories(false);
        // setShowSubCategories(true);
        await fetchTablets(); // load tất cả
        return;
      }

      // Tìm category object theo tên
      const targetCategory = categories.find((cat) => {
        const catName = (cat.name || "").toLowerCase().trim();
        if (catName !== normalizedCategoryName) return false;

        // Kiểm tra có thuộc nhánh Tablet hay không
        const isTabletRelated =
          cat._id === tabletCategoryId ||
          (Array.isArray(cat.parentCategory)
            ? cat.parentCategory.some((p) => (p._id || p) === tabletCategoryId)
            : (cat.parentCategory?._id || cat.parentCategory) ===
              tabletCategoryId);

        return isTabletRelated;
      });

      if (!targetCategory) {
        setError(
          `Danh mục '${categoryName}' không tồn tại hoặc không thuộc tablet.`
        );
        return;
      }

      // Lưu lại để highlight button
      setSelectedCategoryId(targetCategory._id);
      setSelectedFilter(categoryName);
      setDisplayLimit(InitialDisplayLimit);
      setIsCategorySelected(true);
      setShowSubCategories(true);
      // Fetch sản phẩm thuộc category này
      await fetchTablets(targetCategory._id);
    } catch (err) {
      console.error("Error in filterByCategory (tablet):", err);
      setError("Lỗi khi lọc tablet theo danh mục.");
    } finally {
      setLoading(false);
    }
  };

  const filterByBrand = async (brand) => {
    try {
      setLoading(true);
      const normalizedBrand = (brand || "").toLowerCase().trim();
      if (!normalizedBrand) {
        setError("Vui lòng chọn một thương hiệu hợp lệ.");
        setLoading(false);
        return;
      }
      setSelectedFilter(normalizedBrand);
      setDisplayLimit(InitialDisplayLimit);
      setIsCategorySelected(true);
      setShowSubCategories(true); // Luôn hiển thị nút lọc
      await fetchTablets(selectedCategoryId, normalizedBrand);
    } catch (err) {
      console.error("Error in filterByBrand (tablet):", err);
      setError("Lỗi khi lọc tablet theo thương hiệu.");
    } finally {
      setLoading(false);
    }
  };

  const getChildCategories = () => {
    if (!categories || !tabletCategoryId) return [];
    const parentCategory = categories.find(
      (cat) => cat._id === selectedCategoryId
    );
    const baseCategoryId = parentCategory
      ? parentCategory._id
      : tabletCategoryId;

    return categories
      .filter((cat) => {
        const parentIds = Array.isArray(cat.parentCategory)
          ? cat.parentCategory.map((p) => p._id || p)
          : [cat.parentCategory?._id || cat.parentCategory];
        return parentIds.map((id) => id?.toString()).includes(baseCategoryId);
      })
      .filter((cat) => cat._id !== baseCategoryId);
  };

  // like / purchase
  const toggleLike = async (phoneId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Vui lòng đăng nhập để thích sản phẩm.");
      const response = await axios.post(
        `${API_URL}/phones/${phoneId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPhones((prev) =>
        prev.map((p) => (p._id === phoneId ? response.data.data : p))
      );
    } catch (err) {
      console.error("Error toggling like:", err);
      alert(err.message || "Lỗi khi thích sản phẩm. Vui lòng thử lại.");
    }
  };

  const purchasePhone = async (phoneId, quantity = 1) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Vui lòng đăng nhập để mua hàng.");
      const response = await axios.post(
        `${API_URL}/phones/${phoneId}/purchase`,
        { quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      await fetchTablets(selectedCategoryId);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi mua hàng.");
      console.error("Error purchasing phone:", err);
    }
  };

  const loadMore = () => {
    setDisplayLimit((prev) => prev + InitialDisplayLimit);
  };

  // render states
  if (loading) return <p className="text-center text-gray-600">Đang tải...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!Array.isArray(phones) || phones.length === 0) {
    return (
      <p className="text-center text-gray-600">Không có tablet nào phù hợp.</p>
    );
  }

  return (
    <>
      <div className="header-top-bar">
        <div className="banner-top">
          <div className="item">
            <a href="#" className="item-link">
              <img
                src="//cdnv2.tgdd.vn/mwg-static/tgdd/Banner/3f/8d/3f8d409679edbe42ae3e1e908d62b630.png"
                alt="Banner"
              />
            </a>
          </div>
        </div>
      </div>

      <Header onSearch={handleSearch} />

      <section className="block">
        <ul className="breadcrumb-block">
          <li className="title_category">
            <Link to="/">Trang chủ</Link>
          </li>
          <li className="number_category">{`> ${totalPhones} ${
            categoryNameMap2[selectedCategoryId] || "Máy tính bảng"
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

            {/* nút tất cả */}
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
                onClick={() => filterByCategory(category.name)}
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

          <div
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
          </div>

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

export default Tablets;
