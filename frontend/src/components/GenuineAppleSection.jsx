import React, { useState } from "react";
import GenuineAppleBanner from "./GenuineAppleBanner";
import GenuineAppleCategoryList from "./GenuineAppleCategoryList";
import GenuineAppleProductList from "./GenuineAppleProductList";
import "../css/Accessory.css";

const GenuineAppleSection = ({
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
  };

  // Danh mục được phép
  const allowedCategories = ["tai nghe", "adapter sạc", "cáp sạc", "ốp lưng"];

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
          <GenuineAppleBanner />
          <aside className="camera-list">
            <GenuineAppleCategoryList
              childCategories={childCategories}
              selectedFilter={selectedFilter}
              filterByCategory={filterByCategory}
              toCapitalize={toCapitalize}
              setSelectedFilter={setSelectedFilter}
            />
            <div className="prt-accessory">
              <div className="ajax-call">
                {filteredAccessories.length > 0 ? (
                  <GenuineAppleProductList
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

export default GenuineAppleSection;
