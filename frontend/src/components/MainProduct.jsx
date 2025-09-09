import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RenderRating, formatQuantity } from "../utils/format";
import {
  FaRegStar,
  FaCircle,
  FaCartPlus,
  FaPhoneAlt,
  FaAngleDown,
} from "react-icons/fa";
import slugify from "slugify";
import "../css/MainProduct.css";
// import "../css/ProductDetailInfo.css";

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

  // console.log("MainProduct props:", {
  //   phone,
  //   soldQuantities,
  //   soldQuantity,
  //   availableStock,
  //   isOutOfStock,
  //   originalPrice,
  // }); // Debug chi tiết

  const stockPercentage =
    stock > 0 ? Math.min((availableStock / stock) * 100, 100) : 0;

  const navigate = useNavigate();

  const categorySlug =
    phone?.category?.slug ||
    phone?.categorySlug ||
    (phone?.name
      ? slugify(phone.name, { lower: true, strict: true })
      : "default-slug");

  // Hàm điều hướng đến trang chi tiết sản phẩm
  const handleClick = (event) => {
    event.preventDefault();
    if (phone._id && categorySlug) {
      navigate(`/product/${phone._id}/${categorySlug}`);
    } else {
      console.warn("Missing productId or categorySlug for navigation:", {
        productId: phone._id,
        categorySlug,
      });
      // Fallback nếu thiếu thông tin
      const fallbackSlug = slugify(name, { lower: true, strict: true });
      navigate(`/product/${phone._id || "unknown-id"}/${fallbackSlug}`);
    }
  };

  return (
    <li className=" item ajaxed __cate_42" key={phone._id}>
      <a href="#" className="main-contain" onClick={handleClick}>
        <div className="item-label">
          <span className="ln-new"></span>
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
          <span></span>
          {/* <span>{phone?.specifications?.screen.slice(0, 8)}</span> */}
        </div>
        <div className="prods-group">
          <ul>
            <li className="merge__item item act">
              {/* {phone?.specifications?.storage[0]} */}
            </li>
            <li className="merge__item item merge">
              {/* {phone?.specifications?.storage[1]} */}
            </li>
          </ul>
        </div>
        <strong className="price">
          {" "}
          {originalPrice > finalPrice && originalPrice.toLocaleString()}đ
        </strong>
        <div className="box-p">
          <p className="price-old black">{finalPrice}</p>
          <span className="percent">{-discountPercentage}%</span>
        </div>
        <p className="item-gift">
          <b></b>
        </p>
        <div className="item-bottom">
          {/* <a href="#" className="shipping"></a> */}
        </div>
        <div className="rating_Compare has_compare has_quantity">
          <div className="vote-txt">
            <FaRegStar />
            <b></b>
          </div>
          <span>Đã bán {soldQuantities[phone._id || 0]}</span>
        </div>
      </a>
    </li>
  );
};

export default MainProduct;
