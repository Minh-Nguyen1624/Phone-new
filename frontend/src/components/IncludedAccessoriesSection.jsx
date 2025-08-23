import React, { useState } from "react";
import IncludedAccessoriesBanner from "./IncludedAccessoriesBanner";
import IncludedAccessoriesCategoryList from "./IncludedAccessoriesCategoryList";
import IncludedAccessoriesProductList from "./IncludedAccessoriesProductList";
import "../css/Accessory.css";

const IncludedAccessoriesSection = ({
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
  const allowedCategories = ["chuột", "bàn phím", "usb", "túi chống sốc"];

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
          <IncludedAccessoriesBanner />
          <aside className="camera-list">
            <IncludedAccessoriesCategoryList
              childCategories={childCategories}
              selectedFilter={selectedFilter}
              filterByCategory={filterByCategory}
              toCapitalize={toCapitalize}
              setSelectedFilter={setSelectedFilter}
            />
            <div className="prt-accessory">
              <div className="ajax-call">
                {filteredAccessories.length > 0 ? (
                  <IncludedAccessoriesProductList
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

export default IncludedAccessoriesSection;
