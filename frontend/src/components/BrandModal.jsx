import React, { useState, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import "../css/Accessory.css";
const BrandModal = ({ brands, onClose, onSelect }) => {
  const [search, setSearch] = useState("");

  const filteredBrand = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "Enter" && filteredBrand.length > 0) {
        onSelect(filteredBrand[0]);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onSelect, filteredBrand]);

  return (
    <div className="brand-modal-overlay">
      <div className="brand-modal">
        <button className="brand-modal-close" onClick={onClose}>
          <FaTimes />
        </button>
        <h4 className="brand-modal-title">Tìm thương hiệu/phân loại</h4>
        <div className="brand-modal-search">
          <FaSearch className="icon-search" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm thương hiệu hoặc camera"
            autoFocus
          />
        </div>
        <div className="brand-modal-list">
          {filteredBrand.map((brand) => (
            <div key={brand._id} className="brand-item">
              <a
                href="#"
                className="brand-item-link"
                onClick={() => onSelect(brand)}
              >
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
