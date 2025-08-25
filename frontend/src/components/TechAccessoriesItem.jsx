import React from "react";
import { useNavigate } from "react-router-dom";
import slugify from "slugify"; // Cần cài đặt: npm install slugify

const TechAccessoriesItem = ({ accessory }) => {
  //   console.log("Props in TechAccessoriesItem - accessory: ", {
  //     _id: accessory?._id,
  //     name: accessory?.name,
  //     category: accessory?.category,
  //     categorySlug: accessory?.category?.slug,
  //     imageUrl: accessory?.category?.imageUrl,
  //     price: accessory?.price, // Log giá để debug
  //   });

  const navigate = useNavigate();

  const topCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  // Xử lý imageUrl
  const imageUrl = accessory?.category?.imageUrl
    ? accessory?.category?.imageUrl.startsWith("https")
      ? accessory?.category?.imageUrl
      : `${window.location.origin}${accessory?.category?.imageUrl || ""}`
    : "https://via.placeholder.com/64";

  const name = accessory?.category?.name || accessory?.name || "Tên phụ kiện";
  const categoryName = accessory?.category?.name || "Danh mục không xác định"; // Lấy tên danh mục
  const categorySlug =
    accessory?.category?.slug ||
    accessory?.categorySlug ||
    (accessory?.name
      ? slugify(accessory.name, { lower: true, strict: true })
      : "default-slug");
  const price = accessory?.price
    ? `${accessory.price.toLocaleString()} VNĐ`
    : "Giá không có"; // Định dạng giá

  const handleClick = (event) => {
    event.preventDefault();
    if (categorySlug) {
      //   console.log(`Navigating to /category/${categorySlug}`);
      navigate(`/category/${categorySlug}`);
    } else {
      //   console.warn(
      //     "No category slug available for navigation. Using name as fallback:",
      //     name
      //   );
      const fallbackSlug = slugify(name, { lower: true, strict: true });
      navigate(`/category/${fallbackSlug}`);
    }
  };

  return (
    <li>
      <a href="#" className="accessory-options" onClick={handleClick}>
        <img width="50" height="50" src={imageUrl} alt={name} />
        <div className="accessory-info">
          <span>{topCapitalize(name)}</span>
          <span>Chỉ từ: {price}</span>
        </div>
      </a>
    </li>
  );
};

export default TechAccessoriesItem; // Sửa tên export cho đúng
