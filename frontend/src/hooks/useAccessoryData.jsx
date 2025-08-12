import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const useAccessoryData = () => {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allAccessories, setAllAccessories] = useState([]);
  const [searchMode, setSearchMode] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoriesData, setCategoriesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalAccessories, setTotalAccessories] = useState(0);
  const [displayedAccessories, setDisplayedAccessories] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [soldQuantities, setSoldQuantities] = useState({});
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isCategorySelected, setIsCategorySelected] = useState(false);
  const [showSubCategories, setShowSubCategories] = useState(false);
  const [accessoriesCategoryId, setAccessoriesCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [brand, setBrand] = useState([]);
  const [category, setCategory] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [displayLimit, setDisplayLimit] = useState(InitialDisplayLimit);
  const [selectedBrandId, setSelectedBrandId] = useState(null);

  const fetchAccessory = async () => {
    try {
      setLoading(true);
      setError(null);
      const accessoryResponse = await axios.get(
        `${API_URL}/categorys/all?isActive=true`
      );
      if (!accessoryResponse.data.success) {
        throw new Error("Failed to fetch categories");
      }

      const accessoriesData = accessoryResponse.data.data || [];
      setCategory(accessoriesData);
      console.log("accessoriesData:", accessoriesData);

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
          name: cat.name ? cat.name.toLowerCase() : "Unknown",
          parent: parentValue,
        };
      });
      setCategoryMap(map);

      const accessoriesCategory = accessoriesData.find(
        (cat) => cat.name && cat.name.toLowerCase() === "phukien"
      );

      const accessoriesIdNew = accessoriesCategory
        ? accessoriesCategory._id
        : null;
      setAccessoriesCategoryId(accessoriesIdNew);

      const accessoriesResponse = await axios.get(`${API_URL}/phones/search`, {
        params: { limit: Limit * 10, isActive: "true", page: 1 },
      });
      console.log("accessoriesResponse:", accessoriesResponse);
      if (accessoriesResponse.data.success) {
        const allAccessories = accessoriesResponse.data.data || [];
        setAllAccessories(allAccessories);

        let childCategoryIds = accessoriesData
          .filter((cat) => {
            const parentIds = Array.isArray(cat.parentCategory)
              ? cat.parentCategory.map((p) => p._id || p)
              : [cat.parentCategory?._id || cat.parentCategory];
            return parentIds.includes(accessoriesIdNew);
          })
          .map((cat) => cat._id.toString());

        console.log("Child Category IDs:", childCategoryIds);

        let filteredAccessories = allAccessories;
        if (category) {
          filteredAccessories = allAccessories.filter((accessory) => {
            const accessoriesCategoryId =
              accessory.category?._id?.toString() || null;
            return accessoriesCategoryId === category;
          });
          if (filteredAccessories.length === 0) {
            console.warn(
              `No accessories found for category: ${category}. Falling back to child categories.`
            );
            filteredAccessories = allAccessories.filter((accessory) => {
              const accessoriesCategoryId =
                accessory.category?._id?.toString() || null;
              return (
                accessoriesCategoryId ||
                childCategoryIds.includes(accessoriesCategoryId)
              );
            });
          } else {
            filteredAccessories = allAccessories.filter((accessory) => {
              const accessoriesCategoryId =
                accessory.category?._id?.toString() || null;
              return (
                accessoriesCategoryId &&
                childCategoryIds.includes(accessoriesCategoryId)
              );
            });
          }
          setTotalAccessories(filteredAccessories.length);
          setAccessories(filteredAccessories);
          console.log("Filtered Accessories:", filteredAccessories);

          const accessoriesIds = filteredAccessories
            .map((accessory) => accessory?._id || null)
            .filter((id) => id);
          const quantities = {};
          await Promise.all(
            accessoriesIds.map(async (id) => {
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
    fetchAccessory(accessoriesCategoryId, selectedFilter);
  }, [searchQuery, selectedCategoryId, selectedFilter]);

  const handleSearch = async (query) => {
    try {
      setSearchQuery(query);
      setSearchMode(true);
      setDisplayLimit(InitialDisplayLimit);
      await fetchAccessory(selectedCategoryId);
    } catch (error) {
      console.error("Error during search:", error);
      setError("Lỗi khi tìm kiếm laptop.");
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = async (categoryName) => {
    try {
      setLoading(true);

      const normalizedCategoryName = (categoryName | "").toLowerCase().trim();
      if (!normalizedCategoryName) {
        setSelectedCategoryId(null);
        setSelectedFilter(null);
        setDisplayLimit(InitialDisplayLimit);
        setIsCategorySelected(false);
        setShowSubCategories(false);
        await fetchAccessory();
        return;
      }

      // Tìm category object theo tên
      const targetCategory = categories.find((cat) => {
        cat.name &&
          cat.name.toLowerCase().trim() === normalizedCategoryName &&
          (cat._id === accessoriesCategoryId ||
            (Array.isArray(cat.parentCategory)
              ? cat.parentCategory.some(
                  (p) => (p._id || p) === accessoriesCategoryId
                )
              : (cat.parentCategory?._id || cat.parentCategory) ===
                accessoriesCategoryId));
      });

      let newCategoryId = targetCategory ? targetCategory?._id : null;

      if (!newCategoryId) {
        setError(
          `Danh mục '${categoryName}' không tồn tại hoặc không thuộc tablet.`
        );
        return;
      }
      setSelectedCategoryId(newCategoryId);
      setSelectedFilter(categoryName);
      setDisplayLimit(InitialDisplayLimit);
      setIsCategorySelected(true);
      setShowSubCategories(true);

      await fetchAccessory(newCategoryId, selectedFilter);
    } catch (error) {
      console.error("Error during filterByCategory:", error);
      setError("Lỗi khi lọc theo danh mục.");
    } finally {
      setLoading(false);
    }
  };

  const filterByBrand = async (brand) => {
    try {
      console.log("Filtering by brand:", brand);
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
      await fetchAccessory(selectedCategoryId, normalizedBrand);
    } catch (err) {
      console.error("Error in filterByBrand (tablet):", err);
      setError("Lỗi khi lọc tablet theo thương hiệu.");
    } finally {
      setLoading(false);
    }
  };

  const getChildCategories = () => {
    if (!category || !accessoriesCategoryId) return [];
    const parentCategory = category.find(
      (cat) => cat._id === selectedCategoryId
    );
    const baseCategoryId = parentCategory
      ? parentCategory._id
      : accessoriesCategoryId;

    return category
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
      setAccessories((prev) =>
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
      await fetchAccessory(selectedCategoryId);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi mua hàng.");
      console.error("Error purchasing phone:", err);
    }
  };

  const loadMore = () => {
    setDisplayLimit((prev) => prev + InitialDisplayLimit);
  };

  return {
    accessories,
    loading,
    error,
    soldQuantities,
    selectedCategoryId,
    searchQuery,
    category,
    categoryMap,
    brands: brand,
    totalAccessories,
    displayLimit,
    isFilterVisible,
    selectedBrandId,
    isCategorySelected,
    selectedFilter,
    setSelectedFilter,
    showSubCategories,
    setShowSubCategories,
    filterByCategory,
    filterByBrand,
    handleSearch,
    purchasePhone,
    getChildCategories,
    loadMore,
    toggleLike,
    setAccessories,
  };
};

export default useAccessoryData;
