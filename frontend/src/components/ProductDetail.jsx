import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ProductDetailInfo from "./ProductDetailInfo";
import Header from "./Header";

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

  return (
    <>
      <Header />
      <ProductDetailInfo
        product={product}
        topCapitalize={topCapitalize}
        navigate={navigate}
      />
    </>
  );
};

export default ProductDetail;
