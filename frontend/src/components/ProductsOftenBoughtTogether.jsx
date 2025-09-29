// import React, { useState, useEffect, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axios from "axios";
// import "../css/Accessory.css";
// // import "../css/ProductsOftenBoughtTogether.css";
// // import "../css/ProductDetailInfo.css";

// const API_URL = "http://localhost:8080/api";

// const ProductOftenBoughtTogether = ({ product = null }) => {
//   const [relatedProducts, setRelatedProducts] = useState([]);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const itemsPerPage = 5;
//   const animationRef = useRef(null);
//   const trackRef = useRef(null);
//   const navigate = useNavigate();

//   const fetchRelatedProducts = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       if (!product?._id) {
//         throw new Error("Không có product._id để fetch");
//       }
//       console.log("Fetching related products for productId:", product._id);
//       const response = await axios.get(
//         `${API_URL}/phones/bought/${product._id}`,
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
//           },
//         }
//       );
//       console.log("API Response:", response.data);
//       if (response.data.success) {
//         setRelatedProducts(response.data.data || []);
//       } else {
//         setError(response.data.message || "Không có sản phẩm liên quan");
//       }
//     } catch (error) {
//       console.error(
//         "API Error:",
//         error.response?.status,
//         error.response?.data || error.message
//       );
//       setError(
//         error.response?.data?.message ||
//           `Lỗi kết nối API (Mã: ${error.response?.status || "Unknown"})`
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const smoothScroll = (element, to, duration) => {
//     if (!element) return;
//     const start = element.scrollLeft;
//     const change = to - start;
//     let startTime = null;

//     const animateScroll = (currentTime) => {
//       if (!startTime) startTime = currentTime;
//       const progress = currentTime - startTime;
//       const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

//       const val = easeInOut(progress / duration) * change + start;
//       element.scrollLeft = val;

//       if (progress < duration) {
//         animationRef.current = requestAnimationFrame(animateScroll);
//       }
//     };

//     cancelAnimationFrame(animationRef.current);
//     animationRef.current = requestAnimationFrame(animateScroll);
//   };

//   const handlePrev = () => {
//     console.log("Prev clicked, currentIndex:", currentIndex);
//     if (currentIndex > 0) {
//       setCurrentIndex((prev) => prev - 1);
//     }
//   };

//   const handleNext = () => {
//     console.log("Next clicked, currentIndex:", currentIndex);
//     const maxIndex = Math.max(
//       0,
//       Math.ceil(relatedProducts.length / itemsPerPage) - 1
//     );
//     if (currentIndex < maxIndex) {
//       setCurrentIndex((prev) => prev + 1);
//     }
//   };

//   useEffect(() => {
//     if (trackRef.current && relatedProducts.length > 0) {
//       console.log("Track Ref:", trackRef.current);
//       const itemWidth = trackRef.current.children[0]?.offsetWidth || 234;
//       const scrollPosition = currentIndex * itemWidth * itemsPerPage;
//       smoothScroll(trackRef.current, scrollPosition, 600);
//     }
//   }, [currentIndex, relatedProducts]);

//   useEffect(() => {
//     return () => cancelAnimationFrame(animationRef.current);
//   }, []);

//   useEffect(() => {
//     if (product?._id) {
//       fetchRelatedProducts();
//     } else {
//       setRelatedProducts([]);
//       setError("Không có sản phẩm để lấy dữ liệu liên quan");
//       console.log("No product._id provided:", product);
//     }
//   }, [product?._id]);

//   console.log("Related Products:", relatedProducts);

//   if (loading) return <div className="related acc">Đang tải...</div>;
//   if (error)
//     return (
//       <div className="related acc" style={{ color: "red" }}>
//         {error}
//       </div>
//     );
//   if (!relatedProducts.length)
//     return <div className="related acc">Không có sản phẩm liên quan.</div>;

//   return (
//     <div className="related acc" style={{ marginTop: 30 }}>
//       <p className="related__ttl">
//         <span>Sản phẩm thường mua cùng</span>
//       </p>
//       <div className="box-scroll p-slide">
//         <div className="listproduct owl-carousel owl-loaded owl-drag">
//           <div className="owl-stage-outer">
//             <div
//               ref={trackRef}
//               className="owl-stage"
//               style={{
//                 transform: "translate3d(0px,0px,0px)",
//                 transition: "all 0.6s ease",
//                 display: "flex",
//                 width: `${
//                   Math.ceil(relatedProducts.length / itemsPerPage) * 1170
//                 }px`,
//               }}
//             >
//               {relatedProducts.map((item, index) => (
//                 <div
//                   className="owl-item"
//                   style={{ width: 234, flexShrink: 0 }}
//                   key={item._id || index}
//                 >
//                   <div className="item">
//                     <a
//                       onClick={() => navigate(`/product/${item._id}`)}
//                       className="main-contain"
//                     >
//                       <div className="item-img">
//                         <img
//                           src={item.image || "https://via.placeholder.com/150"}
//                           alt={item.name}
//                           className="thumb"
//                         />
//                       </div>
//                       <h3>{item.name || "Tên sản phẩm"}</h3>
//                       <strong className="price">
//                         {item.finalPrice?.toLocaleString() || "0"} VNĐ
//                       </strong>
//                       <div className="box-p">
//                         <p className="price-old black">
//                           {item.price?.toLocaleString() || "0"} VNĐ
//                         </p>
//                         <span className="percent">
//                           {item.price && item.finalPrice
//                             ? `${Math.round(
//                                 ((item.price - item.finalPrice) / item.price) *
//                                   100
//                               )}%`
//                             : "0%"}
//                         </span>
//                       </div>
//                     </a>
//                     <div className="rating_Compare has_quantity">
//                       <div className="vote-txt">
//                         <i className="iconnewglobal-vote"></i>
//                         <b>{item.rating || "0"}</b>
//                       </div>
//                       <span>• Đã bán {item.reserved || "0"}</span>
//                     </div>
//                     {/* Hiển thị accessoryFor như một phần của sản phẩm */}
//                     {item.accessoryFor && item.accessoryFor.length > 0 && (
//                       <p className="accessory-info">
//                         Danh mục hỗ trợ: {item.accessoryFor.join(", ")}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       <div
//         className="owl-nav"
//         style={{ position: "relative", bottom: "282px", zIndex: "1" }}
//       >
//         <button
//           type="button"
//           className="owl-prev"
//           onClick={handlePrev}
//           disabled={currentIndex === 0}
//           style={{ cursor: currentIndex === 0 ? "not-allowed" : "pointer" }}
//         >
//           <span>‹</span>
//         </button>
//         <button
//           type="button"
//           className="owl-next"
//           onClick={handleNext}
//           disabled={
//             currentIndex >=
//             Math.max(0, Math.ceil(relatedProducts.length / itemsPerPage) - 1)
//           }
//           style={{
//             cursor:
//               currentIndex >=
//               Math.max(0, Math.ceil(relatedProducts.length / itemsPerPage) - 1)
//                 ? "not-allowed"
//                 : "pointer",
//           }}
//         >
//           <span>›</span>
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ProductOftenBoughtTogether;

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/Accessory.css";
import "../css/ProductsOftenBoughtTogether.css";

const API_URL = "http://localhost:8080/api";

const ProductOftenBoughtTogether = ({ product = null }) => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
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
      console.log("Fetching related products for productId:", product._id);
      const response = await axios.get(
        `${API_URL}/phones/${product._id}/bought-together`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      console.log("API Response:", response.data);
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
    console.log("Prev clicked, currentIndex:", currentIndex);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    console.log("Next clicked, currentIndex:", currentIndex);
    const maxIndex = Math.max(
      0,
      Math.ceil(relatedProducts.length / itemsPerPage) - 1
    );
    if (currentIndex < maxIndex) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (trackRef.current && relatedProducts.length > 0) {
      console.log("Track Ref:", trackRef.current);
      const itemWidth = trackRef.current.children[0]?.offsetWidth || 234;
      const scrollPosition = currentIndex * itemWidth * itemsPerPage;
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
        <span>Sản phẩm thường mua cùng</span>
      </p>
      <div className="box-scroll p-slide">
        <div className="listproduct owl-carousel owl-loaded owl-drag">
          <div className="owl-stage-outer">
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
                      <h3>{item.name || "Tên sản phẩm"}</h3>
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
                      <p className="accessory-info">
                        Danh mục hỗ trợ: {item.accessoryFor.join(", ")}
                      </p>
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

export default ProductOftenBoughtTogether;
