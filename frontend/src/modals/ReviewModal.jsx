// import React, { useState, useEffect } from "react";
// import { FaSearch, FaTimes } from "react-icons/fa";
// import axios from "axios";
// import { X } from "lucide-react";
// import ModalHeader from "./ModalHeader";
// import ReviewForm from "./ReviewForm";
// import ResponseMessage from "./ResponseMessage";
// import RatingStars from "./RatingStars";
// import "../css/ProductDetailInfo.css";

// const API_URL = "http://localhost:8080/api";

// const ReviewModal = ({ product, onClose, isOpen }) => {
//   console.log("ReviewModal product prop:", product); // Log prop product
//   const [productId, setProductId] = useState(""); // Không hardcode, nhập từ UI
//   const [userId, setUserId] = useState(""); // Không hardcode, nhập từ UI
//   const [rating, setRating] = useState(0);
//   const [content, setContent] = useState("");
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [agreePolicy, setAgreePolicy] = useState(false);
//   const [agreeRecommend, setAgreeRecommend] = useState(false);
//   const [images, setImages] = useState([]);
//   const [response, setResponse] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const stars = [1, 2, 3, 4, 5];
//   const labels = ["Rất tệ", "Tệ", "Tạm ổn", "Tốt", "Rất tốt"];

//   const fetchCommentData = async (formData) => {
//     try {
//       const response = await axios.post(`${API_URL}/reviews/add`, formData, {
//         headers: {
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       setResponse({
//         type: "success",
//         message: `Gửi đánh giá thành công: ${JSON.stringify(response.data)}`,
//       });
//       // Reset form sau khi thành công
//       setContent("");
//       setName("");
//       setPhone("");
//       setRating(0);
//       setImages([]);
//       setAgreePolicy(false);
//       setAgreeRecommend(false);
//       onClose(); // Đóng modal
//     } catch (error) {
//       if (error.response) {
//         setResponse({
//           type: "error",
//           message: `Lỗi server: ${error.response.data.message}`,
//         });
//       } else if (error.request) {
//         setResponse({
//           type: "error",
//           message: "Không nhận được phản hồi từ server. Kiểm tra backend.",
//         });
//       } else {
//         setResponse({
//           type: "error",
//           message: `Lỗi: ${error.message}`,
//         });
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!isOpen) return null;

//   // Xử lý thay đổi file (tối đa 3 ảnh)
//   const handleFileChange = (e) => {
//     const files = Array.from(e.target.files);
//     if (files.length + images.length > 3) {
//       setResponse({
//         type: "error",
//         message: "Chỉ được upload tối đa 3 ảnh",
//       });
//       return;
//     }
//     setImages([...images, ...files]);
//   };

//   // Xóa ảnh đã chọn
//   const removeImage = (indexToRemove) => {
//     setImages(images.filter((_, index) => index !== indexToRemove));
//   };

//   // Xử lý click sao đánh giá
//   const handleStarClick = (star) => {
//     setRating(star);
//   };

//   // Xử lý submit form
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setResponse(null);

//     // Validation client-side
//     if (!productId) {
//       setResponse({
//         type: "error",
//         message: "Vui lòng nhập Product ID!",
//       });
//       setLoading(false);
//       return;
//     }
//     if (!userId) {
//       setResponse({
//         type: "error",
//         message: "Vui lòng nhập User ID!",
//       });
//       setLoading(false);
//       return;
//     }
//     if (!name || !phone) {
//       setResponse({
//         type: "error",
//         message: "Vui lòng nhập họ tên và số điện thoại!",
//       });
//       setLoading(false);
//       return;
//     }
//     if (!agreePolicy) {
//       setResponse({
//         type: "error",
//         message: "Bạn cần đồng ý với Chính sách xử lý dữ liệu cá nhân",
//       });
//       setLoading(false);
//       return;
//     }
//     if (rating === 0) {
//       setResponse({
//         type: "error",
//         message: "Vui lòng chọn số sao đánh giá",
//       });
//       setLoading(false);
//       return;
//     }
//     if (content.trim().length === 0) {
//       setResponse({
//         type: "error",
//         message: "Nội dung review không được rỗng",
//       });
//       setLoading(false);
//       return;
//     }

//     // Tạo FormData và gửi
//     const formData = new FormData();
//     formData.append("phone", productId); // Dùng state thay vì hardcode
//     formData.append("user", userId); // Dùng state thay vì hardcode
//     formData.append("rating", rating);
//     formData.append("content", content);
//     formData.append("name", name);
//     formData.append("phoneNumber", phone); // Số điện thoại
//     formData.append("consent", agreePolicy);
//     formData.append("agreeRecommend", agreeRecommend);
//     images.forEach((image) => {
//       formData.append("images", image);
//     });

//     fetchCommentData(formData).catch(() => {}); // Xử lý lỗi trong hàm
//   };

//   return (
//     <>
//       <div className="popup-rating-topzone">
//         <ModalHeader onClose={onClose} />
//         <p className="txt">Đánh giá sản phẩm</p>
//         <div className="bproduct">
//           <div className="img">
//             <img src="#" alt="#" />
//           </div>
//           <h3></h3>
//         </div>
//         <RatingStars rating={rating} setRating={setRating} />
//         <form onSubmit={handleSubmit} className="form-rate">
//           <ReviewForm
//             productId={productId}
//             setProductId={setProductId}
//             userId={userId}
//             setUserId={setUserId}
//             content={content}
//             setContent={setContent}
//             name={name}
//             setName={setName}
//             phone={phone}
//             setPhone={setPhone}
//             agreePolicy={agreePolicy}
//             setAgreePolicy={setAgreePolicy}
//             agreeRecommend={agreeRecommend}
//             setAgreeRecommend={setAgreeRecommend}
//             images={images}
//             handleFileChange={handleFileChange}
//             removeImage={removeImage}
//           />
//           <button
//             type="submit"
//             id="submitrt"
//             className="submit send-rate disabled"
//             style={{ display: loading ? "none" : "block" }}
//             disabled={loading}
//           >
//             Gửi đánh giá
//           </button>
//           <div className="dcap">
//             <button
//               type="button"
//               id="submitrt"
//               className="submit send-rate disabled"
//               style={{ display: loading ? "block" : "none" }}
//             >
//               Đang gửi...
//             </button>
//           </div>
//           <p className="intro-txt">
//             <a target="_blank" href="/huong-dan-dang-binh-luan">
//               Quy định đánh giá
//             </a>
//             <a href="/tos">Chính sách bảo mật thông tin</a>
//           </p>
//         </form>
//         <ResponseMessage response={response} />
//       </div>
//     </>
//   );
// };

// export default ReviewModal;

import React, { useState, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import axios from "axios";
import { X } from "lucide-react";
import ModalHeader from "./ModalHeader";
import ReviewForm from "./ReviewForm";
import ResponseMessage from "./ResponseMessage";
import RatingStars from "./RatingStars";
import "../css/ProductDetailInfo.css";

const API_URL = "http://localhost:8080/api";

const ReviewModal = ({ product, onClose, isOpen }) => {
  console.log("ReviewModal product prop:", product);
  console.log("ReviewModal isOpen:", isOpen); // Debug trạng thái isOpen
  const [productId, setProductId] = useState(product?.id || "");
  const [userId, setUserId] = useState("");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [agreeRecommend, setAgreeRecommend] = useState(false);
  const [images, setImages] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product?.id) setProductId(product.id);
  }, [product]);

  const fetchCommentData = async (formData) => {
    try {
      const response = await axios.post(`${API_URL}/reviews/add`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResponse({
        type: "success",
        message: `Gửi đánh giá thành công: ${JSON.stringify(response.data)}`,
      });
      setContent("");
      setName("");
      setPhone("");
      setRating(0);
      setImages([]);
      setAgreePolicy(false);
      setAgreeRecommend(false);
      onClose();
    } catch (error) {
      if (error.response) {
        setResponse({
          type: "error",
          message: `Lỗi server: ${error.response.data.message}`,
        });
      } else if (error.request) {
        setResponse({
          type: "error",
          message: "Không nhận được phản hồi từ server. Kiểm tra backend.",
        });
      } else {
        setResponse({ type: "error", message: `Lỗi: ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 3) {
      setResponse({ type: "error", message: "Chỉ được upload tối đa 3 ảnh" });
      return;
    }
    setImages([...images, ...files]);
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    if (!productId) {
      setResponse({ type: "error", message: "Vui lòng nhập Product ID!" });
      setLoading(false);
      return;
    }
    if (!userId) {
      setResponse({ type: "error", message: "Vui lòng nhập User ID!" });
      setLoading(false);
      return;
    }
    if (!name || !phone) {
      setResponse({
        type: "error",
        message: "Vui lòng nhập họ tên và số điện thoại!",
      });
      setLoading(false);
      return;
    }
    if (!agreePolicy) {
      setResponse({
        type: "error",
        message: "Bạn cần đồng ý với Chính sách xử lý dữ liệu cá nhân",
      });
      setLoading(false);
      return;
    }
    if (rating === 0) {
      setResponse({ type: "error", message: "Vui lòng chọn số sao đánh giá" });
      setLoading(false);
      return;
    }
    if (content.trim().length === 0) {
      setResponse({
        type: "error",
        message: "Nội dung review không được rỗng",
      });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("phone", productId);
    formData.append("user", userId);
    formData.append("rating", rating);
    formData.append("content", content);
    formData.append("name", name);
    formData.append("phoneNumber", phone);
    formData.append("consent", agreePolicy);
    formData.append("agreeRecommend", agreeRecommend);
    images.forEach((image) => formData.append("images", image));

    fetchCommentData(formData).catch(() => {});
  };

  return (
    <>
      <div className="popup-rating-topzone">
        <ModalHeader onClose={onClose} />
        <p className="txt">Đánh giá sản phẩm</p>
        <div className="bproduct">
          <div className="img">
            <img src={product?.image || "#"} alt={product?.name || "#"} />
          </div>
          <h3>{product?.name}</h3>
        </div>
        <RatingStars rating={rating} setRating={setRating} />
        <form onSubmit={handleSubmit} className="form-rate">
          <ReviewForm
            productId={productId}
            setProductId={setProductId}
            userId={userId}
            setUserId={setUserId}
            content={content}
            setContent={setContent}
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            agreePolicy={agreePolicy}
            setAgreePolicy={setAgreePolicy}
            agreeRecommend={agreeRecommend}
            setAgreeRecommend={setAgreeRecommend}
            images={images}
            handleFileChange={handleFileChange}
            removeImage={removeImage}
          />
          <button
            type="submit"
            id="submitrt"
            className="submit send-rate"
            style={{ display: loading ? "none" : "block" }}
            disabled={loading}
          >
            Gửi đánh giá
          </button>
          <div className="dcap">
            <button
              type="button"
              id="submitrt"
              className="submit send-rate"
              style={{ display: loading ? "block" : "none" }}
            >
              Đang gửi...
            </button>
          </div>
          <p className="intro-txt">
            <a target="_blank" href="/huong-dan-dang-binh-luan">
              Quy định đánh giá
            </a>
            <a href="/tos">Chính sách bảo mật thông tin</a>
          </p>
        </form>
        <ResponseMessage response={response} />
      </div>
    </>
  );
};

export default ReviewModal;
