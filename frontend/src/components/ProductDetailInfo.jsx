import React, { useState, useEffect, useRef } from "react";
import "../css/ProductDetailInfo.css";
import { FaRegStar, FaCircle, FaCartPlus, FaPhoneAlt } from "react-icons/fa";

const ProductDetailInfo = ({ product, topCapitalize, navigate }) => {
  const imageUrl = product?.image
    ? product?.image.startsWith("https")
      ? product?.image
      : `${API_URL}${product?.image || ""}` // Điều chỉnh đường dẫn
    : "https://via.placeholder.com/200";
  const name = product?.name || "Tên sản phẩm";
  const categoryName = product?.category?.name || "Danh mục không xác định";
  const price = product?.price
    ? `${product.price.toLocaleString()} VNĐ`
    : "Giá không có";
  const finalPrice = product?.finalPrice
    ? `${product.finalPrice.toLocaleString()} VNĐ`
    : price;
  const description = product?.description || "Không có mô tả.";
  const discountCode = product?.discount?.code || "No discount";
  const discountValue = product?.discount?.discountValue || 0;
  const specifications = product?.specifications || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 1;
  const trackRef = useRef(null);
  const animationRef = useRef(null);

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

    cancelAnimationFrame(animationRef.current);
    animateRef.current = requestAnimationFrame(animateScroll);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < Math.max(0, product.length - itemsPerPage)) {
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

  const handleClickEvent = (event) => {
    event.preventdefault();
  };
  return (
    <section className="product-detail">
      <ul>
        <li>
          <a href={product?.link} target="_blank" rel="noopener noreferrer">
            {product?.link}
          </a>
        </li>
      </ul>
      <div className="product-name">
        <div className="box-1">
          <h2>{topCapitalize(name)}</h2>
          <div className="box-2">
            <span className="quantity-sale">Đã bán {product?.reserved}</span>
            <div className="box-2_left">
              <div className="detail-rate">
                <p>
                  <FaRegStar className="rating" />
                  {product?.rating}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="like-fanpage">
          {/* <iframe
            src="#"
            frameborder="0"
            allowTransparency="true"
            scrolling="no"
            width="150px"
            height="40px"
            allow="encrypted-media"
            style={{ border: "none" }}
          ></iframe> */}
        </div>
      </div>
      <div className="box-main">
        <div className="box_left">
          <aside id="slider-detail" className="show">
            <div className="bgfullScreen-gallery"></div>
            <div className="wrap-slider">
              <div className="closefullScreen-gallery">Đóng</div>
              <div className="gallery-img">
                <div className="img-slide full">
                  <div className="prev"></div>
                  <div className="next"></div>
                  <div className="owl-carousel slider-img owl-loaded owl-drag">
                    <div className="owl-stage-outer">
                      <div
                        className="owl-stage"
                        style={{
                          transform: "translate3d(0px, 0px, 0px)",
                          transition: "all",
                          width: "2720px",
                        }}
                      >
                        <div className="owl-item" style={{ width: "680px" }}>
                          <div className="item-img">
                            <img
                              src={product?.image}
                              alt=""
                              width="680px"
                              height="380px"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                  Math.max(0, Math.ceil(product.length / itemsPerPage) - 1)
                }
              >
                <span>›</span>
              </button>
            </div>
          </aside>
        </div>
        <div className="box_right">
          <div className="banner-detail _bannerdetail__top">
            <a href="#" className="banner-detail_link">
              <img
                src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/97/e9/97e9fef634f10230fddc5a629990bcc4.png"
                alt=""
                width="920px"
                height="230px"
              />
            </a>
          </div>
          <div className="banner-detail-1">
            <a href="#" className="banner-detail_link">
              <img
                src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/97/e9/97e9fef634f10230fddc5a629990bcc4.png"
                alt=""
                width="920px"
                height="230px"
              />
            </a>
          </div>
          <div className="group-box03">
            <div className="scrolling_inner">
              <div className="box03 color group desk">
                <a href="#" className="box03__item item act">
                  <FaCircle
                    className="circle"
                    style={{
                      backgroundColor: "#FBF7F4",
                    }}
                  />
                  <span>Trắng</span>
                </a>
              </div>
            </div>
          </div>
          <div className="block-button buy">
            <a href="#" className="btn-buynow white" onClick={handleClickEvent}>
              {/* <FaCartPlus />
              Thêm vào giỏ hàng */}
              <span className="icon">
                <FaCartPlus />
              </span>
              <span className="text">Thêm vào giỏ hàng</span>
            </a>
            <a href="#" className="btn-buynow buy" onClick={handleClickEvent}>
              Mua ngay
            </a>
          </div>
          <p className="callorder">
            <FaPhoneAlt className="icondetail-hotline" />
            <span className="call">Gọi đặt mua</span>
            <a href="#">0368800168</a>
            <span>(8:00 - 21:00)</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailInfo;
