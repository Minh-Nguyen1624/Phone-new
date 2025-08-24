// import React from "react";
// import { useNavigate } from "react-router-dom"; // Để điều hướng
// import "../css/Accessory.css";

// const OutstandingAccessoriesItem = ({ accessory }) => {
//   console.log("Props in OutstandingAccessoriesItem - accessory:", accessory);

//   const navigate = useNavigate();

//   const toCapitalize = (str) => {
//     return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
//   };

//   const getShortName = (name) => {
//     const words = name.split(" ");
//     return words.slice(0, 2).join(" ") || name;
//   };

//   const imageUrl = accessory?.category?.imageUrl || "path/to/default-image.jpg";
//   const name = accessory?.category?.name || "Tên phụ kiện";

//   // Xử lý click để tạo slug và điều hướng
//   const handleClick = () => {
//     const categorySlug = name
//       .toLowerCase()
//       .normalize("NFD") // Xử lý dấu tiếng Việt
//       .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
//       .replace(/\s+/g, "-") // Thay khoảng trắng bằng dấu gạch ngang
//       .replace(/[^a-z0-9-]/g, ""); // Loại bỏ ký tự đặc biệt
//     navigate(`/category/${categorySlug}`);
//   };

//   return (
//     <div className="accessory-products-category">
//       <a href="#" className="accessory-product-link" onClick={handleClick}>
//         <img src={imageUrl} alt={name} width="64px" height="64px" />
//         <p>{toCapitalize(getShortName(name))}</p>
//       </a>
//     </div>
//   );
// };

// export default OutstandingAccessoriesItem;

import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/Accessory.css";

const OutstandingAccessoriesItem = ({ accessory }) => {
  console.log("Props in OutstandingAccessoriesItem - accessory:", accessory);

  const navigate = useNavigate();

  const toCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  const getShortName = (name) => {
    const words = name.split(" ");
    return words.slice(0, 2).join(" ") || name;
  };

  const imageUrl = accessory?.category?.imageUrl || "path/to/default-image.jpg";
  const name = accessory?.category?.name || "Tên phụ kiện";
  const categorySlug = accessory.categorySlug || accessory?.category?.slug; // Sử dụng slug từ API

  const handleClick = (event) => {
    event.preventDefault(); // Ngăn chặn sự kiện mặc định của thẻ a
    if (categorySlug) {
      navigate(`/category/${categorySlug}`);
    } else {
      console.warn(
        "No category slug available for navigation. Using name as fallback:",
        name
      );
      // Fallback: Sử dụng name để tạo slug tạm thời (không khuyến nghị lâu dài)
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
