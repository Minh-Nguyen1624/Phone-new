import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { ThumbsUp } from "lucide-react"; // Icon thumbs up từ Lucide React

const API_URL = "http://localhost:8080/api";

const ToggleLikeReview = ({ reviewId, initialLikes, initialLikedBy = [] }) => {
  const [likes, setLikes] = useState(initialLikes); // Số like ban đầu
  const [isLiked, setIsLiked] = useState(false); // Trạng thái liked của user hiện tại
  const [loading, setLoading] = useState(false); // Loading khi gọi API
  const [error, setError] = useState(null); // Lỗi nếu có

  const currentUserId = localStorage.setItem("userId", likes);

  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);
    setError(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Bạn cần đăng nhập để like");
        return;
      }

      const response = await axios.post(
        `${API_URL}/reviews/${reviewId}/like`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Cập nhật state local
        if (isLiked) {
          setLikes(likes - 1);
          setIsLiked(false);
        } else {
          setLikes(likes + 1);
          setIsLiked(true);
        }
        console.log("Toggle like success:", response.data); // Debug
      }
    } catch (error) {
      console.error(
        "Toggle like error:",
        error.response?.data || error.message
      );
      if (error.response?.status === 401) {
        setError("Token hết hạn, vui lòng đăng nhập lại!");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
      } else {
        setError("Lỗi khi like review!");
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Kiểm tra user hiện tại có trong likedBy không
    setIsLiked(initialLikedBy.some((id) => id.toString() === currentUserId));
  }, [initialLikedBy, currentUserId]);

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className="like-button"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        background: "none",
        border: "none",
        color: "#666",
        fontSize: "12px",
      }}
    >
      <ThumbsUp
        size={15}
        fill={isLiked ? "#4CAF50" : "none"}
        stroke={isLiked ? "#4CAF50" : "#666"}
        strokeWidth={2}
      />
      <span style={{ fontSize: 12 }}>Hữu ích ({likes})</span>
      {error && (
        <span style={{ color: "red", fontSize: 12, marginLeft: 5 }}>
          {error}
        </span>
      )}
    </button>
  );
};

export default ToggleLikeReview;
