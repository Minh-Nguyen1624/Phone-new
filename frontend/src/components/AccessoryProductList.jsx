import React, { useState, useEffect } from "react";
import { FaStar } from "react-icons/fa";
import "../css/Accessory.css";

const AccessoryProductList = ({ accessories = [], soldQuantities = {} }) => {
  console.log("AccessoryProductList - accessories:", accessories); // Log chi tiết

  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 4; // Số sản phẩm hiển thị trên màn hình, cố định là 4

  // Xử lý cuộn sang trái
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  // Xử lý cuộn sang phải
  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev < Math.max(0, accessories.length - itemsPerPage) ? prev + 1 : prev
    );
  };

  if (!accessories || accessories.length === 0) {
    return <div className="no-products-message">Chưa có sản phẩm</div>;
  }

  // Lấy danh sách sản phẩm hiển thị dựa trên currentIndex
  const visibleAccessories = accessories.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  return (
    <div className="list-product_camera">
      <div className="owt-stage">
        <div
          className="highlight-track"
          style={{
            transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
            width: `${Math.ceil(accessories.length / itemsPerPage) * 100}%`,
            display: "flex",
          }}
        >
          {Array.isArray(visibleAccessories) &&
          visibleAccessories.length > 0 ? (
            visibleAccessories.map((item, index) => (
              <div className="owt-item" key={item._id || index}>
                <li className="item__cate">
                  <a href="#" className="item__cate-link">
                    <div className="item-label"></div>
                    <div className="item-img">
                      <img
                        src={item.image || ""}
                        alt={item.name || "Product"}
                        className="bounce"
                      />
                    </div>
                    <p className="result-label">
                      <img
                        src={item.discount?.discountImage || ""}
                        alt=""
                        width="20px"
                        height="20px"
                      />
                      <span>{item.discount?.code || ""}</span>
                    </p>
                    <h3 className="result-title">{item.name || "No Name"}</h3>
                    <strong className="price">
                      {item.finalPrice || item.price || 0}₫
                    </strong>
                    <div className="box-p">
                      <p className="price-old">{item.price || 0}₫</p>
                      <span className="percent">
                        {"-"}
                        {item.discount?.discountValue || 0}%
                      </span>
                    </div>
                  </a>
                  <div className="item-bottom">
                    <a href="#" className="shipping"></a>
                  </div>
                  <div className="rating_Compare">
                    <div className="vote-txt">
                      <FaStar className="star" />
                      <b>{item.rating || 0}</b>
                    </div>
                    <span>• Đã bán {soldQuantities[item._id] || 0}</span>
                  </div>
                </li>
              </div>
            ))
          ) : (
            <p>Không có sản phẩm để hiển thị</p>
          )}
        </div>
      </div>
      <div className="owl-nav">
        <button
          type="button"
          aria-label="button"
          className="owl-prev"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <span>‹</span>
        </button>
        <button
          type="button"
          aria-label="button"
          className="owl-next"
          onClick={handleNext}
          disabled={
            currentIndex >=
            Math.max(0, Math.ceil(accessories.length / itemsPerPage) - 1)
          }
        >
          <span>›</span>
        </button>
      </div>
    </div>
  );
};

export default AccessoryProductList;
