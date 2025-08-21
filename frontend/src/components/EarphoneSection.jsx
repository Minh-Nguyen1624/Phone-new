import React, { useState } from "react";
import EarphoneBanner from "./EarphoneBanner";
import EarphoneCategoryList from "./EarphoneCategoryList";
import EarphoneProductList from "./EarphoneProductList";
import "../css/Accessory.css";

const EarphoneSection = ({
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
  const allowedCategories = ["bluetooth", "có dây", "chụp tai", "xiaomi"];

  // Chỉ lọc khi có selectedFilter, nếu không thì sử dụng toàn bộ accessories
  const filteredAccessories = selectedFilter
    ? accessories.filter((item) => {
        const itemCategoryName = item?.category?.name?.toLowerCase() || "";
        return itemCategoryName === selectedFilter.toLowerCase();
      })
    : accessories.filter((item) => {
        const itemCategoryName = item?.category?.name?.toLowerCase() || "";
        return allowedCategories.includes(itemCategoryName);
      }); // Hiển thị tất cả accessories từ danh mục con

  const [showSub, setShowSub] = useState(false);
  const childCategories = getChildCategories();

  const shouldRender =
    showSubCategories || (childCategories.length > 0 && !loading);

  return (
    <>
      {shouldRender && !loading && (
        <div className="camera-section">
          <EarphoneBanner />
          <aside className="camera-list">
            <EarphoneCategoryList
              childCategories={childCategories}
              selectedFilter={selectedFilter}
              filterByCategory={filterByCategory}
              toCapitalize={toCapitalize}
              setSelectedFilter={setSelectedFilter}
            />
            <div className="prt-accessory">
              <div className="ajax-call">
                {filteredAccessories.length > 0 ? (
                  <EarphoneProductList
                    accessories={filteredAccessories}
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

export default EarphoneSection;
