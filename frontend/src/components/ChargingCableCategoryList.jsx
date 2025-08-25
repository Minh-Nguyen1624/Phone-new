import React from "react";
import { FaCaretRight } from "react-icons/fa";
import "../css/Accessory.css";

const ChargingCableCategoryList = ({
  childCategories,
  selectedFilter,
  filterCategory,
  toCapitalize,
  selectedCategoryId,
  setSelectedFilter,
}) => {
  const categoryNameMap = {
    "nổi bật": "Xem tất cả phụ kiện Cáp sạc",
    lightning: "Xem tất cả cáp Lightning",
    "adapter type-c": "Xem tất cả adapter type-c",
    "adapter usb": "Xem tất cả adapter usb",
    "cáp type-c": "Xem tất cả cáp type c",
  };

  const allCategory = [
    "adapter usb",
    "lightning",
    "cáp type-c",
    "adapter type-c",
  ];

  const defaultFunctionType = (event) => {
    event.preventDefault();
  };

  const handleFilterClick = (event, categoryName) => {
    event.preventDefault();
    setSelectedFilter(categoryName);
    // if (filterByCategory) {
    //   filterByCategory(categoryName);
    // }
  };

  // Xác định nội dung "Xem tất cả" dựa trên selectedFilter
  const getAllText = () => {
    const filterKey = selectedFilter?.toLowerCase() || "nổi bật";
    return categoryNameMap[filterKey] || "Xem tất cả Camera";
  };

  return (
    <ul className="accessory-block_products">
      <li
        className={`accessory-list ${
          !selectedFilter && !selectedCategoryId ? "active" : ""
        }`}
        onClick={(e) => handleFilterClick(e, "nổi bật")}
      >
        <a
          href="#"
          style={{
            backgroundColor:
              !selectedCategoryId && !selectedFilter ? "#333333" : "#fff",
            color: !selectedCategoryId && !selectedFilter ? "#fff" : "#333333",
            borderRadius: "5px",
          }}
        >
          Nổi bật
        </a>
      </li>
      {childCategories.length > 0 ? (
        childCategories
          .filter((cats) => {
            const categoryName = cats.name.toLowerCase();
            return allCategory.includes(categoryName);
          })
          .map((cat) => (
            <li
              key={cat._id}
              className={`accessory-list-5 ${
                Array.isArray(selectedFilter) &&
                selectedFilter.includes(cat.name.toLowerCase())
                  ? "accessory-list"
                  : ""
              }`}
              // onClick={() => filterByCategory(cat.name)}
              onClick={(e) => handleFilterClick(e, cat.name)}
            >
              <a
                href="#"
                style={{
                  backgroundColor:
                    selectedFilter === cat.name.toLowerCase()
                      ? "#333333"
                      : "#fff",
                  color:
                    selectedFilter === cat.name.toLowerCase()
                      ? "#fff"
                      : "#333333",
                  borderRadius: "5px",
                  fontWeight:
                    selectedFilter === cat.name.toLowerCase() ? "bold" : "",
                }}
              >
                {toCapitalize(cat.name)}
              </a>
            </li>
          ))
      ) : (
        <p>Không có danh mục con để hiển thị</p>
      )}
      <div className="sell-all-2">
        <a
          href="#"
          className="accessory-all_products"
          onClick={defaultFunctionType}
        >
          {/* Xem tất cả phụ kiện Camera */}
          {getAllText()}
        </a>
        <FaCaretRight className="caret-icon" />
      </div>
    </ul>
  );
};

export default ChargingCableCategoryList;
