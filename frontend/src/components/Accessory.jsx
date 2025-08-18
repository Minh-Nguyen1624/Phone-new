// import React, { useState, useEffect, useRef } from "react";
// import { FaFilter } from "react-icons/fa";
// import { Link, useNavigate, useLocation } from "react-router-dom";
// import axios from "axios";
// import Header from "../components/Header";
// import MainProduct from "../components/MainProduct";
// import useAccessoryData from "../hooks/useAccessoryData";
// import AccessoryBrand from "../components/AccessoryBrand";
// import CameraSection from "./CameraSection";
// import "../css/Accessory.css";

// const API_URL = "http://localhost:8080/api";
// const Limit = 10;
// const InitialDisplayLimit = 8;

// const Accessory = () => {
//   const {
//     accessories,
//     loading,
//     error,
//     soldQuantities,
//     selectedCategoryId,
//     searchQuery,
//     category,
//     categoryMap,
//     brands: brand,
//     totalAccessories,
//     displayLimit,
//     isFilterVisible,
//     selectedBrandId,
//     isCategorySelected,
//     selectedFilter,
//     setSelectedFilter,
//     showSubCategories,
//     setShowSubCategories,
//     filterByCategory,
//     filterByBrand,
//     handleSearch,
//     purchasePhone,
//     getChildCategories,
//     loadMore,
//     toggleLike,
//     setAccessories,
//   } = useAccessoryData();

//   const navigate = useNavigate();
//   const location = useLocation();

//   // Bản ghi gỡ lỗi để kiểm tra props
//   console.log("Accessory Props:", {
//     showSubCategories,
//     loading,
//     accessories,
//     getChildCategories: getChildCategories(),
//   });

//   // Đảm bảo showSubCategories là true nếu có danh mục con
//   useEffect(() => {
//     const childCategories = getChildCategories();
//     if (childCategories.length > 0 && !showSubCategories && !loading) {
//       setShowSubCategories(true);
//     }
//   }, [showSubCategories, loading, getChildCategories, setShowSubCategories]);

//   return (
//     <>
//       <div className="header-top-bar">
//         <div className="banner-top">
//           <div className="item">
//             <a href="#" className="item-link">
//               <img src="//cdnv2.tgdd.vn/mwg-static/tgdd/Banner/3f/8d/3f8d409679edbe42ae3e1e908d62b630.png" />
//             </a>
//           </div>
//         </div>
//       </div>
//       <Header />
//       <div className="accessory-container">
//         <section className="accessory-menu">
//           <ul className="accessory-options">
//             <li>
//               <a>
//                 <img width="50" height="50" src="" />
//                 <span></span>
//                 <span></span>
//               </a>
//             </li>
//           </ul>
//         </section>

//         <div className="warpper-content">
//           <section className="accessory-products">
//             <h3 className="accessory-options-title">Phụ kiện nổi bật</h3>
//             <div className="accessory-products-list">
//               <div className="accessory-products-category">
//                 <a href="#" className="accessory-product-link">
//                   <img src="" alt="" width="64px" height="64px" />
//                   <h3></h3>
//                 </a>
//               </div>
//             </div>
//           </section>
//           <section className="category-brand">
//             <AccessoryBrand
//               accessories={accessories}
//               getChildCategories={getChildCategories}
//               isCategorySelected={isCategorySelected}
//               selectedFilter={selectedFilter}
//               selectedCategoryId={selectedCategoryId}
//               showSubCategories={showSubCategories}
//               filterByCategory={filterByCategory}
//               filterByBrand={filterByBrand}
//               setAccessories={setAccessories}
//               loading={loading}
//             />
//           </section>

//           <section className="accessory-products_camera">
//             <CameraSection
//               accessories={accessories}
//               category={category}
//               selectedFilter={selectedFilter}
//               selectedCategoryId={selectedCategoryId}
//               setAccessories={setAccessories}
//               loading={loading}
//               getChildCategories={getChildCategories}
//               showSubCategories={showSubCategories}
//             />
//           </section>
//         </div>
//       </div>
//     </>
//   );
// };
// export default Accessory;

import React, { useState, useEffect, useRef } from "react";
import { FaFilter } from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import MainProduct from "../components/MainProduct";
import useAccessoryData from "../hooks/useAccessoryData";
import AccessoryBrand from "../components/AccessoryBrand";
import CameraSection from "./CameraSection";
import "../css/Accessory.css";

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const Accessory = () => {
  const {
    accessories,
    loading,
    error,
    soldQuantities,
    selectedCategoryId,
    searchQuery,
    category,
    categoryMap,
    brands: brand,
    totalAccessories,
    displayLimit,
    isFilterVisible,
    selectedBrandId,
    isCategorySelected,
    selectedFilter,
    setSelectedFilter,
    showSubCategories,
    setShowSubCategories,
    filterByCategory,
    filterByBrand,
    handleSearch,
    purchasePhone,
    getChildCategories,
    loadMore,
    toggleLike,
    setAccessories,
  } = useAccessoryData();

  const navigate = useNavigate();
  const location = useLocation();

  // Bản ghi gỡ lỗi chi tiết
  console.log("Accessory Props:", {
    showSubCategories,
    loading,
    accessories: accessories.map((item, index) => ({
      id: item._id,
      name: item.name,
      category: item.category,
    })), // Log ngắn gọn
    getChildCategories: getChildCategories(),
    selectedFilter,
    selectedCategoryId,
  });

  // Đảm bảo showSubCategories là true nếu có danh mục con
  useEffect(() => {
    const childCategories = getChildCategories();
    console.log("Child Categories in useEffect:", childCategories); // Log danh mục con
    if (childCategories.length > 0 && !showSubCategories && !loading) {
      setShowSubCategories(true);
    }
  }, [showSubCategories, loading, getChildCategories, setShowSubCategories]);

  return (
    <>
      <div className="header-top-bar">
        <div className="banner-top">
          <div className="item">
            <a href="#" className="item-link">
              <img src="//cdnv2.tgdd.vn/mwg-static/tgdd/Banner/3f/8d/3f8d409679edbe42ae3e1e908d62b630.png" />
            </a>
          </div>
        </div>
      </div>
      <Header />
      <div className="accessory-container">
        <section className="accessory-menu">
          <ul className="accessory-options">
            <li>
              <a>
                <img width="50" height="50" src="" />
                <span></span>
                <span></span>
              </a>
            </li>
          </ul>
        </section>

        <div className="warpper-content">
          <section className="accessory-products">
            <h3 className="accessory-options-title">Phụ kiện nổi bật</h3>
            <div className="accessory-products-list">
              <div className="accessory-products-category">
                <a href="#" className="accessory-product-link">
                  <img src="" alt="" width="64px" height="64px" />
                  <h3></h3>
                </a>
              </div>
            </div>
          </section>
          <section className="category-brand">
            <AccessoryBrand
              accessories={accessories}
              getChildCategories={getChildCategories}
              isCategorySelected={isCategorySelected}
              selectedFilter={selectedFilter}
              selectedCategoryId={selectedCategoryId}
              showSubCategories={showSubCategories}
              filterByCategory={filterByCategory}
              filterByBrand={filterByBrand}
              setAccessories={setAccessories}
              loading={loading}
            />
          </section>

          <section className="accessory-products_camera">
            <CameraSection
              accessories={accessories}
              category={category}
              selectedFilter={selectedFilter}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
            />
          </section>
        </div>
      </div>
    </>
  );
};
export default Accessory;
