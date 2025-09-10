import React, { useState, useEffect, useRef } from "react";
import {
  FaRegStar,
  FaCircle,
  FaCartPlus,
  FaPhoneAlt,
  FaAngleDown,
  FaAngleUp,
} from "react-icons/fa";
import ProductMain from "./ProductMain";
import ProductName from "./ProductName";
import ProductDetailLink from "./ProductDetailLink";
import "../css/ProductDetailInfo.css";

const ProductDetailInfo = ({ product, topCapitalize, navigate }) => {
  const imageUrl = product?.image
    ? product?.image.startsWith("https")
      ? product?.image
      : `${API_URL}${product?.image || ""}`
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

  const specificationFields = product?.category.specificationFields;
  const fields = specificationFields?.[0]?.fields;

  const initialIsOpen = [false, false, false, false];
  const [isOpen, setIsOpen] = useState(initialIsOpen);
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
      const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
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

  const handAddToCart = (productToCart) => {
    alert(`Sản phẩm ${productToCart} đã được thêm vào giỏ hàng`);
    console.log(productToCart);
  };

  useEffect(() => {
    if (trackRef.current) {
      const itemWidth = trackRef.current.children[0]?.offsetWidth || 0;
      const scrollPosition = currentIndex * itemWidth * itemsPerPage;
      smoothScroll(trackRef.current, scrollPosition, 600);
    }
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleClickEvent = (index, event) => {
    event.preventDefault();
    setIsOpen((prev) => {
      if (!Array.isArray(prev)) {
        console.error(
          "isOpen is not an array, resetting to initial state:",
          initialIsOpen
        );
        return [...initialIsOpen];
      }
      const newIsOpen = [...prev];
      newIsOpen[index] = !newIsOpen[index];
      return newIsOpen;
    });
  };

  return (
    <>
      <section className="product-detail">
        <ProductDetailLink product={product} />
        <ProductName name={name} product={product} />
        <ProductMain
          product={product}
          handlePrev={handlePrev}
          handleNext={handleNext}
          handleClickEvent={handleClickEvent}
          isOpen={isOpen}
          specifications={specifications}
          images={images}
          handAddToCart={handAddToCart}
          // handleClickEvent={handleClickEvent}
          isActive={isActive}
          toggleIsActive={toggleIsActive}
          color={color}
        />
      </section>
    </>
  );
};

export default ProductDetailInfo;
