import React, { useState, useEffect, useRef, use } from "react";
import "../css/ProductDetailInfo.css";
import {
  FaRegStar,
  FaCircle,
  FaCartPlus,
  FaPhoneAlt,
  FaAngleDown,
  FaAngleUp,
} from "react-icons/fa";

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
  const color = product?.colors || [];
  const images = product?.images || {};

  const [isActive, setIsActive] = useState("specification");
  const toggleIsActive = (tabs) => {
    setIsActive(tabs);
  };

  const initialIsOpen = [false, false, false]; // Hoặc dựa trên số section từ props nếu có
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  // const [isOpen, setIsOpen] = useState([false, false, false]);
  const [show, setIsShow] = useState(false);

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
    animationRef.current = requestAnimationFrame(animateScroll);
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

  const handleClickEvent = (index, event) => {
    event.preventDefault();
    // setShow(!show);
    setIsOpen((prev) => {
      if (!Array.isArray(prev)) {
        console.error(
          "isOpen is not an array, resetting to initial state:",
          initialIsOpen
        );
        return [...initialIsOpen]; // Reset về trạng thái ban đầu nếu lỗi
      }
      const newIsOpen = [...prev];
      newIsOpen[index] = !newIsOpen[index];
      return newIsOpen;
    });
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
                className="owl-prev prev"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <span>‹</span>
              </button>
              <button
                type="button"
                aria-label="button"
                className="owl-next next"
                onClick={handleNext}
                disabled={
                  currentIndex >=
                  Math.max(0, Math.ceil(product.length / itemsPerPage) - 1)
                }
              >
                <span>›</span>
              </button>
            </div>
            {/* {images.map((image) => console.log(image.url))} */}
            <div className="owl-dots">
              {images.map((image, index) => {
                return (
                  <button key={index} className={`owl-dot dotnumber${index}`}>
                    <img
                      className="theImg"
                      src={image?.url}
                      alt={image?.alt}
                      // style={{ height: "25%" }}
                    />
                  </button>
                );
              })}
            </div>
          </aside>
          <div className="policy policy-vs">
            <h2>NamPhuong-Store</h2>
            <ul className="policy__list">
              <li>
                <div className="pl-icon"></div>
                <div className="pl-txt">
                  <p>
                    1 đổi 1 trong vòng <b>12 tháng</b> đối với sản phẩm lỗi do
                    nhà sản xuất
                  </p>
                </div>
              </li>
              <li>
                <div className="pl-icon"></div>
                <div className="pl-txt">
                  <p>
                    Trong hộp có: Ốc vít, Tấm gắn, Sách hướng dẫn, Mẫu khoan,
                    Dây cáp, Camera, Bộ chuyển đổi nguồn DC
                  </p>
                </div>
              </li>
              <li>
                <div className="pl-icon"></div>
                <div className="pl-txt">
                  <p>
                    Bảo hành có cam kết <b>12 tháng</b>
                  </p>
                </div>
              </li>
              <li>
                <div className="pl-icon"></div>
                <div className="pl-txt">
                  <p>
                    Bảo hành <b> chính hãng camera giám sát 2 năm</b> tại các
                    trung tâm bảo hành hãng
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div id="tab-spec" className="tabs col2">
            <h2
              id="specification-tabs"
              className={`tab-link ${
                isActive === "specification" ? "current" : ""
              }`}
              onClick={() => toggleIsActive("specification")}
            >
              Thông số kỹ thuật
            </h2>
            <h2
              id="info-tabs"
              className={`tab-link ${isActive === "info" ? "current" : ""}`}
              onClick={() => toggleIsActive("info")}
            >
              Thông tin sản phẩm
            </h2>
          </div>
          <div className="specifications tab-content">
            <div id="specification-item" className="specification-item">
              <div className="box-specifi">
                <a
                  href="#"
                  onClick={(e) => {
                    handleClickEvent(0, e);
                    setIsShow(!show);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    height: "60px",
                  }}
                >
                  <h3>Camera tiện ích</h3>
                  {isOpen[0] ? (
                    <FaAngleUp style={{ marginRight: "10px" }} />
                  ) : (
                    <FaAngleDown style={{ marginRight: "10px" }} />
                  )}
                </a>
                {isOpen[0] && (
                  <ul className="text-specifi">
                    <li>
                      <aside>
                        <strong>Độ phân giải:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.camera.rear}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Góc nhìn:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.camera.rear}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Góc xoay:</strong>
                      </aside>
                      <aside>
                        <span>
                          Xoay ngang{" "}
                          {specifications?.camera.rotation.horizontal}
                        </span>
                        <span>
                          Xoay dọc {specifications?.camera.rotation.vertical}
                        </span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Tầm nhìn xa hông ngoại:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.camera.infraredRange}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Tiện ích:</strong>
                      </aside>
                      <div className="utilities">
                        {specifications?.camera.utilities.map((s, index) => (
                          <div key={s._id || index}>
                            <span key={s._id} style={{ fontSize: "14px" }}>
                              {s}
                            </span>
                          </div>
                        ))}
                      </div>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Độ phân giải:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.camera.rear}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Đàm thoại 2 chiều:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.camera.rear}</span>
                      </aside>
                    </li>
                  </ul>
                )}
              </div>
              <div className="box-specifi" style={{ marginTop: "20px" }}>
                <a
                  href="#"
                  onClick={(e) => {
                    handleClickEvent(1, e);
                    setIsShow(!show);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    height: "60px",
                  }}
                >
                  <h3>Kết nối & Lưu trữ</h3>
                  {isOpen[1] ? (
                    <FaAngleUp style={{ marginRight: "10px" }} />
                  ) : (
                    <FaAngleDown style={{ marginRight: "10px" }} />
                  )}
                </a>
                {isOpen[1] && (
                  <ul className="text-specifi">
                    {/* <li>
                      <aside>
                        <strong>Kết nối: </strong>
                      </aside>
                      <aside>
                        <span>{specifications?.camera.rear}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Góc nhìn:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.camera.rear}</span>
                      </aside>
                    </li> */}
                    <li>
                      {" "}
                      <aside>
                        <strong>Kết nối:</strong>
                      </aside>
                      <aside>
                        <span> {specifications?.network[0]}</span>
                        <span>{specifications?.network[1]}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Băng tần WiFi:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.network[3]}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Kết nối cùng lúc:</strong>
                      </aside>
                      <aside>
                        <span>
                          {specifications?.simultaneousConnections} người
                        </span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Lưu trữ:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.storage}</span>
                      </aside>
                    </li>
                  </ul>
                )}
              </div>
              <div className="box-specifi" style={{ marginTop: "20px" }}>
                <a
                  href="#"
                  onClick={(e) => {
                    handleClickEvent(2, e);
                    setIsShow(!show);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    height: "60px",
                  }}
                >
                  <h3>Kết nối & Lưu trữ</h3>
                  {isOpen[2] ? (
                    <FaAngleUp style={{ marginRight: "10px" }} />
                  ) : (
                    <FaAngleDown style={{ marginRight: "10px" }} />
                  )}
                </a>
                {isOpen[2] && (
                  <ul className="text-specifi">
                    <li>
                      {" "}
                      <aside>
                        <strong>Kết nối:</strong>
                      </aside>
                      <aside>
                        <span> {specifications?.network[0]}</span>
                        <span>{specifications?.network[1]}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Băng tần WiFi:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.network[3]}</span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Kết nối cùng lúc:</strong>
                      </aside>
                      <aside>
                        <span>
                          {specifications?.simultaneousConnections} người
                        </span>
                      </aside>
                    </li>
                    <li>
                      {" "}
                      <aside>
                        <strong>Lưu trữ:</strong>
                      </aside>
                      <aside>
                        <span>{specifications?.storage}</span>
                      </aside>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </div>
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
                  <span>{color}</span>
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
            <a href="#">0368 800 168</a>
            <span>(8:00 - 21:00)</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailInfo;
