import React, { useState, useEffect, useRef } from "react";
import { FaFilter } from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import MainProduct from "../components/MainProduct";
import useAccessoryData from "../hooks/useAccessoryData";
import AccessoryBrand from "../components/AccessoryBrand";
import AccessorySection from "./AccessorySection";
import "../css/Accessory.css";
import EarphoneSection from "./EarphoneSection";
import BackupChargerSection from "./BackupChargerSection";
import GenuineAppleSection from "./GenuineAppleSection";
import LoudspeakerSection from "./LoudspeakerSection";
import ChargingCableSection from "./ChargingCableSection";
import IncludedAccessoriesSection from "./IncludedAccessoriesSection";
import OutstandingAccessories from "./OutstandingAccessories";

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
    allAccessories, // Thêm allAccessories từ useAccessoryData
  } = useAccessoryData();

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedFilterTop, setSelectedFilterTop] = useState(null);
  const [selectedFilterBottom, setSelectedFilterBottom] = useState(null);
  const [selectedFilterBackupCharger, setSelectedFilterBackupCharger] =
    useState(null);
  const [selectedFilterGenuineApple, setSelectedFilterGenuineApple] =
    useState(null);
  const [selectedFilterLoudspeaker, setSelectedFilterLoudspeaker] =
    useState(null);
  const [selectedFilterChargingCable, setSelectedFilterChargingCable] =
    useState(null);
  const [
    selectedFilterIncludedAccessories,
    setSelectedFilterIncludedAccessories,
  ] = useState(null);

  // Danh mục cho phần trên
  const allowedCategoriesTop = ["camera", "máy chiếu", "router", "thẻ nhớ"];
  // Danh mục cho phần dưới
  const allowedCategoriesBottom = ["xiaomi", "bluetooth", "có dây", "chụp tai"];
  // Danh mục cho phần backup charger
  const allowedCategoriesBackupCharger = [
    "10000mah",
    "20000mah",
    "dưới 300.000đ",
    "xmobile",
  ];

  const allowedCategoriesGenuineApple = [
    "tai nghe",
    "adapter sạc",
    "cáp sạc",
    "ốp lưng",
  ];

  const allowedCategoriesLoudspeaker = [
    "loa bluetooth",
    "loa vi tính",
    "jbl",
    "sony",
  ];

  const allowedCategoriesChargingCable = [
    "lightning",
    "adapter type-c",
    "adapter usb",
    "cáp type-c",
  ];

  const allowedCategoriesIncludedAccessories = [
    "chuột",
    "bàn phím",
    "usb",
    "túi chống sốc",
  ];

  // Bản ghi gỡ lỗi chi tiết
  console.log("Accessory Props:", {
    showSubCategories,
    loading,
    accessories: accessories.map((item, index) => ({
      id: item?._id,
      name: item?.name,
      category: item?.category,
    })), // Sử dụng optional chaining để tránh lỗi
    allAccessories: allAccessories.map((item, index) => ({
      id: item?._id,
      name: item?.name,
      category: item?.category,
    })), // Log allAccessories để debug
    getChildCategories: getChildCategories(),
    selectedFilter,
    selectedCategoryId,
  });

  const handleFilterCategoriesTop = (filter) => {
    if (allowedCategoriesTop.includes(filter.toLowerCase())) {
      setSelectedFilterTop(filter);
    } else {
      setSelectedFilterTop(null);
    }
  };

  const handleFilterCategoriesBottom = (filter) => {
    if (allowedCategoriesBottom.includes(filter.toLowerCase())) {
      setSelectedFilterBottom(filter);
    } else {
      setSelectedFilterBottom(null);
    }
  };

  const handleFilterCategoriesBackupCharger = (filter) => {
    if (allowedCategoriesBackupCharger.includes(filter.toLowerCase())) {
      setSelectedFilterBackupCharger(filter);
    } else {
      setSelectedFilterBackupCharger(null);
    }
  };

  const handleFilterCategoriesGenuineApple = (filter) => {
    if (allowedCategoriesGenuineApple.includes(filter.toLowerCase())) {
      setSelectedFilterGenuineApple(filter);
    } else {
      setSelectedFilterGenuineApple(null);
    }
  };

  const handleFilterCategoriesLoudspeaker = (filter) => {
    if (allowedCategoriesLoudspeaker.includes(filter.toLowerCase())) {
      setSelectedFilterLoudspeaker(filter);
    } else {
      setSelectedFilterLoudspeaker(null);
    }
  };

  const handleFilterCategoriesChargingCable = (filter) => {
    if (allowedCategoriesChargingCable.includes(filter.toLowerCase())) {
      setSelectedFilterChargingCable(filter);
    } else {
      setSelectedFilterChargingCable(null);
    }
  };

  const handleFilterCategoriesIncludedAccessories = (filter) => {
    if (allowedCategoriesIncludedAccessories.includes(filter.toLowerCase())) {
      setSelectedFilterIncludedAccessories(filter);
    } else {
      setSelectedFilterIncludedAccessories(null);
    }
  };

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
            {/* <div className="accessory-products-list">
              <div className="accessory-products-category">
                <a href="#" className="accessory-product-link">
                  <OutstandingAccessories
                    accessories={accessories}
                    selectedCategoryId={selectedCategoryId}
                  />
                </a>
              </div>
              
            </div> */}
            <OutstandingAccessories
              accessories={accessories}
              selectedCategoryId={selectedCategoryId}
            />
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
            <AccessorySection
              accessories={accessories}
              allAccessories={allAccessories} // Truyền allAccessories
              category={category}
              // selectedFilter={selectedFilter}
              selectedFilter={selectedFilterTop}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
              soldQuantities={soldQuantities}
              toggleLike={toggleLike}
              purchasePhone={purchasePhone}
              filterByCategory={filterByCategory}
              setSelectedFilter={handleFilterCategoriesTop}
            />
          </section>

          <section className="accessory-products_earphone">
            <EarphoneSection
              accessories={accessories}
              allAccessories={allAccessories} // Truyền allAccessories
              category={category}
              // selectedFilter={selectedFilter}
              selectedFilter={selectedFilterBottom}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
              soldQuantities={soldQuantities}
              toggleLike={toggleLike}
              purchasePhone={purchasePhone}
              filterByCategory={filterByCategory}
              setSelectedFilter={handleFilterCategoriesBottom}
            />
          </section>

          <section className="accessory-products_backup-charger">
            <BackupChargerSection
              accessories={accessories}
              allAccessories={allAccessories} // Truyền allAccessories
              category={category}
              // selectedFilter={selectedFilter}
              selectedFilter={selectedFilterBackupCharger}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
              soldQuantities={soldQuantities}
              toggleLike={toggleLike}
              purchasePhone={purchasePhone}
              filterByCategory={filterByCategory}
              setSelectedFilter={handleFilterCategoriesBackupCharger}
            />
          </section>

          <section className="accessory-products_backup-charger">
            <GenuineAppleSection
              accessories={accessories}
              allAccessories={allAccessories} // Truyền allAccessories
              category={category}
              // selectedFilter={selectedFilter}
              selectedFilter={selectedFilterGenuineApple}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
              soldQuantities={soldQuantities}
              toggleLike={toggleLike}
              purchasePhone={purchasePhone}
              filterByCategory={filterByCategory}
              setSelectedFilter={handleFilterCategoriesGenuineApple}
            />
          </section>
          <section className="accessory-products_backup-charger">
            <LoudspeakerSection
              accessories={accessories}
              allAccessories={allAccessories} // Truyền allAccessories
              category={category}
              // selectedFilter={selectedFilter}
              selectedFilter={selectedFilterLoudspeaker}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
              soldQuantities={soldQuantities}
              toggleLike={toggleLike}
              purchasePhone={purchasePhone}
              filterByCategory={filterByCategory}
              setSelectedFilter={handleFilterCategoriesLoudspeaker}
            />
          </section>
          <section className="accessory-products_backup-charger">
            <ChargingCableSection
              accessories={accessories}
              allAccessories={allAccessories} // Truyền allAccessories
              category={category}
              // selectedFilter={selectedFilter}
              selectedFilter={selectedFilterChargingCable}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
              soldQuantities={soldQuantities}
              toggleLike={toggleLike}
              purchasePhone={purchasePhone}
              filterByCategory={filterByCategory}
              setSelectedFilter={handleFilterCategoriesChargingCable}
            />
          </section>
          <section className="accessory-products_backup-charger">
            <IncludedAccessoriesSection
              accessories={accessories}
              allAccessories={allAccessories} // Truyền allAccessories
              category={category}
              // selectedFilter={selectedFilter}
              selectedFilter={selectedFilterIncludedAccessories}
              selectedCategoryId={selectedCategoryId}
              setAccessories={setAccessories}
              loading={loading}
              getChildCategories={getChildCategories}
              showSubCategories={showSubCategories}
              soldQuantities={soldQuantities}
              toggleLike={toggleLike}
              purchasePhone={purchasePhone}
              filterByCategory={filterByCategory}
              setSelectedFilter={handleFilterCategoriesIncludedAccessories}
            />
          </section>
        </div>
      </div>
    </>
  );
};
export default Accessory;
