import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8080/api";

const ProductDetail = () => {
  const { productId, categorySlug } = useParams(); // Chỉ lấy productId và categorySlug
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProductDetail = async () => {
    try {
      const response = await axios.get(`${API_URL}/phones/${productId}`);
      console.log("API Response Full:", response); // Log toàn bộ response
      console.log("API Data:", response.data); // Log dữ liệu từ response
      if (response.data && response.data.data) {
        setProduct(response.data.data);
      } else {
        console.warn("No data found in response:", response.data);
        setProduct(null);
      }
      setIsLoading(false);
    } catch (error) {
      console.error(
        "Error fetching product detail:",
        error.response ? error.response.data : error.message
      );
      setError("Lỗi kết nối đến server. Vui lòng kiểm tra API.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetail();
  }, [productId]);

  console.log("Product State:", product); // Log trạng thái product

  const topCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  if (isLoading)
    return <p className="text-center text-gray-600">Đang tải...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!product)
    return <p className="text-center text-gray-600">Không có sản phẩm.</p>;

  const imageUrl = product?.image
    ? product?.image.startsWith("https")
      ? product?.image
      : `${API_URL}${product?.image || ""}` // Điều chỉnh đường dẫn
    : "https://via.placeholder.com/200";
  const name = product?.name || "Tên sản phẩm";
  const categoryName = product?.category?.name || "Danh mục không xác định";
  const price = product?.price
    ? `${product.price.toLocaleString()} VNĐ`
    : "Giá không có";
  const finalPrice = product?.finalPrice
    ? `${product.finalPrice.toLocaleString()} VNĐ`
    : price;
  const description = product?.description || "Không có mô tả.";
  const discountCode = product?.discount?.code || "No discount";
  const discountValue = product?.discount?.discountValue || 0;
  const specifications = product?.specifications || {};

  return (
    <div className="product-detail">
      <h2>{topCapitalize(name)}</h2>
      <img
        src={imageUrl}
        alt={name}
        style={{ width: "200px", height: "200px" }}
      />
      <p>
        <strong>Danh mục:</strong> {topCapitalize(categoryName)}
      </p>
      <p>
        <strong>Giá gốc:</strong> {price}
      </p>
      <p>
        <strong>Giá sau giảm:</strong> {finalPrice}
      </p>
      <p>
        <strong>Giảm giá:</strong> {discountCode} ({discountValue}%)
      </p>
      <p>
        <strong>Mô tả:</strong> {description}
      </p>
      <p>
        <strong>Màn hình:</strong> {specifications.screen}
      </p>
      <p>
        <strong>Pin:</strong> {specifications.battery}
      </p>
      <p>
        <strong>Camera trước:</strong> {specifications.camera?.front}
      </p>
      <p>
        <strong>Camera sau:</strong> {specifications.camera?.rear}
      </p>
      <button
        onClick={() => navigate(-1)}
        style={{
          padding: "5px 10px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          marginTop: "10px",
        }}
      >
        Quay lại
      </button>
    </div>
  );
};

export default ProductDetail;
