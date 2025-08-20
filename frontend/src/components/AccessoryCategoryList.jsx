import React from "react";
import { FaCaretRight } from "react-icons/fa";
import "../css/Accessory.css";

const AccessoryCategoryList = ({
  childCategories,
  selectedFilter,
  filterByCategory,
  toCapitalize,
  selectedCategoryId,
}) => {
  console.log("SelectedFilter: ", selectedFilter);
  console.log("ChildCategories: ", childCategories);
  console.log("FilterByCategory: ", filterByCategory);
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
            return ["camera", "thẻ nhớ", "router", "máy chiếu"].includes(
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
              onClick={() => filterByCategory(cat.name)}
            >
              <a href="#">{toCapitalize(cat.name)}</a>
            </li>
          ))
      ) : (
        <p>Không có danh mục con để hiển thị</p>
      )}
      <div className="sell-all">
        <a href="#" className="accessory-all_products">
          Xem tất cả phụ kiện...
        </a>
        <FaCaretRight className="caret-icon" />
      </div>
    </ul>
  );
};

export default AccessoryCategoryList;
