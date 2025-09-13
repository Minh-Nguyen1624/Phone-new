import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as farFaStar } from "@fortawesome/free-regular-svg-icons"; // Sao rỗng
import { faStar as fasFaStar } from "@fortawesome/free-solid-svg-icons";
import "../css/ProductDetailInfo.css";

const RatingStars = ({ rating, setRating }) => {
  const stars = [1, 2, 3, 4, 5];
  const labels = ["Rất tệ", "Tệ", "Tạm ổn", "Tốt", "Rất tốt"];
  const [selectedLabel, setSelectedLabel] = useState(null); // State để hiển thị label khi click

  const handleStarClick = (star) => {
    setRating(star);
    setSelectedLabel(labels[star - 1]); // Hiển thị label tương ứng khi click
  };

  const handleLabelHide = () => {
    setSelectedLabel(null); // Ẩn label khi click vào
  };

  // Tùy chọn: Ẩn label tự động sau 2 giây
  useEffect(() => {
    if (selectedLabel) {
      const timer = setTimeout(() => setSelectedLabel(null), 2000); // Ẩn sau 2 giây
      return () => clearTimeout(timer);
    }
  }, [selectedLabel]);

  return (
    <div
      className="rating-container"
      style={{ position: "relative", display: "inline-block" }}
    >
      <ul className="rating-topzonecr-star">
        {stars.map((star) => (
          <li
            key={star}
            data-rate={star}
            onClick={() => handleStarClick(star)}
            className={star <= rating ? "active" : ""}
            style={{
              fontSize: "40px",
              height: "38px",
              color: "#ffbd52",
              position: "relative",
              top: 30,
              paddingRight: "8px",
            }}
          >
            <FontAwesomeIcon icon={star <= rating ? fasFaStar : farFaStar} />
            <div style={{ fontSize: 14, color: "#C0C0C0" }}>
              {labels[star - 1]}
            </div>
          </li>
        ))}
      </ul>
      {selectedLabel && (
        <div
          className="star-label"
          style={{
            position: "absolute",
            top: "-30px",
            left: `${(rating - 1) * 25}px`, // Vị trí dựa trên sao được chọn
            background: "#333",
            color: "white",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            zIndex: 1002,
          }}
          onClick={handleLabelHide} // Ẩn khi click vào label
        >
          {selectedLabel}
        </div>
      )}
    </div>
  );
};

export default RatingStars;
