import React, { useState } from "react";
import ReviewModal from "./ReviewModal";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../css/ProductDetailInfo.css";

const ModalHeader = ({ onClose }) => {
  const handleCloseClick = (e) => {
    e.preventDefault(); // Ngăn chặn hành vi mặc định nếu cần
    console.log("Close button clicked"); // Debug để kiểm tra sự kiện
    if (onClose) onClose(); // Kiểm tra onClose tồn tại
  };
  return (
    <div className="close-rate">
      <button
        onClick={handleCloseClick}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
        style={{
          top: "0px",
          height: "24px",
          background: "white",
          color: "#000",
          cursor: "pointer",
          zIndex: 1002, // Đảm bảo button trên cùng
          border: "none", // Loại bỏ border mặc định nếu có
        }}
      >
        <X
          className="w-5 h-5"
          onClick={handleCloseClick}
          style={{
            cursor: "pointer",
            pointerEvents: "none", // Không chặn event của button cha
          }}
        />
      </button>
    </div>
  );
};

export default ModalHeader;
