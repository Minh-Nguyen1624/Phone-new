import React, { useState } from "react";
import BackupChargerBanner from "./BackupChargerBanner";
import BackupChargerCategoryList from "./BackupChargerCategoryList";
import BackupChargerProductList from "./BackupChargerProductList";
import "../css/Accessory.css";

const BackupChargerSection = ({
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
    // return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
    let formatted = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    return formatted.replace(/mah/i, "mAh");
  };

  // Danh mục được phép
  const allowedCategories = [
    "10000mah",
    "20000mah",
    "dưới 300.000đ",
    "xmobile",
  ];

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
          <BackupChargerBanner />
          <aside className="camera-list">
            <BackupChargerCategoryList
              childCategories={childCategories}
              selectedFilter={selectedFilter}
              filterByCategory={filterByCategory}
              toCapitalize={toCapitalize}
              setSelectedFilter={setSelectedFilter}
            />
            <div className="prt-accessory">
              <div className="ajax-call">
                {filteredAccessories.length > 0 ? (
                  <BackupChargerProductList
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

export default BackupChargerSection;
