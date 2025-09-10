import React, { useState } from "react";
import ReviewModal from "./ReviewModal";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ModalHeader = ({ onClose }) => {
  return (
    <div className="close-rate">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ModalHeader;
