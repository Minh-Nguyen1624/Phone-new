import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/Accessory.css";
import "../css/ProductsOftenBoughtTogether.css";

const API_URL = "http://localhost:8080/api";

const RelatedProducts = ({ product = null }) => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const itemsPerPage = 5;
  const animationRef = useRef(null);
  const trackRef = useRef(null);
  const navigate = useNavigate();

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!product?._id) {
        throw new Error("Không có product._id để fetch");
      }
      const response = await axios.get(
        `${API_URL}/phones/related/${product._id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      if (response.data.success) {
        setRelatedProducts(response.data.data || []);
      } else {
        setError(response.data.message || "Không có sản phẩm liên quan");
      }
    } catch (error) {
      console.error(
        "API Error:",
        error.response?.status,
        error.response?.data || error.message
      );
      setError(
        error.response?.data?.message ||
          `Lỗi kết nối API (Mã: ${error.response?.status || "Unknown"})`
      );
    } finally {
      setLoading(false);
    }
  };

  const smoothScroll = (element, to, duration) => {
    if (!element) {
      console.warn("Element is null, cannot scroll");
      return;
    }
    const start = element.scrollLeft;
    const change = to - start;
    let startTime = null;

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min(currentTime - startTime, duration);
      const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      const val = easeInOut(progress / duration) * change + start;
      element.scrollLeft = val;
      if (progress < duration) {
        animationRef.current = requestAnimationFrame(animateScroll);
      } else {
        console.log("Scroll completed to:", to);
      }
    };

    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animateScroll);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    const maxIndex = Math.max(
      0,
      Math.ceil(relatedProducts.length / itemsPerPage) - 1
    );
    if (currentIndex < maxIndex) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleMouseDown = (e) => {
    if (trackRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - trackRef.current.offsetLeft);
      setScrollLeft(trackRef.current.scrollLeft);
      trackRef.current.style.cursor = "grabbing";
      trackRef.current.style.userSelect = "none";
      e.preventDefault(); // Ngăn hành vi mặc định
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Điều chỉnh tốc độ kéo
    trackRef.current.scrollLeft = scrollLeft - walk;
    console.log("Dragging, scrollLeft:", trackRef.current.scrollLeft); // Debug
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (trackRef.current) {
      trackRef.current.style.cursor = "grab";
      trackRef.current.style.userSelect = "";
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (trackRef.current) {
      trackRef.current.style.cursor = "grab";
      trackRef.current.style.userSelect = "";
    }
  };

  useEffect(() => {
    if (trackRef.current && relatedProducts.length > 0) {
      const itemWidth = trackRef.current.children[0]?.offsetWidth || 234;
      console.log("Item Width:", itemWidth); // Debug
      const scrollPosition = currentIndex * itemWidth * itemsPerPage;
      console.log("Scroll Position:", scrollPosition); // Debug
      smoothScroll(trackRef.current, scrollPosition, 600);
    }
  }, [currentIndex, relatedProducts]);

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  useEffect(() => {
    if (product?._id) {
      fetchRelatedProducts();
    } else {
      setRelatedProducts([]);
      setError("Không có sản phẩm để lấy dữ liệu liên quan");
      console.log("No product._id provided:", product);
    }
  }, [product?._id]);

  if (loading) return <div className="related acc">Đang tải...</div>;
  if (error)
    return (
      <div className="related acc" style={{ color: "red" }}>
        {error}
      </div>
    );
  if (!relatedProducts.length)
    return <div className="related acc">Không có sản phẩm liên quan.</div>;

  return (
    <div className="related acc" style={{ marginTop: 30 }}>
      <p className="related__ttl">
        <span>Sản phẩm liên quan</span>
      </p>
      <div className="box-scroll p-slide">
        <div className="listproduct owl-carousel owl-loaded owl-drag">
          <div
            className="owl-stage-outer"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={trackRef}
              className="owl-stage"
              style={{
                transform: "translate3d(0px,0px,0px)",
                transition: "all 0.6s ease",
                display: "flex",
                width: `${
                  Math.ceil(relatedProducts.length / itemsPerPage) * 1170
                }px`,
                cursor: "grab",
              }}
            >
              {relatedProducts.map((item, index) => (
                <div
                  className="owl-item"
                  style={{ width: 234, flexShrink: 0 }}
                  key={item._id || index}
                >
                  <div className="item">
                    <a
                      onClick={() => navigate(`/product/${item._id}`)}
                      className="main-contain"
                    >
                      <div className="item-img">
                        <img
                          src={item.image || "https://via.placeholder.com/150"}
                          alt={item.name}
                          className="thumb"
                        />
                      </div>
                      <h3 className="item-name">
                        {item.name || "Tên sản phẩm"}
                      </h3>
                      <strong className="price">
                        {item.finalPrice?.toLocaleString() || "0"} VNĐ
                      </strong>
                      <div className="box-p">
                        <p className="price-old black">
                          {item.price?.toLocaleString() || "0"} VNĐ
                        </p>
                        <span className="percent">
                          {item.price && item.finalPrice
                            ? `${Math.round(
                                ((item.price - item.finalPrice) / item.price) *
                                  100
                              )}%`
                            : "0%"}
                        </span>
                      </div>
                    </a>
                    <div className="rating_Compare has_quantity">
                      <div className="vote-txt">
                        <i className="iconnewglobal-vote"></i>
                        <b>{item.rating || "0"}</b>
                      </div>
                      <span>• Đã bán {item.reserved || "0"}</span>
                    </div>
                    {item.accessoryFor && item.accessoryFor.length > 0 && (
                      <div className="accessory-info">
                        {item.accessoryFor.map((acc, idx) => (
                          <span key={idx} className="accessory-tag">
                            {acc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        className="owl-nav"
        style={{ position: "relative", bottom: "282px", zIndex: "1" }}
      >
        <button
          type="button"
          className="owl-prev"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{ cursor: currentIndex === 0 ? "not-allowed" : "pointer" }}
        >
          <span>‹</span>
        </button>
        <button
          type="button"
          className="owl-next"
          onClick={handleNext}
          disabled={
            currentIndex >=
            Math.max(0, Math.ceil(relatedProducts.length / itemsPerPage) - 1)
          }
          style={{
            cursor:
              currentIndex >=
              Math.max(0, Math.ceil(relatedProducts.length / itemsPerPage) - 1)
                ? "not-allowed"
                : "pointer",
          }}
        >
          <span>›</span>
        </button>
      </div>
    </div>
  );
};

export default RelatedProducts;
