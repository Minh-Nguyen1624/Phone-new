import React from "react";
import { FaCaretRight } from "react-icons/fa";
import "../css/Accessory.css";

const BackupChargerCategoryList = ({
  childCategories,
  selectedFilter,
  filterCategory,
  selectedCategoryId,
  setSelectedFilter,
  toCapitalize,
}) => {
  const categoryNameMap = {
    "nổi bật": "Xem tất cả phụ kiện Pin sạc",
    "10000mah": "Xem tất cả pin sạc 10000mah",
    "20000mah": "Xem tất cả pin sạc 20000mah",
    "dưới 300.000đ": "Xem tất cả pin sạc Dưới 300.000đ",
    xmobile: "Xem tất cả pin sạc Xmobile",
  };

  const allCategory = ["10000mah", "20000mah", "dưới 300.000đ", "xmobile"];

  const handleFilterClick = (event, categoryName) => {
    event.preventDefault();
    setSelectedFilter(categoryName);
  };

  const getAllText = () => {
    const filterKey = selectedFilter?.toLowerCase() || "nổi bật";
    return categoryNameMap[filterKey] || "Xem tất cả phụ kiện Pin sạc";
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
              !selectedCategoryId && !selectedFilter ? "#333333" : "#ffffff",
            color:
              !selectedCategoryId && !selectedFilter ? "#ffffff" : "#333333",
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
              className={`accessory-list-2 ${
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
                  letterSpacing: "-0.04em",
                  width: "100%",
                }}
              >
                {toCapitalize(cat.name)}
              </a>
            </li>
          ))
      ) : (
        <p>Không có danh mục con để hiển thị</p>
      )}
      <div className="sell-all-1">
        <a href="#" className="accessory-all_products">
          {/* Xem tất cả phụ kiện Pin sạc */}
          {getAllText()}
        </a>
        <FaCaretRight className="caret-icon" />
      </div>
    </ul>
  );
};

export default BackupChargerCategoryList;
