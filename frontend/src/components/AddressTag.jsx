import React, { useEffect, useState } from "react";
import { FaMapMarkerAlt, FaEdit } from "react-icons/fa";
import axios from "axios";
import EditAddress from "../components/EditAddress";

const API_URL = "http://localhost:8080/api";

const AddressTag = () => {
  const [address, setAddress] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const fetchDefaultAddress = async () => {
      // Kiểm tra đăng nhập
      if (!userId || !token) {
        setError("Vui lòng đăng nhập để xem địa chỉ");
        setIsLoading(false);
        return;
      }
      // Kiểm tra định dạng userId
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        setError("ID người dùng không hợp lệ. Vui lòng kiểm tra đăng nhập.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        console.log(`Gọi API: ${API_URL}/addresses/search/${userId}`);
        const response = await axios.get(
          `${API_URL}/addresses/search/${userId}`,
          {
            params: { type: "shipping", isDefaultShipping: true }, // Lọc rõ ràng hơn
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Phản hồi API:", response.data);
        // Đảm bảo lấy phần tử đầu tiên từ mảng data
        setAddress(response.data.data[0] || null);
        setError(null);
      } catch (error) {
        console.error(
          "Fetch address error:",
          error.response?.data || error.message
        );
        setError(
          error.response?.data?.message ||
            "Không thể tải địa chỉ mặc định. Vui lòng kiểm tra kết nối hoặc dữ liệu."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDefaultAddress();
  }, [userId, token]); // Chạy lại khi userId hoặc token thay đổi

  const handleEditClick = () => {
    setShowEdit(true);
  };

  const handleSave = (newAddress) => {
    setAddress(newAddress);
    setShowEdit(false);
    setError(null);
  };

  const handleCancel = () => {
    setShowEdit(false);
    setError(null);
  };

  return (
    <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
      <div
        onClick={handleEditClick}
        style={{
          backgroundColor: "#ffe14c",
          padding: "10px 15px",
          borderRadius: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "130%",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
          position: "relative",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#ffdb4d")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#ffe14c")
        }
      >
        {error ? (
          <p style={{ color: "red", margin: 0 }}>{error}</p>
        ) : isLoading ? (
          <p style={{ margin: 0, color: "#666" }}>Đang tải...</p>
        ) : address ? (
          <>
            {/* {address.postalCode} */}

            <FaMapMarkerAlt style={{ marginRight: "10px", color: "#333" }} />
            <span style={{ fontSize: "16px", color: "#333" }}>
              {address.street}, {address.ward}, {address.district},{" "}
              {address.province}
            </span>
            <FaEdit
              style={{ marginLeft: "10px", color: "#555", fontSize: "16px" }}
            />
          </>
        ) : (
          <p style={{ margin: 0, color: "#666" }}>Chưa có địa chỉ mặc định</p>
        )}
      </div>
      {showEdit && (
        <EditAddress
          address={address}
          userId={userId}
          token={token}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default AddressTag;
