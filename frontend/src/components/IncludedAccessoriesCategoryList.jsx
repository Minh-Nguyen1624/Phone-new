import React from "react";
import { FaCaretRight } from "react-icons/fa";
import "../css/Accessory.css";

const IncludedAccessoriesCategoryList = ({
  childCategories,
  selectedFilter,
  filterByCategory,
  toCapitalize,
  selectedCategoryId,
  setSelectedFilter,
}) => {
  const categoryNameMap = {
    "nổi bật": "Xem tất cả phụ kiện Laptop",
    chuột: "Xem tất cả chuột",
    "bàn phím": "Xem tất cả bàn phím",
    usb: "Xem tất cả USB",
    "túi chống sốc": "Xem tất cả túi chống sốc",
  };

  const allCategory = ["chuột", "bàn phím", "usb", "túi chống sốc"];

  const handleFilterClick = (event, categoryName) => {
    event.preventDefault();
    setSelectedFilter(categoryName);
  };

  const getAllText = () => {
    const filterKey = selectedFilter?.toLowerCase() || "nổi bật";
    return categoryNameMap[filterKey] || "Xem tất cả phụ kiện Laptop";
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
              className={`accessory-list-6 ${
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
      <div className="sell-all-3">
        <a href="#" className="accessory-all_products">
          {/* Xem tất cả phụ kiện Camera */}
          {getAllText()}
        </a>
        <FaCaretRight className="caret-icon" />
      </div>
    </ul>
  );
};

export default IncludedAccessoriesCategoryList;
