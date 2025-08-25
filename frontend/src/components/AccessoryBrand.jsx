import React, { useState } from "react";
import BrandModal from "./BrandModal";
import { useNavigate } from "react-router-dom";

const AccessoryBrand = ({
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
  brand,
}) => {
  const toCapitalize = (str) => {
    // return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toUpperCase() : str;
  };
  console.log("Accessories: ", accessories);

  const navigate = useNavigate();

  const handleClick = (brandName) => {
    const safeBrandName = brandName.replace(/\s+/g, "-").toLowerCase(); // Thay khoảng trắng bằng dấu gạch nối
    console.log(`Navigating to /accessories/${safeBrandName}`);
    navigate(`/accessories/${safeBrandName}`); // Chuyển trang
  };

  const childCategories = getChildCategories();
  console.log(
    "Child Categories for selectedFilter:",
    selectedFilter,
    "selectedCategoryId:",
    selectedCategoryId,
    "Result:",
    childCategories
  );
  console.log("Show Sub Categories: ", showSubCategories);

  const [showModal, setShowModal] = useState(false);

  // Hiển thị nội dung nếu showSubCategories là false nhưng childCategories tồn tại
  const shouldRender =
    showSubCategories || (childCategories.length > 0 && !loading);

  return (
    <section className="category-brand">
      {shouldRender ? (
        <>
          <div className="category-brand-header">
            <h3 className="category-brand-title">Thương hiệu phụ kiện</h3>
            <a
              href="#"
              className="category-all-brand"
              style={{ color: "#007bff" }}
              onClick={(event) => {
                event.preventDefault();
                setShowModal(true);
              }}
            >
              Xem tất cả
            </a>
          </div>
          <div className="quick-link">
            {childCategories.length > 0 ? (
              childCategories.slice(0, 20).map((cat) => (
                <button
                  key={cat._id}
                  className={`category-button ${
                    selectedFilter === cat.name.toLowerCase()
                      ? "selected-filter"
                      : ""
                  }`}
                  onClick={() => {
                    console.log("Filtering by brand:", cat.name.toLowerCase());
                    filterByBrand(cat.name.toLowerCase());
                    handleClick(cat.name.toLowerCase());
                  }}
                  style={{
                    backgroundColor:
                      selectedFilter === cat.name.toLowerCase()
                        ? "#007bff"
                        : "#ffffff",
                    color:
                      selectedFilter === cat.name.toLowerCase()
                        ? "#ffffff"
                        : "#000000",
                    margin: "0",
                    height: "40px",
                    padding: "5px 20px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                >
                  {toCapitalize(cat.name)}
                </button>
              ))
            ) : (
              <p style={{ color: "#666" }}>
                Không có thương hiệu nào để hiển thị.
              </p>
            )}
          </div>
          {showModal && (
            <BrandModal
              brands={childCategories}
              onClose={() => setShowModal(false)}
            />
          )}
        </>
      ) : null}
    </section>
  );
};

export default AccessoryBrand;
