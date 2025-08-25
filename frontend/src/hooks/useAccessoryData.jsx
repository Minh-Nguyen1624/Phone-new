import React, { useEffect, useState } from "react";
import axios from "axios";
import slugify from "slugify";

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const validCategories = [
  "camera",
  "thẻ nhớ",
  "router",
  "máy chiếu",
  "bluetooth",
  "có dây",
  "chụp tai",
  "xiaomi",
  "10000mah",
  "20000mah",
  "dưới 300.000đ",
  "xmobile",
  "tai nghe",
  "adapter sạc",
  "cáp sạc",
  "ốp lưng",
  "chuột",
  "bàn phím",
  "usb",
  "túi chống sốc",
  "loa bluetooth",
  "loa vi tính",
  "jbl",
  "sony",
  "lightning",
  "adapter type-c",
  "adapter usb",
  "cáp type-c",
];

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

  const fetchAccessory = async (categoryId = null, filter = null) => {
    try {
      setLoading(true);
      setError(null);
      const accessoryResponse = await axios.get(
        `${API_URL}/categorys/all?isActive=true`
      );
      console.log("Categories Response:", accessoryResponse.data);
      if (!accessoryResponse.data.success) {
        throw new Error("Failed to fetch categories");
      }

      const categoriesData = accessoryResponse.data.data || [];
      setCategory(categoriesData);
      console.log("Categories Data:", categoriesData);

      const accessoriesCategory = categoriesData.find(
        (cat) =>
          !cat.parentCategory ||
          (Array.isArray(cat.parentCategory) &&
            cat.parentCategory.length === 0 &&
            cat.name.toLowerCase() === "phukien")
      );
      const accessoriesIdNew = accessoriesCategory
        ? accessoriesCategory._id
        : null;
      setAccessoriesCategoryId(accessoriesIdNew);
      console.log("Accessories Category ID:", accessoriesIdNew);

      const accessoriesResponse = await axios.get(`${API_URL}/phones/search`, {
        params: {
          limit: Limit * 10,
          isActive: "true",
          page: 1,
        },
      });
      console.log("Phones Response:", accessoriesResponse.data);
      if (accessoriesResponse.data.success) {
        const rawAccessories = accessoriesResponse.data.data || [];
        setAllAccessories(rawAccessories);
        console.log(
          "All Accessories:",
          rawAccessories.map((a) => ({
            _id: a._id,
            category: a.category?.name,
            slug: a.category?.slug,
            imageUrl: a.category?.imageUrl,
          }))
        );

        // let filteredAccessories = rawAccessories;
        // let filteredAccessories = rawAccessories.map((accessory) => ({
        //   ...accessory,
        //   categorySlug: accessory.category?.slug || null, // Sử dụng slug từ API
        //   imageUrl: accessory.category?.imageUrl || "path/to/default-image.jpg", // Sử dụng URL từ API
        // }));
        let filteredAccessories = rawAccessories.map((accessory) => {
          console.log("Processing accessory:", accessory);
          return {
            ...accessory,
            categorySlug:
              accessory.category?.slug ||
              (accessory.category?.name
                ? slugify(accessory.category.name, {
                    lower: true,
                    strict: true,
                  })
                : null),
            imageUrl:
              accessory.category?.imageUrl || "https://via.placeholder.com/64",
          };
        });

        if (!filter && !categoryId) {
          filteredAccessories = rawAccessories.filter((accessory) => {
            const accessoryCategoryName =
              accessory.category?.name?.toLowerCase() || "";
            console.log(
              "Filtering - Accessory Category:",
              accessoryCategoryName
            );
            return validCategories.includes(accessoryCategoryName);
          });
          // Xóa giới hạn slice, hiển thị tất cả sản phẩm hợp lệ
        } else if (
          filter &&
          typeof filter === "string" &&
          validCategories.includes(filter.toLowerCase())
        ) {
          const targetCategory = categoriesData.find(
            (cat) => cat.name.toLowerCase() === filter.toLowerCase()
          );
          const targetCategoryId = targetCategory ? targetCategory._id : null;
          console.log(
            "Target Category:",
            targetCategory,
            "ID:",
            targetCategoryId
          );
          if (targetCategoryId) {
            filteredAccessories = rawAccessories.filter((accessory) => {
              const accessoryCategoryId =
                accessory.category?._id?.toString() || "";
              return (
                accessoryCategoryId === targetCategoryId ||
                categoriesData.some(
                  (cat) =>
                    cat._id === accessoryCategoryId &&
                    cat.parentCategory?.some((p) => p._id === targetCategoryId)
                )
              );
            });
          }
        } else if (categoryId) {
          filteredAccessories = rawAccessories.filter((accessory) => {
            const accessoryCategoryId =
              accessory.category?._id?.toString() || "";
            return (
              accessoryCategoryId === categoryId ||
              categoriesData.some(
                (cat) =>
                  cat._id === accessoryCategoryId &&
                  cat.parentCategory?.some((p) => p._id === categoryId)
              )
            );
          });
        }
        console.log(
          "Filtered Accessories with slugs and imageUrl:",
          filteredAccessories.map((a) => ({
            _id: a._id,
            name: a.name,
            category: a.category?.name,
            slug: a.category?.slug,
            imageUrl: a.category?.imageUrl,
          }))
        );
        setAccessories(filteredAccessories);
        setTotalAccessories(filteredAccessories.length);
      } else {
        setError("Không thể tải danh sách sản phẩm.");
        setAccessories([]);
      }
    } catch (error) {
      console.error(
        "Error fetching categories and phones:",
        error.response ? error.response.data : error.message
      );
      setError("Lỗi kết nối đến server. Vui lòng kiểm tra API.");
      setAccessories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useEffect triggered with:", {
      selectedFilter,
      selectedCategoryId,
    });
    if (selectedCategoryId === null && selectedFilter === null) {
      setAccessories([]); // Xóa dữ liệu cũ trước khi fetch
      fetchAccessory();
    } else {
      fetchAccessory(selectedCategoryId, selectedFilter);
    }
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
      const normalizedCategoryName = (categoryName || "").toLowerCase().trim();
      console.log("Filtering by category:", normalizedCategoryName);
      if (!normalizedCategoryName) {
        setSelectedCategoryId(null);
        setSelectedFilter(null);
        setDisplayLimit(InitialDisplayLimit);
        setIsCategorySelected(false);
        setShowSubCategories(false);
        setAccessories([]); // Xóa dữ liệu cũ trước khi fetch
        await fetchAccessory(); // Lấy tất cả sản phẩm từ "camera", "thẻ nhớ", "router", "máy chiếu"
        return;
      }

      const targetCategory = categories.find(
        (cat) => cat.name.toLowerCase().trim() === normalizedCategoryName
      );
      let newCategoryId = targetCategory ? targetCategory._id : null;

      if (!newCategoryId && validCategories.includes(normalizedCategoryName)) {
        newCategoryId =
          categories.find(
            (cat) => cat.name.toLowerCase() === normalizedCategoryName
          )?._id || accessoriesCategoryId;
      }

      if (!newCategoryId || !validCategories.includes(normalizedCategoryName)) {
        setError(
          `Danh mục '${categoryName}' không hợp lệ. Chỉ chấp nhận 'camera', 'thẻ nhớ', 'router', hoặc 'máy chiếu'.`
        );
        return;
      }
      setSelectedCategoryId(newCategoryId);
      setSelectedFilter(normalizedCategoryName);
      setDisplayLimit(InitialDisplayLimit);
      setIsCategorySelected(true);
      setShowSubCategories(true);
      setAccessories([]); // Xóa dữ liệu cũ trước khi fetch
      await fetchAccessory(newCategoryId, normalizedCategoryName);
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
      setShowSubCategories(true);
      await fetchAccessory(selectedCategoryId, normalizedBrand);
    } catch (err) {
      console.error("Error in filterByBrand:", err);
      setError("Lỗi khi lọc theo thương hiệu.");
    } finally {
      setLoading(false);
    }
  };

  const getChildCategories = () => {
    if (!category || !accessoriesCategoryId) return [];
    const baseCategoryId = accessoriesCategoryId;

    return category
      .filter((cat) => {
        const parentIds = Array.isArray(cat.parentCategory)
          ? cat.parentCategory.map((p) => p._id || p)
          : [cat.parentCategory?._id || cat.parentCategory];
        return parentIds.includes(baseCategoryId);
      })
      .filter((cat) => cat._id !== baseCategoryId);
  };

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
    allAccessories,
  };
};

export default useAccessoryData;
