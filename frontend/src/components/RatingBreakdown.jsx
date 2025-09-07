import React from "react";
import { FaStar } from "react-icons/fa";

const RatingBreakdown = ({ reviews }) => {
  const calculatePercentage = (star) => {
    if (!reviews || reviews.length === 0) return 0;
    const starCount = reviews.filter((r) => r.rating === star).length;
    return reviews.length > 0
      ? ((starCount / reviews.length) * 100).toFixed(1)
      : 0;
  };

  return (
    <ul className="rate-list">
      {[5, 4, 3, 2, 1].map((star) => (
        <li key={star}>
          <div className="number-star">
            {star}
            <FaStar
              style={{ margin: "0 4px", marginBottom: 4, color: "yellow" }}
            />
          </div>
          <div className="timeline-star">
            <p
              className="timing"
              style={{ width: `${calculatePercentage(star)}%` }}
            ></p>
          </div>
          <span className="number-percent">{calculatePercentage(star)}%</span>
        </li>
      ))}
    </ul>
  );
};

export default RatingBreakdown;
