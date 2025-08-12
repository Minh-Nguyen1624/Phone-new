import React from "react";

const OutstandingAccessories = ({
  isCategorySelected,
  selectedFilter,
  selectedCategoryId,
  getChildCategories,
  showSubCategories,
  filterByCategory,
  filterByBrand,
  accessories,
  setAccessories,
  loading,
}) => {
  // Hàm viết hoa chữ cái đầu
  const toCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };
};

export default OutstandingAccessories;
