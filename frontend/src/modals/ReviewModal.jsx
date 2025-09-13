import React, { useState, useEffect } from "react";
import { FaTimes, FaCamera, FaRegThumbsUp } from "react-icons/fa";
import axios from "axios";
import ModalHeader from "./ModalHeader";
import ReviewForm from "./ReviewForm";
import ResponseMessage from "./ResponseMessage";
import RatingStars from "./RatingStars";
import ToggleLikeReview from "../components/ToggleLikeReview";
import "../css/ProductDetailInfo.css";

const API_URL = "http://localhost:8080/api";

const ReviewModal = ({ productId, product, onClose, isOpen }) => {
  const [finalProductId, setFinalProductId] = useState(
    productId || product?.id || ""
  );
  const [userId, setUserId] = useState("");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [agreeRecommend, setAgreeRecommend] = useState(false);
  const [images, setImages] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectImage, setSelectImage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("ReviewModal props:", {
      productId,
      productIdFromProduct: product?.id,
      productIdFromMongo: product?._id,
    });
    setFinalProductId(productId || product?._id || product?.id || "");
    if (finalProductId) {
      console.log("Final Product ID set to:", finalProductId);
    }
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
      setIsAuthenticated(true);
      console.log("User ID set to:", storedUserId);
    } else {
      setIsAuthenticated(false);
      console.log("No user ID found");
    }
  }, [productId, product]);

  const fetchCommentData = async (formData) => {
    try {
      // Lấy token từ localStorage (giả định lưu sau login với key "token")
      const token = localStorage.getItem("token"); // Hoặc "authToken" tùy cách lưu của bạn
      console.log("Token from localStorage:", token ? "Present" : "Missing"); // Debug

      const headers = { "Content-Type": "multipart/form-data" };
      if (token) {
        headers.Authorization = `Bearer ${token}`; // Thêm Bearer token
        console.log(
          "Adding Authorization header:",
          `Bearer ${token.substring(0, 20)}...`
        ); // Debug (ẩn phần token)
      } else {
        console.warn("No token found – request will fail authentication");
      }

      console.log("Sending request to:", `${API_URL}/reviews/add`);
      const response = await axios.post(`${API_URL}/reviews/add`, formData, {
        headers,
      });
      console.log("Server response:", response.data);
      setResponse({
        type: "success",
        message: `Gửi đánh giá thành công: ${JSON.stringify(response.data)}`,
      });
      setContent("");
      setRating(0);
      setImages([]);
      setAgreePolicy(false);
      setAgreeRecommend(false);
      setShowForm(false);
      onClose();
    } catch (error) {
      console.error("Error details:", error.response?.data || error.message);
      let errorMsg = "Lỗi không xác định khi gửi đánh giá";
      if (error.response?.status === 401) {
        errorMsg =
          "Bạn cần đăng nhập để tiếp tục. Token hết hạn hoặc không hợp lệ.";
        // Tự động xóa token nếu 401
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        setIsAuthenticated(false);
      } else {
        errorMsg = error.response?.data?.message || error.message;
      }
      setResponse({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    console.log("File input triggered");
    const files = Array.from(e.target.files);
    if (files.length + images.length > 3) {
      setResponse({ type: "error", message: "Chỉ được upload tối đa 3 ảnh" });
      return;
    }
    setImages([...images, ...files]);
  };

  const resetForm = () => {
    setRating(0);
    setContent("");
    setImages([]);
    setAgreePolicy(false);
    setAgreeRecommend(false);
    setShowForm(false);
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return; // Ngăn double submit

    setLoading(true);
    setResponse(null);

    // Re-check localStorage for userId and token
    const currentUserId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    if (currentUserId) {
      setUserId(currentUserId);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    console.log("Form data before submit:", {
      productId: finalProductId,
      userId: currentUserId,
      tokenPresent: !!token,
      rating,
      content,
      agreePolicy,
      images: images.length,
    });

    if (!isAuthenticated || !token) {
      setResponse({
        type: "error",
        message: (
          <>
            Bạn cần{" "}
            <a
              href="/login"
              style={{ color: "#535bf2", textDecoration: "underline" }}
            >
              đăng nhập
            </a>{" "}
            để gửi đánh giá! (Token thiếu hoặc hết hạn)
          </>
        ),
      });
      setLoading(false);
      return;
    }

    if (!finalProductId || !currentUserId) {
      setResponse({
        type: "error",
        message: "Vui lòng đảm bảo sản phẩm và người dùng hợp lệ!",
      });
      setLoading(false);
      return;
    }
    if (!agreePolicy) {
      setResponse({
        type: "error",
        message: "Bạn cần đồng ý với chính sách xử lý dữ liệu!",
      });
      setLoading(false);
      return;
    }
    if (rating === 0) {
      setResponse({ type: "error", message: "Vui lòng chọn số sao đánh giá!" });
      setLoading(false);
      return;
    }
    if (!content.trim()) {
      setResponse({ type: "error", message: "Nội dung không được để trống!" });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("phone", finalProductId);
    formData.append("user", currentUserId);
    formData.append("rating", rating);
    formData.append("content", content);
    formData.append("consent", agreePolicy);
    formData.append("agreeRecommend", agreeRecommend);
    images.forEach((image) => formData.append("images", image));

    fetchCommentData(formData);
  };

  const modalHeight = showForm ? "90%" : "350px";

  return (
    <section className="popup-rating-topzone" style={{ height: modalHeight }}>
      <ModalHeader
        onClose={() => {
          resetForm();
          if (onClose) onClose();
        }}
      />
      <section className="modal-content">
        <p
          className="modal-title"
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            height: "64.8px",
            borderBottom: "1px solid #eeeeee",
            alignItems: "center",
            letterSpacing: "-0.02em",
            lineHeight: "67px",
          }}
        >
          Đánh giá sản phẩm
        </p>
        <div
          className="product-info"
          style={{ position: "relative", top: "20px" }}
        >
          <img
            src={product?.image || "/placeholder.jpg"}
            alt={product?.name}
            style={{ width: 100, height: 100 }}
          />
          <p>{product?.name}</p>
        </div>
        <RatingStars
          rating={rating}
          setRating={(star) => {
            setRating(star);
            setShowForm(true);
          }}
        />
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="review-form form-rate"
            style={{ position: "relative", top: 50 }}
          >
            <div className="inputrating__group">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mời bạn chia sẻ thêm cảm nhận..."
                className="form-textarea"
              />
              <div className="txtcount__box">
                <span className="ct" style={{ display: "none" }}>
                  0 chữ
                </span>
              </div>
              <div className="form-column">
                <div className="upload__box">
                  <div className="upload__btn-box">
                    <label
                      className="upload__btn"
                      htmlFor="hdFileRatingUploadv2"
                    >
                      <span className="send-img">
                        <FaCamera
                          style={{ width: 16, height: 16, marginRight: 5 }}
                        />
                        <p>
                          Gửi ảnh thực tế <span>(tối đa 3 ảnh)</span>
                        </p>
                      </span>
                      <input
                        id="hdFileRatingUploadv2"
                        name="hdfRatingImg"
                        type="file"
                        multiple
                        accept="image/x-png, image/gif, image/jpeg"
                        data-max_length="3"
                        className="upload__inputfile hide"
                        onChange={handleFileChange}
                      />
                      <input
                        type="hidden"
                        name="hdfRatingImg"
                        id="hdfRatingImg"
                        className="hdfRatingImg"
                        value=""
                      />
                      <input type="hidden" name="hdUrl" />
                    </label>
                    {images.length > 0 && (
                      <span
                        style={{
                          marginLeft: "10px",
                          color: "#666",
                          fontSize: "12px",
                        }}
                      >
                        {images.length} ảnh
                      </span>
                    )}
                  </div>
                  <div className="upload__img-wrap hide">
                    {images.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {images.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(image)}
                              alt="Preview"
                              className="w-16 h-16 object-cover rounded-md"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="agree">
                  <input
                    type="checkbox"
                    name="agreeRecommend"
                    id="checkbox_introduce"
                    checked={agreeRecommend}
                    onChange={(e) => setAgreeRecommend(e.target.checked)}
                  />
                  <p>Tôi sẽ giới thiệu sản phẩm cho bạn bè, người thân</p>
                </div>
              </div>
              <div className="item">
                <div
                  className="agree custom-cursor-on-hover"
                  id="agree-policy-rating"
                >
                  <input
                    type="checkbox"
                    name="agreePolicy"
                    id="checkbox_policy"
                    checked={agreePolicy}
                    onChange={(e) => setAgreePolicy(e.target.checked)}
                    required
                    style={{ width: 16, marginLeft: 0 }}
                  />
                  <p>
                    Tôi đồng ý với{" "}
                    <a href="/chinh-sach-xu-ly-du-lieu-ca-nhan" target="_blank">
                      Chính sách xử lý dữ liệu cá nhân
                    </a>{" "}
                    của Shop
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              style={{
                width: "100%",
                height: 50,
                borderRadius: 10,
                backgroundColor: "rgba(127, 184, 241, 1)",
                position: "relative",
                top: "20px",
              }}
            >
              {loading ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
            <p
              style={{
                textAlign: "center",
                marginTop: "10px",
                fontSize: "12px",
                color: "#666",
                padding: "0 15%",
                marginTop: 30,
              }}
            >
              {loading
                ? "Đang xử lý..."
                : response?.type === "success"
                ? "Gửi đánh giá thành công!"
                : response?.type === "error"
                ? response.message
                : showForm
                ? ""
                : "Vui lòng điền đầy đủ thông tin để gửi đánh giá"}
            </p>

            <div
              className="policy-links"
              style={{
                position: "absolute",
                display: "flex",
                justifyContent: "center",
                left: "15%",
                right: "15%",
              }}
            >
              <a
                href="/huong-dan-dang-binh-luan"
                style={{
                  paddingRight: "5px",
                  fontSize: "12px",
                  color: "#535bf2",
                }}
                target="_blank"
              >
                Quy định đánh giá
              </a>
              <div
                className="partition"
                style={{
                  width: "1px",
                  background: "#c0c0c0",
                  marginRight: "5px",
                }}
              ></div>
              <a href="/tos" style={{ fontSize: 12, color: "#535bf2" }}>
                Chính sách bảo mật
              </a>
            </div>
          </form>
        )}
      </section>
    </section>
  );
};

export default ReviewModal;
