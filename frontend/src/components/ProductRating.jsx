// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";
// import RatingSummary from "./RatingSummary";
// import RatingBreakdown from "./RatingBreakdown";
// import ReviewModal from "../modals/ReviewModal";
// import "../css/ProductDetailInfo.css";

// const ProductRating = () => {
//   const { productId } = useParams();
//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [showAllReviews, setShowAllReviews] = useState(false); // State để kiểm soát xem tất cả review

//   console.log("Product: ", product);

//   useEffect(() => {
//     const fetchProduct = async () => {
//       try {
//         const response = await axios.get(
//           `http://localhost:8080/api/phones/${productId}`
//         );
//         setProduct(response.data.data);
//       } catch (err) {
//         setError("Failed to fetch product details");
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchProduct();
//   }, [productId]);

//   // Hàm mở modal
//   const handleOpenModal = () => {
//     setIsModalOpen(true);
//   };

//   // Hàm đóng modal và làm mới dữ liệu
//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     fetchProduct(); // Làm mới dữ liệu sau khi đóng modal
//   };

//   // Hàm toggle xem tất cả review
//   const handleShowAllReviews = () => {
//     setShowAllReviews(!showAllReviews);
//   };

//   if (loading) return <p>Loading...</p>;
//   if (error) return <p>{error}</p>;
//   if (!product) return <p>No product data available</p>;

//   // Giới hạn số review hiển thị (ví dụ: 2 review ban đầu)
//   const visibleReviews = showAllReviews
//     ? product.reviews || []
//     : (product.reviews || []).slice(0, 2);

//   return (
//     <div className="wrap_rating wrap_border">
//       <div className="bg_caoverrate"></div>
//       <div className="rating-topzone">
//         <div className="rating-topzonecmt-hascmt">
//           <div className="boxrate rate-topzone">
//             <h2 className="boxrate__title">Đánh giá {product.name}</h2>
//             <div className="boxrate__top" style={{ marginTop: "30px" }}>
//               <div
//                 className="box-star v2 not-has-gallery"
//                 style={{
//                   display: "flex",
//                   width: "100%",
//                   flexWrap: "wrap",
//                   justifyContent: "space-between",
//                   borderRight: "unset",
//                   borderLeft: "unset",
//                   margin: "unset",
//                   padding: "unset",
//                   alignItems: "center",
//                 }}
//               >
//                 <RatingSummary
//                   name={product.name}
//                   averageRating={product.averageRating}
//                   reviewCount={product.reviews?.length || 0}
//                 />
//                 <RatingBreakdown reviews={product.reviews || []} />
//               </div>
//             </div>
//             <div className="rt-list">
//               <ul className="comment-list">
//                 {visibleReviews.map((review) => (
//                   <li key={review._id || review.id} className="par">
//                     <div className="cmt-top">
//                       <p className="cmt-top-name">
//                         {review.user.username || "Anonymous"}
//                       </p>
//                       <div className="confirm-buy">
//                         <i className="iconcmt-confirm"></i>
//                         Đã mua tại TGDĐ
//                       </div>
//                     </div>
//                     <div className="cmt-intro">
//                       <div className="cmt-top-star">
//                         {Array(5)
//                           .fill()
//                           .map((_, index) => (
//                             <i
//                               key={index}
//                               className={`iconcmt-starbuy ${
//                                 index < Math.round(review.rating)
//                                   ? "active"
//                                   : ""
//                               }`}
//                             ></i>
//                           ))}
//                       </div>
//                       {review.agreeRecommend && (
//                         <p className="txt-intro">
//                           <i className="iconcmt-heart"></i>Sẽ giới thiệu cho bạn
//                           bè, người thân
//                         </p>
//                       )}
//                     </div>
//                     <div className="cmt-content">
//                       <p className="cmt-txt">{review.content}</p>
//                     </div>
//                     <div className="cmt-command">
//                       <a
//                         href="#"
//                         className="cmtl dot-circle-ava"
//                         data-like={review.likes || 0}
//                       >
//                         <i className="iconcmt-thumpup"></i>Hữu ích (
//                         {review.likes || 0})
//                       </a>
//                       <span className="cmtd dot-line">
//                         Đã đăng vào ngày {review.createdAt || "1 ngày"}
//                       </span>
//                     </div>
//                   </li>
//                 ))}
//               </ul>

