import React, { useState, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import "../css/Accessory.css";

const BrandModal = ({ brands, onClose, onKeyboard }) => {
  const [search, setSearch] = useState("");
  const filteredBrand = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "Enter") {
        onKeyboard(filteredBrand[0]);
      }
      if (event.key === "Enter" && document.activeElement.tagName === "INPUT") {
        setSearch(event.target.value);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onKeyboard]);

  return (
    <div className="brand-modal-overlay">
      <div className="brand-modal">
        {/* Nút đóng */}
        <button className="brand-modal-close" onClick={onClose}>
          <FaTimes />
        </button>

        {/* Tiêu đề */}
        <h4 className="brand-modal-title">Tìm thương hiệu phụ kiện</h4>

        {/* Ô tìm kiếm */}
        <div className="brand-modal-search">
          <FaSearch className="icon-search" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm thương hiệu"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onKeyboard(filteredBrand[0]);
              }
            }}
          />
        </div>

        {/* Danh sách thương hiệu */}
        <div className="brand-modal-list">
          {filteredBrand.map((brand) => (
            <div key={brand._id} className="brand-item">
              <a href="#" className="brand-item-link">
                {/* <img src={brand.logo} alt={brand.name} /> */}
                <span>
                  {brand.name.charAt(0).toUpperCase() +
                    brand.name.slice(1).toLowerCase()}
                </span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandModal;
