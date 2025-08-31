import React from "react";
import { RenderRating, formatQuantity } from "../utils/format";
import {
  FaRegStar,
  FaCircle,
  FaCartPlus,
  FaPhoneAlt,
  FaAngleDown,
} from "react-icons/fa";

const MainProduct = ({ phone, soldQuantities, toggleLike, purchasePhone }) => {
  const originalPrice = phone.price || 0;
  const finalPrice = phone.finalPrice || originalPrice;
  const discountPercentage =
    originalPrice === 0
      ? 0
      : phone.discount?.discountValue ||
        (((originalPrice - finalPrice) / originalPrice) * 100).toFixed(0) ||
        0;
  const quantity = phone.quantity || 0;
  const stock = phone.stock || 0;
  const reserved = phone.reserved || 0;
  const availableStock = stock - reserved;
  const like = phone.likedBy?.length || 0;
  const userId = localStorage.getItem("userId");
  const userLiked = phone.likedBy?.some(
    (likedById) => likedById.toString() === userId
  );
  const rating = phone.rating || 0;
  const isOutOfStock = availableStock <= 0;
  const soldQuantity = soldQuantities?.[phone._id] || 0; // Default to 0 if undefined
  const name = phone?.name || "";
  const image = phone?.image || "";
  const images = phone?.images?.alt || "";
  const discountImage = phone?.discount?.discountImage || null;
  const discountCode = phone?.discount?.code || "";

  console.log("MainProduct props:", {
    phone,
    soldQuantities,
    soldQuantity,
    availableStock,
    isOutOfStock,
    originalPrice,
  }); // Debug chi tiết

  const stockPercentage =
    stock > 0 ? Math.min((availableStock / stock) * 100, 100) : 0;

  return (
    <li className=" item ajaxed __cate_42" key={phone._id}>
      <a href="#" className="main-contain ">
        <div className="item-label">
          <span className="ln-new">
            {discountPercentage > 0 && `-${discountPercentage}%`}
          </span>
        </div>
        <div className="item-img item-img_42">
          <img
            src={
              image ||
              (phone.images && phone.images[0]?.url) ||
              "https://via.placeholder.com/200"
            }
            alt={images}
            className="thumb"
          />
        </div>
        <p className="result-label temp1">
          {/* <img
                src={discountImage}
                alt={discountCode}
                width="20px"
                height="20px"
              /> */}
          {discountImage && (
            <img
              src={discountImage}
              alt={discountCode}
              width="20px"
              height="20px"
            />
          )}
          <span>{discountCode}</span>
        </p>
        <h3>
          {name}
          <span></span>
        </h3>
        <div className="item-compare gray-bg">
          <span>{finalPrice.toLocaleString()}đ</span>
          <span>
            {" "}
            {originalPrice > finalPrice && originalPrice.toLocaleString()}đ
          </span>
        </div>
        <div className="prods-group">
          <ul>
            <li className="merge__item item act"></li>
            <li className="merge__item item"></li>
          </ul>
        </div>
        <strong className="price"></strong>
        <p className="item-gift">
          <b></b>
        </p>
        <div className="item-bottom">
          <a href="#" className="shipping"></a>
        </div>
        <div className="rating_Compare has_compare has_quantity">
          <div className="vote-txt">
            <FaRegStar />
            <b></b>
          </div>
          <span>Đã bán</span>
        </div>
      </a>
    </li>
  );
};

export default MainProduct;
