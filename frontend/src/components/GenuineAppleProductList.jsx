import React, { useState, useEffect, useRef } from "react";
import { FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../css/Accessory.css";

const GenuineAppleProductList = ({ accessories = [], soldQuantities = {} }) => {
  console.log("AccessoryProductList - accessories:", accessories); // Log chi tiết

  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 4; // Số sản phẩm hiển thị trên màn hình, cố định là 4
  const trackRef = useRef(null); // Tham chiếu đến highlight-track
  const animationRef = useRef(null); // Tham chiếu đến animation frame
  const navigate = useNavigate();

  // Hàm cuộn mượt mà tùy chỉnh
  const smoothScroll = (element, to, duration) => {
    const start = element.scrollLeft;
    const change = to - start;
    let startTime = null;

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = currentTime - startTime;
      const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t); // Easing function
      const val = easeInOut(progress / duration) * change + start;

      element.scrollLeft = val;

      if (progress < duration) {
        animationRef.current = requestAnimationFrame(animateScroll);
      }
    };

    cancelAnimationFrame(animationRef.current); // Hủy animation cũ
    animationRef.current = requestAnimationFrame(animateScroll);
  };

  // Xử lý cuộn sang trái
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Xử lý cuộn sang phải
  const handleNext = () => {
    if (currentIndex < Math.max(0, accessories.length - itemsPerPage)) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (trackRef.current) {
      const itemWidth = trackRef.current.children[0]?.offsetWidth || 0; // Chiều rộng của mỗi item
      const scrollPosition = currentIndex * itemWidth * itemsPerPage; // Vị trí cuộn
      smoothScroll(trackRef.current, scrollPosition, 600); // Cuộn trong 600ms
    }
  }, [currentIndex]);

  // Dọn dẹp animation khi component unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (!accessories || accessories.length === 0) {
    return <div className="no-products-message">Chưa có sản phẩm</div>;
  }

  // Lấy danh sách sản phẩm hiển thị dựa trên currentIndex
  const visibleAccessories = accessories.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  const handleProductClick = (item) => {
    const categorySlug =
      item.category?.slug ||
      slugify(item.name || "product", { lower: true, strict: true });
    if (!item._id) {
      console.error("Item _id is missing:", item);
      return;
    }
    navigate(`/product/${item._id}/${categorySlug}`); // Điều hướng đến chi tiết
  };

  return (
    <div className="list-product_camera">
      <div className="owt-stage">
        <div
          ref={trackRef}
          className="highlight-track"
          style={{
            width: `${Math.ceil(accessories.length / itemsPerPage) * 100}%`,
            display: "flex",
          }}
        >
          {Array.isArray(visibleAccessories) &&
          visibleAccessories.length > 0 ? (
            visibleAccessories.map((item, index) => (
              <div className="owt-item" key={item._id || index}>
                <li className="item__cate">
                  <a
                    href="#"
                    className="item__cate-link"
                    onClick={(e) => {
                      e.preventDefault();
                      handleProductClick(item);
                    }}
                  >
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
export default GenuineAppleProductList;
