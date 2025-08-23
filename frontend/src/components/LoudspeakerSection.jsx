import React, { useState } from "react";
import LoudspeakerBanner from "./LoudspeakerBanner";
import LoudspeakerCategoryList from "./LoudspeakerCategoryList";
import LoudspeakerProductList from "./LoudspeakerProductList";
import "../css/Accessory.css";

const LoudspeakerSection = ({
  accessories,
  allAccessories,
  category,
  selectedFilter,
  selectedCategoryId,
  setAccessories,
  loading,
  getChildCategories,
  showSubCategories,
  setSelectedFilter,
  soldQuantities,
  toggleLike,
  purchasePhone,
  filterByCategory,
}) => {
  const toCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
    // let formatted = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    // return formatted.replace(/jbl/i, "JBL");
  };

  // Danh mục được phép
  const allowedCategories = ["loa bluetooth", "loa vi tính", "jbl", "sony"];

  // Lọc sản phẩm: chỉ giữ các sản phẩm thuộc allowedCategories
  const filteredAccessories = selectedFilter
    ? accessories.filter((item) => {
        const itemCategoryName = item?.category?.name?.toLowerCase() || "";
        return (
          itemCategoryName === selectedFilter.toLowerCase() &&
          allowedCategories.includes(itemCategoryName)
        );
      })
    : accessories.filter((item) => {
        const itemCategoryName = item?.category?.name?.toLowerCase() || "";
        return allowedCategories.includes(itemCategoryName);
      });

  const [showSub, setShowSub] = useState(false);
  const childCategories = getChildCategories();

  const shouldRender =
    showSubCategories || (childCategories.length > 0 && !loading);

  return (
    <>
      {shouldRender && !loading && (
        <div className="camera-section">
          <LoudspeakerBanner />
          <aside className="camera-list">
            <LoudspeakerCategoryList
              childCategories={childCategories}
              selectedFilter={selectedFilter}
              filterByCategory={filterByCategory}
              toCapitalize={toCapitalize}
              setSelectedFilter={setSelectedFilter}
            />
            <div className="prt-accessory">
              <div className="ajax-call">
                {filteredAccessories.length > 0 ? (
                  <LoudspeakerProductList
                    accessories={filteredAccessories} // Sử dụng filteredAccessories thay vì accessories
                    soldQuantities={soldQuantities}
                  />
                ) : (
                  <div className="no-products-message">Chưa có sản phẩm</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default LoudspeakerSection;
