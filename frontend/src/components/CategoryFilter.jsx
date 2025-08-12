import React from "react";
import { FaFilter } from "react-icons/fa";

const CategoryFilter = ({
  isCategorySelected,
  selectedFilter,
  selectedCategoryId,
  showSubCategories,
  getChildCategories,
  filterByCategory,
  filterByBrand,
  monitors,
  setMonitors,
  loading,
}) => {
  // Hàm viết hoa chữ cái đầu
  const toCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  console.log("Monitor: ", monitors);
  // Lấy danh sách thương hiệu từ danh mục con
  const childCategories = getChildCategories(selectedFilter);
  console.log(
    "Child Categories for selectedFilter:",
    selectedFilter,
    "selectedCategoryId:",
    selectedCategoryId,
    "Result:",
    childCategories
  );

  // Hàm xử lý lọc khi nhấn In 2 mặt (áp dụng cho tất cả danh mục)
  const handleDoubleSidedFilter = () => {
    console.log(
      "Monitors before filtering:",
      monitors.map((m) => ({ _id: m._id, brand: m.brand }))
    );
    const updatedMonitors = monitors.filter(
      (monitor) =>
        // monitor.productCategory?.toLowerCase() === "printer" &&
        monitor.category?.name.toLowerCase() === "printer" &&
        monitor.brand?.toLowerCase() !== "hprt" &&
        monitor.active !== false
    );
    console.log(
      "Filtered out HPRT, new length:",
      updatedMonitors.length,
      "Updated monitors:",
      updatedMonitors.map((m) => ({ _id: m._id, brand: m.brand }))
    );
    setMonitors(updatedMonitors);
  };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {console.log("Show Sub Categories: ", showSubCategories)}
      {showSubCategories && !loading && (
        <>
          <div className="cate-main-filter-1">
            <div
              className="brand-filters"
              style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
            >
              <button
                className="filter_brand-icon"
                style={{
                  borderWidth: "1px",
                  borderColor: "#939ee8",
                  borderStyle: "solid",
                }}
                onClick={() => {
                  console.log(
                    "Filter button clicked with selectedCategoryId:",
                    selectedCategoryId,
                    "selectedFilter:",
                    selectedFilter
                  );
                  if (selectedCategoryId && selectedFilter) {
                    filterByCategory(selectedFilter.toLowerCase().trim());
                  }
                }}
              >
                <FaFilter
                  className="filter-icon"
                  style={{ marginRight: "5px", color: "#939ee8" }}
                />
                <span className="filter-text">Lọc</span>
              </button>
              <button
                className="filter_brand"
                onClick={() => {
                  console.log(
                    "Clicked Tất cả with selectedCategoryId:",
                    selectedCategoryId
                  );
                  filterByCategory(null);
                }}
                style={{
                  backgroundColor:
                    !selectedCategoryId && !selectedFilter
                      ? "#939ee8"
                      : "transparent",
                  color:
                    !selectedCategoryId && !selectedFilter ? "#fff" : "#000",
                  padding: "5px 10px",
                  margin: "0 5px",
                  borderRadius: "5px",
                  border: "1px solid #939ee8",
                  height: "40px",
                }}
              >
                Tất cả
              </button>
            </div>
            <div
              className="category-buttons"
              style={{
                display: "flex",
                gap: "10px",
                marginLeft: "8px",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "13px",
              }}
            >
              {childCategories.map((cat) => (
                <button
                  key={cat._id}
                  className={`category-button ${
                    selectedFilter === cat.name.toLowerCase()
                      ? "selected-filter"
                      : ""
                  }`}
                  onClick={() => {
                    console.log("Filtering by brand:", cat.name.toLowerCase());
                    filterByBrand(cat.name.toLowerCase());
                    handleDoubleSidedFilter;
                  }}
                  style={{
                    backgroundColor:
                      selectedFilter === cat.name.toLowerCase()
                        ? "#939ee8"
                        : "#fff",
                    color:
                      selectedFilter === cat.name.toLowerCase()
                        ? "#fff"
                        : "#000",
                    marginLeft: "5px",
                    height: "40px",
                    marginTop: "4px",
                    padding: "5px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {loading && <p className="text-center text-gray-600">Đang tải...</p>}
    </div>
  );
};

export default CategoryFilter;
