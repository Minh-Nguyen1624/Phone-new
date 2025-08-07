import "../css/Monitor.css";
import React from "react";
import useMonitorData from "../hooks/useMonitorData";
import Header from "../components/Header";
import MainProduct from "../components/MainProduct";
import QuickFilter from "../components/QuickFilter";
import CategoryFilter from "../components/CategoryFilter";
import ProductGrid from "../components/ProductGrid";
import { Link, useNavigate, useLocation } from "react-router-dom";

const Monitor = () => {
  const {
    monitors,
    soldQuantities,
    loading,
    error,
    selectedCategoryId,
    searchQuery,
    category,
    categoryMap,
    brands,
    totalMonitors,
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
    handleDoubleSidedFilter,
    setMonitors,
  } = useMonitorData();

  const navigate = useNavigate();
  const location = useLocation();

  const categoryNameMap = {
    "desktop-computer": "Máy tính để bàn",
    "computer-screen": "Màn hình máy tính",
    "screen-mount": "Giá treo màn hình",
    printer: "Máy in",
    "printing ink": "Mực in",
    "printing paper": "Giấy in",
    "handheld gaming device": "Máy chơi game cầm tay",
  };

  const categoryMap2 = category
    ? category.reduce((map, cat) => {
        map[cat._id] = categoryNameMap[cat.name] || cat.name;
        return map;
      }, {})
    : {};

  if (loading) return <p className="text-center text-gray-600">Đang tải...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!Array.isArray(monitors) || monitors.length === 0) {
    return <p className="text-center text-gray-600">Không có sản phẩm nào.</p>;
  }

  console.log(
    "Monitor component - setSelectedFilter:",
    typeof setSelectedFilter === "function" ? "function" : setSelectedFilter
  ); // Kiểm tra kiểu

  return (
    <>
      <div className="header-top-bar">
        <div className="banner-top">
          <div className="item">
            <a href="#" className="item-link">
              <img
                src="//cdnv2.tgdd.vn/mwg-static/tgdd/Banner/3f/8d/3f8d409679edbe42ae3e1e908d62b630.png"
                alt="Banner"
              />
            </a>
          </div>
        </div>
      </div>
      <Header onSearch={handleSearch} onFilterByCategory={filterByCategory} />
      <section className="block">
        <ul className="breadcrumb-block">
          <li className="title_category">
            <Link to="/">Trang chủ</Link>
          </li>
          <li className="number_category">
            {`> ${totalMonitors} ${
              categoryMap2[selectedCategoryId] || "Máy tính để bàn"
            }`}
          </li>
        </ul>
      </section>
      <div className="container mx-auto mt-8">
        <div
          className="container mx-auto px-4"
          style={{
            backgroundColor: "#fff",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            borderRadius: "0.5rem",
            padding: "40px",
          }}
        >
          <QuickFilter
            selectedFilter={selectedFilter}
            onFilterByCategory={filterByCategory}
            setShowSubCategories={setShowSubCategories}
            category={category}
          />
          <CategoryFilter
            isCategorySelected={isCategorySelected}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            selectedCategoryId={selectedCategoryId}
            showSubCategories={showSubCategories}
            getChildCategories={getChildCategories}
            filterByCategory={filterByCategory}
            filterByBrand={filterByBrand}
            monitors={monitors}
            setMonitors={setMonitors}
            loading={loading}
            category={category}
            handleDoubleSidedFilter={handleDoubleSidedFilter} // Truyền hàm này
          />
          <ProductGrid
            monitors={monitors}
            soldQuantities={soldQuantities}
            displayLimit={displayLimit}
            loadMore={loadMore}
            purchasePhone={purchasePhone}
          />
        </div>
      </div>
    </>
  );
};

export default Monitor;
