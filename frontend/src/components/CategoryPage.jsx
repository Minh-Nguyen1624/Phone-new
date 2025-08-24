import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8080/api";

const CategoryPage = () => {
  const { categorySlug } = useParams();
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_URL}/categorys/category/${categorySlug}`
        );
        if (response.data.success) {
          setCategoryData(response.data.data);
        } else {
          setError("Không tìm thấy danh mục.");
        }
      } catch (err) {
        setError(err.message || "Lỗi khi tải dữ liệu danh mục.");
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [categorySlug]);

  if (loading) return <div>Đang tải dữ liệu...</div>;
  if (error) return <div>Lỗi: {error}</div>;
  if (!categoryData)
    return <div>Không có dữ liệu danh mục "{categorySlug}".</div>;

  console.log("Category Data:", categoryData);
  return (
    <div className="category-page">
      <h1>Danh mục: {categoryData.name}</h1>
      <div className="accessory-list">
        {/* Hiện tại, endpoint chỉ trả về thông tin danh mục. Nếu muốn hiển thị sản phẩm, cần mở rộng backend */}
        <p>Mô tả: {categoryData.description || "Chưa có mô tả"}</p>
      </div>
    </div>
  );
};

export default CategoryPage;
