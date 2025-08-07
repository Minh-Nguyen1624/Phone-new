import React, { useState, useEffect } from "react";
import axios from "axios";
import MainProduct from "../components/MainProduct";

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const ComputerScreen = ({ soldQuantities, purchasePhone }) => {
  const [computerScreens, setComputerScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(InitialDisplayLimit);
  const [totalProducts, setTotalProducts] = useState(0);

  const fetchComputerScreens = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sản phẩm thuộc danh mục "computer-screen" (id: 68761ddcf97fbbdef36e30fc)
      const response = await axios.get(`${API_URL}/phones/search`, {
        params: {
          limit: Limit * 10,
          isActive: true,
          page: 1,
          category: "68761ddcf97fbbdef36e30fc", // _id của "computer-screen"
        },
      });

      const allScreenData = response.data.data || [];
      const filteredScreens = allScreenData.filter((screen) => {
        const screenCategoryId =
          screen.category && screen.category._id
            ? screen.category._id.toString()
            : null;
        return screenCategoryId === "68761ddcf97fbbdef36e30fc";
      });

      console.log("Fetched Computer Screens:", filteredScreens);
      setTotalProducts(filteredScreens.length || allScreenData.length);
      setComputerScreens(filteredScreens);
    } catch (error) {
      console.error(
        "Error fetching computer screens:",
        error.response ? error.response.data : error.message
      );
      setError(
        "Lỗi kết nối đến server. Vui lòng kiểm tra API: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComputerScreens();
  }, []);

  const loadMore = () => {
    setDisplayLimit((prevLimit) => prevLimit + InitialDisplayLimit);
  };

  if (loading) return <p className="text-center text-gray-600">Đang tải...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!Array.isArray(computerScreens) || computerScreens.length === 0) {
    return <p className="text-center text-gray-600">Không có sản phẩm nào.</p>;
  }

  return (
    <div className="container mx-auto mt-8">
      <div
        className="container mx-auto px-4"
        style={{
          backgroundColor: "#fff",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          borderRadius: "0.5rem",
          padding: "40px",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {computerScreens.slice(0, displayLimit).map((screen) => (
            <MainProduct
              key={screen._id}
              phone={screen}
              soldQuantities={soldQuantities[screen._id] || 0}
              purchasePhone={purchasePhone}
            />
          ))}
        </div>
        {displayLimit < computerScreens.length && (
          <div className="text-center mt-4" style={{ paddingBottom: "2rem" }}>
            <button
              className="text-blue py-2 px-4 rounded-lg transition duration-300 bg-white hover:bg-gray-100"
              onClick={loadMore}
            >
              Xem thêm sản phẩm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComputerScreen;
