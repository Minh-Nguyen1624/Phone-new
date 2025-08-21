import React from "react";
import { FaCaretRight } from "react-icons/fa";
import "../css/Accessory.css";

const EarphoneCategoryList = ({
  childCategories,
  selectedFilter,
  filterByCategory,
  toCapitalize,
  selectedCategoryId,
  setSelectedFilter,
}) => {
  // console.log("SelectedFilter: ", selectedFilter);
  // console.log("ChildCategories: ", childCategories);
  // console.log("FilterByCategory: ", filterByCategory);
  // console.log("SelectedFilter in AccessoryCategoryList: ", selectedFilter);
  // console.log("ChildCategories: ", childCategories);

  const handleFilterClick = (categoryName) => {
    setSelectedFilter(categoryName);
  };
  return (
    <ul className="accessory-block_products">
      <li
        className={`accessory-list ${
          !selectedFilter && !selectedCategoryId ? "active" : ""
        }`}
      >
        <a href="#" onClick={() => filterByCategory(null)}>
          Nổi bật
        </a>
      </li>
      {childCategories.length > 0 ? (
        childCategories
          .filter((cats) => {
            const categoryName = cats.name.toLowerCase();
            return ["bluetooth", "có dây", "chụp tai", "xiaomi"].includes(
              categoryName
            );
          })
          .map((cat) => (
            <li
              key={cat._id}
              className={`accessory-list-1 ${
                Array.isArray(selectedFilter) &&
                selectedFilter.includes(cat.name.toLowerCase())
                  ? "accessory-list"
                  : ""
              }`}
              // onClick={() => filterByCategory(cat.name)}
              onClick={() => handleFilterClick(cat.name)}
            >
              <a href="#">{toCapitalize(cat.name)}</a>
            </li>
          ))
      ) : (
        <p>Không có danh mục con để hiển thị</p>
      )}
      <div className="sell-all">
        <a href="#" className="accessory-all_products">
          Xem tất cả phụ kiện Tai Nghe
        </a>
        <FaCaretRight className="caret-icon" />
      </div>
    </ul>
  );
};

export default EarphoneCategoryList;
