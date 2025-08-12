import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import "../css/Accessory.css";

const BrandModal = ({ brands, onClose }) => {
  const [search, setSearch] = useState("");

  const filteredBrand = brands.filter(
    // (item) => console.log(item.name.toLowerCase()),
    // item.name.toLowerCase().includes(search.toLowerCase())
    (brand) => brand.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="brand-modal-wrapper">
        <button className="close-modal" onClick={onClose}>
          Đóng
          <FaTimes />
        </button>
        <div className="brand-modal-overlay">
          <div className="brand-modal">
            <div className="brand-modal-header">
              <h4>Tìm thương hiệu phụ kiện</h4>
              <div className="brand-modal-search">
                <input
                  type="text"
                  value={search}
                  placeholder="Tìm thương hiệu"
                  className="search-brand"
                />
                <FaSearch className="icon-search" />
              </div>
            </div>
            <div className="brand-modal-body">
              {filteredBrand.map((brand) => (
                <div key={brand.id} className="brand-item">
                  <img src={brand.logo} alt={brand.name} width="80" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BrandModal;
