import { useState, useEffect } from "react";
import axios from "axios";

// Hàm viết hoa chữ cái đầu
const toCapitalize = (str) => {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
};

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const useMonitorData = () => {
  const [monitors, setMonitors] = useState([]);
  const [soldQuantities, setSoldQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [brands, setBrands] = useState([]);
  const [totalMonitors, setTotalMonitors] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(InitialDisplayLimit);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [isCategorySelected, setIsCategorySelected] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [showSubCategories, setShowSubCategories] = useState(false);

  const categoryAliases = {
    "màn hình máy tính": "computer-screen",
    "máy tính để bàn": "desktop-computer",
    "giá treo màn hình": "screen-mount",
    "máy in": "printer",
    "mực in": "printing ink",
    "giấy in": "printing paper",
    "máy chơi game cầm tay": "handheld gaming device",
  };

  const fetchMonitors = async (categoryId = null, brand = null) => {
    try {
      setLoading(true);
      setError(null);

      const categoryResponse = await axios.get(
        `${API_URL}/categorys/all?isActive=true`
      );
      console.log("Danh sách danh mục từ API:", categoryResponse.data.data);
      if (!categoryResponse.data.success) {
        throw new Error(
          "Không thể tải danh sách danh mục: " + categoryResponse.data.message
        );
      }

      const categoryData = categoryResponse.data.data || [];
      const uniqueCategories = [
        ...new Map(categoryData.map((item) => [item._id, item])).values(),
      ];
      const map = {};
      uniqueCategories.forEach((cat) => {
        if (cat.name) map[cat.name.toLowerCase().trim()] = cat._id;
      });
      setCategoryMap(map);
      setCategory(uniqueCategories);

      const allowedCategories = [
        "computer-screen",
        "desktop-computer",
        "screen-mount",
        "printer",
        "printing ink",
        "printing paper",
        "handheld gaming device",
      ];
      const availableCategories = uniqueCategories
        .filter(
          (cat) =>
            cat.name &&
            allowedCategories.includes(cat.name.toLowerCase().trim())
        )
        .map((cat) => ({
          id: cat._id,
          name: cat.name.toLowerCase().trim(),
        }));

      const categoryIds = categoryId
        ? [categoryId]
        : availableCategories.map((cat) => cat.id).filter((id) => id);

      if (categoryIds.length === 0) {
        throw new Error(
          "Không tìm thấy danh mục monitor nào trong dữ liệu API."
        );
      }

      let allMonitorData = [];
      for (const catId of categoryIds) {
        const params = {
          limit: Limit * 10,
          isActive: true,
          page: 1,
          category: catId,
        };
        console.log("API Params:", params);
        const monitorResponse = await axios.get(`${API_URL}/phones/search`, {
          params,
        });
        if (monitorResponse.data.data && monitorResponse.data.data.length > 0) {
          allMonitorData = [...allMonitorData, ...monitorResponse.data.data];
        }
      }

      console.log(
        "All Monitor Data length:",
        allMonitorData.length,
        "Sample:",
        allMonitorData.slice(0, 2)
      );

      const filterMonitors = allMonitorData.filter((monitor) => {
        const categoryName = monitor.category?.name?.toLowerCase() || "";
        const brandName = monitor.brand?.toLowerCase() || "";
        return !(
          categoryName.includes("smartphone") ||
          categoryName.includes("laptop") ||
          brandName.includes("smartphone") ||
          brandName.includes("laptop")
        );
      });

      let filteredMonitors = filterMonitors;

      const normalizedSelectedFilter = selectedFilter?.toLowerCase().trim();
      const normalizedBrand = brand?.toLowerCase().trim();

      // 1. Nếu có brand được truyền vào
      if (normalizedBrand) {
        console.log("Brand provided:", normalizedBrand);

        if (normalizedBrand === "in 2 mặt") {
          // logic đặc biệt cho "in 2 mặt": chỉ lấy printer và loại bỏ hprt
          filteredMonitors = filterMonitors.filter(
            (m) =>
              m.category?.name?.toLowerCase() === "printer" &&
              m.brand?.toLowerCase() !== "hprt"
          );
        } else {
          // lọc theo brand bình thường
          filteredMonitors = filterMonitors.filter(
            (m) => m.brand?.toLowerCase() === normalizedBrand
          );
        }
      }
      // 2. Nếu không có brand nhưng có categoryId
      else if (categoryId) {
        filteredMonitors = filterMonitors.filter(
          (monitor) =>
            monitor.category &&
            (monitor.category._id || monitor.category) === categoryId
        );
      }
      // 3. Nếu không có brand / categoryId nhưng có selectedFilter
      else if (normalizedSelectedFilter) {
        console.log("SelectedFilter used:", normalizedSelectedFilter);

        const mainCategories = [
          "màn hình máy tính",
          "máy tính để bàn",
          "giá treo màn hình",
          "máy in",
          "mực in",
          "giấy in",
          "mày chơi game cầm tay",
        ];

        if (mainCategories.includes(normalizedSelectedFilter)) {
          // là một category chính
          const targetCategoryKey =
            categoryAliases[normalizedSelectedFilter] ||
            normalizedSelectedFilter;
          const targetCategory = uniqueCategories.find(
            (cat) =>
              cat.name && cat.name.toLowerCase().trim() === targetCategoryKey
          );
          if (targetCategory) {
            filteredMonitors = filterMonitors.filter(
              (m) =>
                m.category &&
                (m.category._id || m.category) === targetCategory._id
            );
          }
        } else if (normalizedSelectedFilter === "in 2 mặt") {
          // logic đặc biệt nếu user chọn "in 2 mặt" như selectedFilter
          filteredMonitors = filterMonitors.filter(
            (m) =>
              m.category?.name?.toLowerCase() === "printer" &&
              m.brand?.toLowerCase() !== "hprt"
          );
        } else {
          // fallback coi như brand
          filteredMonitors = filterMonitors.filter(
            (m) => m.brand?.toLowerCase() === normalizedSelectedFilter
          );
        }
      }

      console.log(
        "Final Filtered Monitors length:",
        filteredMonitors.length,
        "Final Filtered Monitors:",
        filteredMonitors.map((m) => ({ _id: m._id, brand: m.brand }))
      );

      if (!filteredMonitors || filteredMonitors.length === 0) {
        console.warn("No monitors found after filtering. Reasons:", {
          selectedFilter,
          brand,
          categoryId,
          allMonitorDataLength: allMonitorData.length,
          availableCategories: availableCategories.map((cat) => cat.name),
          sampleMonitor: allMonitorData.filter(
            (cat) =>
              cat.category?.name?.toLowerCase() === "printer" &&
              cat.brand?.toLowerCase() !== "hprt"
          ),
        });
        filteredMonitors = filterMonitors; // Fallback
      }

      const validMonitors = filteredMonitors.filter(
        (m) => m && m._id && typeof m._id === "string"
      );
      console.log(
        "Valid Monitors length:",
        validMonitors.length,
        "Valid Monitors:",
        validMonitors.map((m) => ({ _id: m._id, brand: m.brand }))
      );

      setTotalMonitors(validMonitors.length);
      setMonitors(validMonitors);

      const monitorIds = validMonitors
        .map((monitor) => monitor._id)
        .filter((id) => id);
      const quantities = {};
      await Promise.all(
        monitorIds.map(async (id) => {
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
    } catch (error) {
      console.error("Error in fetchMonitors:", error);
      setError(
        "Lỗi khi tải dữ liệu: " +
          (error.response?.data?.message || error.message)
      );
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
        await fetchMonitors();
        return;
      }

      if (
        ![
          "màn hình máy tính",
          "máy tính để bàn",
          "giá treo màn hình",
          "máy in",
          "mực in",
          "giấy in",
          "máy chơi game cầm tay",
        ].includes(normalizedCategoryName)
      ) {
        setError(
          "Chỉ hỗ trợ lọc 'màn hình máy tính', 'máy tính để bàn' hoặc 'giá treo màn hình'."
        );
        setLoading(false);
        return;
      }

      const targetCategoryKey =
        categoryAliases[normalizedCategoryName] || normalizedCategoryName;
      const targetCategory = category.find(
        (cat) => cat.name && cat.name.toLowerCase().trim() === targetCategoryKey
      );
      let newCategoryId = targetCategory ? targetCategory._id : null;

      if (!newCategoryId && categoryMap[targetCategoryKey]) {
        newCategoryId = categoryMap[targetCategoryKey];
      }

      if (!newCategoryId) {
        setError(
          `Danh mục '${categoryName}' không được hỗ trợ. Vui lòng kiểm tra dữ liệu từ API /categorys/all.`
        );
        setLoading(false);
        return;
      }

      setSelectedCategoryId(newCategoryId);
      setSelectedFilter(categoryName);
      setDisplayLimit(InitialDisplayLimit);
      setIsCategorySelected(true);
      setShowSubCategories(true);
      await fetchMonitors(newCategoryId);
    } catch (error) {
      console.error("Error in filterByCategory:", error);
      setError("Lỗi khi lọc sản phẩm theo danh mục.");
    } finally {
      setLoading(false);
    }
  };

  const filterByBrand = async (brand) => {
    try {
      console.log("Brand: ", brand);
      setLoading(true);
      const normalizedBrand = brand.toLowerCase().trim();
      console.log("Filtering by brand:", normalizedBrand);

      if (!normalizedBrand) {
        setError("Vui lòng chọn một thương hiệu hợp lệ.");
        setLoading(false);
        return;
      }

      setSelectedFilter(normalizedBrand);
      setDisplayLimit(InitialDisplayLimit);
      setIsCategorySelected(true);
      await fetchMonitors(selectedCategoryId, normalizedBrand);
    } catch (error) {
      console.error("Error in filterByBrand:", error);
      setError("Lỗi khi lọc sản phẩm theo thương hiệu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDoubleSidedFilter = async () => {
    if (!monitors || !Array.isArray(monitors) || monitors.length === 0) {
      console.error("Error: monitors is empty or not an array", { monitors });
      return;
    }
    console.log(
      "Monitors before filtering (DoubleSided):",
      monitors.map((m) => ({ _id: m._id, brand: m.brand }))
    );
    const updatedMonitors = monitors.filter(
      (monitor) =>
        // monitor.productCategory?.toLowerCase() === "printer" &&
        monitor.category?.name?.toLowerCase() === "printer" &&
        monitor.brand?.toLowerCase() !== "hprt"
    );
    console.log(
      "Filtered out HPRT, new length (DoubleSided):",
      updatedMonitors.length,
      "Updated monitors:",
      updatedMonitors.map((m) => ({ _id: m._id, brand: m.brand }))
    );
    setMonitors(updatedMonitors);
    setTotalMonitors(updatedMonitors.length);
  };

  const handleSearch = async (query) => {
    try {
      console.log("handleSearch called with query:", query);
      setLoading(true);
      setSearchQuery(query);
      setDisplayLimit(InitialDisplayLimit);
      await fetchMonitors();
    } catch (error) {
      console.error("Error in handleSearch:", error);
      setError("Lỗi khi tìm kiếm sản phẩm.");
    } finally {
      setLoading(false);
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
      await fetchMonitors();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi mua hàng.");
      console.error("Error purchasing phone:", err);
    }
  };

  const getChildCategories = (filter) => {
    if (!category || !categoryMap) return [];
    const parentCategory = category.find(
      (cat) => cat._id === selectedCategoryId
    );
    if (!parentCategory) {
      const parentCategoryName =
        filter === "máy tính để bàn"
          ? "desktop-computer"
          : filter === "máy in"
          ? "printer"
          : "computer-screen";
      const fallbackCategory = category.find(
        (cat) =>
          cat.name && cat.name.toLowerCase().trim() === parentCategoryName
      );
      if (!fallbackCategory) return [];
      return category
        .filter((cat) =>
          cat.parentCategory?.some(
            (parent) => parent._id === fallbackCategory._id
          )
        )
        .filter(
          (cat) =>
            cat.name &&
            cat.name.toLowerCase() !== fallbackCategory.name.toLowerCase()
        );
    }
    return category
      .filter((cat) =>
        cat.parentCategory?.some((parent) => parent._id === parentCategory._id)
      )
      .filter(
        (cat) =>
          cat.name &&
          cat.name.toLowerCase() !== parentCategory.name.toLowerCase()
      );
  };

  const loadMore = () => {
    setDisplayLimit((prevLimit) => prevLimit + InitialDisplayLimit);
  };

  useEffect(() => {
    console.log("useEffect triggered with:", {
      searchQuery,
      selectedCategoryId,
    });
    // fetchMonitors();
    fetchMonitors(selectedCategoryId);
  }, [searchQuery, selectedCategoryId]);

  return {
    monitors,
    soldQuantities,
    loading,
    error,
    selectedCategoryId,
    searchQuery,
    category,
    categoryMap,
    brands,
    totalMonitors,
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
    handleDoubleSidedFilter,
    setMonitors,
  };
};

export default useMonitorData;
