import React from "react";
import { FaStar } from "react-icons/fa";

const RatingSummary = ({ name, averageRating, reviewCount }) => {
  console.log("Name: ", name);
  console.log("Rating: ", averageRating);
  console.log("Review Count: ", reviewCount);
  return (
    <div className="point">
      <div className="point-average">
        <FaStar className="iconcmt-allstar" style={{ color: "yellow" }} />
        <div
          className="point-average-container"
          style={{ display: "flex", paddingLeft: "10px" }}
        >
          <p className="point-average-score">{averageRating || 0}</p>
          <p className="point-average-total">/5</p>
        </div>
      </div>
      <div className="point-satisfied-container">
        <p className="point-satisfied"></p>
        <div className="point-explain">
          <b>Ai là Khách hàng hài lòng?</b>
          <span>
            Gồm các khách hàng đã đánh giá 5 sao và khách hàng mua hàng nhưng
            chưa đánh giá từ 01/2022.
          </span>
        </div>
        <span className="point-alltimerate">{reviewCount} đánh giá</span>
      </div>
    </div>
  );
};

export default RatingSummary;