//               <div className="box-flex">
//                 {/* Nút 1: Xem tất cả review */}
//                 {product.reviews && product.reviews.length > 2 && (
//                   <button
//                     className="btn-view-all white mt-4"
//                     style={{
//                       marginRight: "10px",
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "8px",
//                     }}
//                     onClick={handleShowAllReviews}
//                   >
//                     <span>
//                       {showAllReviews ? "Ẩn bớt" : "Xem tất cả review"}
//                     </span>
//                   </button>
//                 )}
//                 {/* Nút 2: Đánh giá sản phẩm */}
//                 <button
//                   className="btn-buynow white mt-4"
//                   style={{ display: "flex", alignItems: "center", gap: "8px" }}
//                   onClick={handleOpenModal}
//                 >
//                   <span>Viết đánh giá</span>
//                 </button>
//                 <ReviewModal
//                   product={product}
//                   isOpen={isModalOpen}
//                   onClose={handleCloseModal}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ProductRating;

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import RatingSummary from "./RatingSummary";
import RatingBreakdown from "./RatingBreakdown";
import ReviewModal from "../modals/ReviewModal";
import "../css/ProductDetailInfo.css";

const ProductRating = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  console.log("Product: ", product);
  console.log("isModalOpen: ", isModalOpen); // Debug trạng thái modal

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8080/api/phones/${productId}`
        );
        setProduct(response.data.data);
      } catch (err) {
        setError("Failed to fetch product details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleOpenModal = () => {
    console.log("Opening modal..."); // Debug sự kiện click
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    fetchProduct(); // Làm mới dữ liệu sau khi đóng modal
  };

  const handleShowAllReviews = () => {
    setShowAllReviews(!showAllReviews);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!product) return <p>No product data available</p>;

  const visibleReviews = showAllReviews
    ? product.reviews || []
    : (product.reviews || []).slice(0, 2);

  return (
    <div className="wrap_rating wrap_border">
      <div className="bg_caoverrate"></div>
      <div className="rating-topzone">
        <div className="rating-topzonecmt-hascmt">
          <div className="boxrate rate-topzone">
            <h2 className="boxrate__title">Đánh giá {product.name}</h2>
            <div className="boxrate__top" style={{ marginTop: "30px" }}>
              <div
                className="box-star v2 not-has-gallery"
                style={{
                  display: "flex",
                  width: "100%",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  borderRight: "unset",
                  borderLeft: "unset",
                  margin: "unset",
                  padding: "unset",
                  alignItems: "center",
                }}
              >
                <RatingSummary
                  name={product.name}
                  averageRating={product.averageRating}
                  reviewCount={product.reviews?.length || 0}
                />
                <RatingBreakdown reviews={product.reviews || []} />
              </div>
            </div>
            <div className="rt-list">
              <ul className="comment-list">
                {visibleReviews.map((review) => (
                  <li key={review._id || review.id} className="par">
                    <div className="cmt-top">
                      <p className="cmt-top-name">
                        {review.user?.username || "Anonymous"}
                      </p>
                      <div className="confirm-buy">
                        <i className="iconcmt-confirm"></i>
                        Đã mua tại TGDĐ
                      </div>
                    </div>
                    <div className="cmt-intro">
                      <div className="cmt-top-star">
                        {Array(5)
                          .fill()
                          .map((_, index) => (
                            <i
                              key={index}
                              className={`iconcmt-starbuy ${
                                index < Math.round(review.rating)
                                  ? "active"
                                  : ""
                              }`}
                            ></i>
                          ))}
                      </div>
                      {review.agreeRecommend && (
                        <p className="txt-intro">
                          <i className="iconcmt-heart"></i>Sẽ giới thiệu cho bạn
                          bè, người thân
                        </p>
                      )}
                    </div>
                    <div className="cmt-content">
                      <p className="cmt-txt">{review.content}</p>
                    </div>
                    <div className="cmt-command">
                      <a
                        href="#"
                        className="cmtl dot-circle-ava"
                        data-like={review.likes || 0}
                      >
                        <i className="iconcmt-thumpup"></i>Hữu ích (
                        {review.likes || 0})
                      </a>
                      <span className="cmtd dot-line">
                        Đã đăng vào ngày {review.createdAt || "1 ngày"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="box-flex">
                {product.reviews && product.reviews.length > 2 && (
                  <button
                    className="btn-view-all white mt-4"
                    style={{
                      marginRight: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onClick={handleShowAllReviews}
                  >
                    <span>
                      {showAllReviews ? "Ẩn bớt" : "Xem tất cả review"}
                    </span>
                  </button>
                )}
                <button
                  className="btn-buynow white mt-4"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={handleOpenModal}
                >
                  <span>Viết đánh giá</span>
                </button>
                {isModalOpen && (
                  <div
                    className="modal-backdrop"
                    onClick={handleCloseModal}
                    style={{ zIndex: 1000 }}
                  />
                )}
                <ReviewModal
                  product={product}
                  isOpen={isModalOpen}
                  onClose={handleCloseModal}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductRating;
