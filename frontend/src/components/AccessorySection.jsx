import React, { useState } from "react";
import AccessoryBanner from "./AccessoryBanner";
import AccessoryCategoryList from "./AccessoryCategoryList";
import AccessoryProductList from "./AccessoryProductList";
import "../css/Accessory.css";

const AccessorySection = ({
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

  console.log("Selected Filter: ", selectedFilter);
  // Chỉ lọc khi có selectedFilter, nếu không thì sử dụng toàn bộ accessories
  const filteredAccessories = selectedFilter
    ? accessories.filter((item) => {
        const itemCategoryName = item?.category?.name?.toLowerCase() || "";
        return itemCategoryName === selectedFilter.toLowerCase();
      })
    : accessories; // Hiển thị tất cả accessories từ danh mục con
  console.log("Filtered Accessories in AccessorySection:", filteredAccessories);

  const [showSub, setShowSub] = useState(false);
  const childCategories = getChildCategories();

  const shouldRender =
    showSubCategories || (childCategories.length > 0 && !loading);

  return (
    <>
      {shouldRender && !loading && (
        <div className="camera-section">
          <AccessoryBanner />
          <aside className="camera-list">
            <AccessoryCategoryList
              childCategories={childCategories}
              selectedFilter={selectedFilter}
              filterByCategory={filterByCategory}
              toCapitalize={toCapitalize}
            />
            <div className="prt-accessory">
              <div className="ajax-call">
                {filteredAccessories.length > 0 ? (
                  <AccessoryProductList
                    // accessories={
                    //   filteredAccessories.length > 0
                    //     ? filteredAccessories
                    //     : allAccessories
                    // }
                    // soldQuantities={soldQuantities}
                    accessories={accessories}
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

export default AccessorySection;
