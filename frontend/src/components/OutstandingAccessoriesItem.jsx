import React from "react";
import { useNavigate } from "react-router-dom";
import slugify from "slugify"; // Cần cài đặt: npm install slugify

const OutstandingAccessoriesItem = ({ accessory }) => {
  // console.log("Props in OutstandingAccessoriesItem - accessory:", {
  //   _id: accessory?._id,
  //   name: accessory?.name,
  //   category: accessory?.category,
  //   categorySlug: accessory?.category?.slug,
  //   imageUrl: accessory?.category?.imageUrl,
  //   price: accessory?.price,
  // });

  const navigate = useNavigate();

  const toCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  const getShortName = (name) => {
    const words = name.split(" ");
    return words.slice(0, 2).join(" ") || name;
  };

  const imageUrl = accessory?.category?.imageUrl
    ? accessory?.category?.imageUrl.startsWith("https")
      ? accessory?.category?.imageUrl
      : `${window.location.origin}${accessory?.category?.imageUrl || ""}`
    : "https://via.placeholder.com/64";

  const name = accessory?.category?.name || accessory?.name || "Tên phụ kiện";
  const categorySlug =
    accessory?.category?.slug ||
    accessory?.categorySlug ||
    (accessory?.name
      ? slugify(accessory.name, { lower: true, strict: true })
      : "default-slug");

  const handleClick = (event) => {
    event.preventDefault();
    if (categorySlug) {
      // console.log(`Navigating to /category/${categorySlug}`);
      navigate(`/category/${categorySlug}`);
    } else {
      console.warn(
        "No category slug available for navigation. Using name as fallback:",
        name
      );
      const fallbackSlug = slugify(name, { lower: true, strict: true });
      navigate(`/category/${fallbackSlug}`);
    }
  };

  return (
    <div className="accessory-products-category">
      <a href="#" className="accessory-product-link" onClick={handleClick}>
        <img src={imageUrl} alt={name} width="64px" height="64px" />
        <p>{toCapitalize(getShortName(name))}</p>
      </a>
    </div>
  );
};

export default OutstandingAccessoriesItem;
