import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { FaTimes, FaCamera, FaRegThumbsUp } from "react-icons/fa";
import RatingSummary from "./RatingSummary";
import RatingBreakdown from "./RatingBreakdown";
import ReviewModal from "../modals/ReviewModal";
import ToggleLikeReview from "./ToggleLikeReview";
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

  const fetchProduct = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/phones/${productId}`
      );
      // setProduct(response.data.data);
      const productData = response.data.data;
      console.log("API response for product:", productData); // Debug: Kiểm tra product từ API
      if (productData && productData._id) {
        setProduct(productData);
        console.log("Product set with ID:", productData._id); // Debug
      } else {
        console.error("Product data missing ID:", productData); // Debug lỗi
        setError("Product data missing ID");
      }
    } catch (err) {
      setError("Failed to fetch product details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
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

  const modalProductId = product._id || product.id || productId;

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
                  <li
                    key={review._id || review.id}
                    className="par"
                    style={{ height: 100 }}
                  >
                    <div
                      className="cmt-top"
                      style={{
                        position: "relative",
                        top: 15,
                      }}
                    >
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
                      {/* <a
                        href="#"
                        className="cmtl dot-circle-ava"
                        data-like={review.likes || 0}
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                      > */}
                      {/* <FaRegThumbsUp />
                        Hữu ích ({review.likes || 0}) */}
                      <ToggleLikeReview
                        reviewId={review._id}
                        initialLikes={review.likes || 0}
                        initialLikedBy={review.likedBy || []}
                      />
                      {/* </a> */}
                      <span
                        className="cmtd dot-line"
                        style={{ paddingLeft: 0 }}
                      >
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
                  productId={modalProductId}
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
