import React, { useState, useEffect, useRef } from "react";
import { FaSave, FaTimes } from "react-icons/fa";
import axios from "axios";
import addressData from "../context/vietnam-addresses.json";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const API_URL = "http://localhost:8080/api";
const GEOAPIFY_API_KEY = "dcbf80ccd7bf4ea1bea0e701ce862c37"; // Thay bằng API Key của bạn

const EditAddress = ({ address, userId, token, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    street: "",
    city: "",
    district: "",
    ward: "",
    province: "",
    postalCode: "",
    country: "Vietnam",
    type: "shipping",
    recipientName: "",
    phoneNumber: "",
  });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("selectProvince");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [streetInput, setStreetInput] = useState("");
  const [addressDataState] = useState(addressData);
  // const [coordinates, setCoordinates] = useState([21.0285, 105.8542]); // Tọa độ mặc định (Hà Nội)
  const [coordinates, setCoordinates] = useState(null); // Tọa độ mặc định (Hà Nội)
  const mapRef = useRef(null);
  const audioRef = useRef(null);

  // Hàm để lấy tọa độ từ Geoapify
  const geocodeAddress = async (addressString) => {
    try {
      const response = await axios.get(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          addressString
        )}&apiKey=${GEOAPIFY_API_KEY}`
      );
      const result = response.data.features[0];
      if (result) {
        const { lat, lon, postcode } = result.properties;
        setCoordinates([lat, lon]);
        setFormData((prev) => ({
          ...prev,
          postalCode: postcode || prev.postalCode || "100000", // Fallback to default postal code
        }));
      } else {
        setCoordinates(null); // Đặt lại nếu không tìm thấy tọa độ
        setError("Không tìm thấy tọa độ cho địa chỉ này.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setError("Không thể lấy tọa độ từ địa chỉ.");
      setCoordinates(null); // Đặt lại nếu có lỗi
    }
  };

  // Cập nhật formData khi address prop thay đổi
  useEffect(() => {
    if (address && address._id) {
      setSelectedAddressId(address._id);
      setFormData({
        street: address.street || "",
        city: address.city || "",
        district: address.district || "",
        ward: address.ward || "",
        province: address.province || "",
        postalCode: address.postalCode || "",
        country: address.country || "Vietnam",
        type: address.type || "shipping",
        recipientName: address.recipientName || "",
        phoneNumber: address.phoneNumber || "",
      });
      setSelectedProvince(address.province || "");
      setSelectedDistrict(address.district || "");
      setSelectedWard(address.ward || "");
      setStreetInput(address.street || "");
      if (
        address.street &&
        address.ward &&
        address.district &&
        address.province
      ) {
        geocodeAddress(
          `${address.street}, ${address.ward}, ${address.district}, ${address.province}, Vietnam`
        );
      } else {
        setCoordinates(null); // Đặt lại nếu thiếu thông tin địa chỉ
      }
    } else {
      setCoordinates(null); // Đặt lại nếu không có address prop
    }
  }, [address]);

  // Cập nhật tọa độ khi địa chỉ thay đổi
  useEffect(() => {
    if (selectedProvince && selectedDistrict && selectedWard && streetInput) {
      const addressString = `${streetInput}, ${selectedWard}, ${selectedDistrict}, ${selectedProvince}, Vietnam`;
      geocodeAddress(addressString);
    } else {
      setCoordinates(null); // Đặt lại nếu thiếu thông tin
    }
  }, [selectedProvince, selectedDistrict, selectedWard, streetInput]);

  // Lấy danh sách địa chỉ hiện có
  useEffect(() => {
    if (
      selectedProvince &&
      selectedDistrict &&
      selectedWard &&
      userId &&
      token
    ) {
      const fetchAddresses = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/addresses/search/${userId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: {
                province: selectedProvince,
                district: selectedDistrict,
                ward: selectedWard,
                page: 1,
                limit: 10,
              },
            }
          );
          setAddresses(response.data.data || []);
        } catch (error) {
          console.error(
            "Fetch addresses error:",
            error.response?.data || error.message
          );
          setError("Không thể tải danh sách địa chỉ.");
        }
      };
      fetchAddresses();
    }
  }, [selectedProvince, selectedDistrict, selectedWard, userId, token]);

  // Xử lý thay đổi form
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Xử lý chọn tỉnh
  const handleProvinceChange = (e) => {
    const province = e.target.value;
    setSelectedProvince(province);
    setSelectedDistrict("");
    setSelectedWard("");
    setActiveTab("selectDistrict");
  };

  // Xử lý chọn quận/huyện
  const handleDistrictChange = (e) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    setSelectedWard("");
    setActiveTab("selectWard");
  };

  // Xử lý chọn phường/xã
  const handleWardChange = (e) => {
    setSelectedWard(e.target.value);
    setActiveTab("existing");
  };

  // Xử lý chọn địa chỉ hiện có
  const handleSelectAddress = (address) => {
    setSelectedAddressId(address._id);
    setFormData({
      street: address.street || "",
      city: address.city || "",
      district: address.district || "",
      ward: address.ward || "",
      province: address.province || "",
      postalCode: address.postalCode || "",
      country: address.country || "Vietnam",
      type: address.type || "shipping",
      recipientName: address.recipientName || "",
      phoneNumber: address.phoneNumber || "",
    });
    setStreetInput(address.street || "");
    geocodeAddress(
      `${address.street}, ${address.ward}, ${address.district}, ${address.province}, Vietnam`
    );
  };

  // Xử lý xác nhận địa chỉ
  const handleConfirmAddress = async () => {
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      setError("ID người dùng không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    if (
      !streetInput ||
      !selectedProvince ||
      !selectedDistrict ||
      !selectedWard ||
      !formData.recipientName ||
      !formData.phoneNumber ||
      !formData.postalCode
    ) {
      setError(
        "Vui lòng điền đầy đủ thông tin: tên người nhận, số điện thoại, số nhà và đường, mã bưu điện."
      );
      return;
    }

    // Validate phoneNumber (Vietnamese format, e.g., 09x, 03x, etc.)
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError(
        "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 chữ số)."
      );
      return;
    }

    // Validate postalCode (5 or 6 digits for Vietnam)
    const postalCodeRegex = /^\d{5,6}$/;
    if (!postalCodeRegex.test(formData.postalCode)) {
      setError("Mã bưu điện phải là số có 5 hoặc 6 chữ số.");
      return;
    }

    const updatedFormData = {
      user: userId,
      recipientName: formData.recipientName,
      phoneNumber: formData.phoneNumber,
      street: streetInput,
      city: selectedProvince,
      district: selectedDistrict,
      ward: selectedWard,
      province: selectedProvince,
      postalCode: formData.postalCode,
      country: formData.country || "Vietnam",
      type: formData.type || "shipping",
      latitude: coordinates ? coordinates[0] : null,
      longitude: coordinates ? coordinates[1] : null,
      isDefaultShipping: true,
    };

    try {
      // let response;
      // if (selectedAddressId) {
      //   response = await axios.put(
      //     `${API_URL}/addresses/update/${selectedAddressId}`,
      //     updatedFormData,
      //     { headers: { Authorization: `Bearer ${token}` } }
      //   );
      // } else {
      //   response = await axios.post(
      //     `${API_URL}/addresses/add`,
      //     updatedFormData,
      //     { headers: { Authorization: `Bearer ${token}` } }
      //   );
      // }
      // // Gọi lại API để lấy địa chỉ mới nhất sau khi lưu
      // const newAddressResponse = await axios.get(
      //   `${API_URL}/addresses/search/${userId}`,
      //   {
      //     headers: { Authorization: `Bearer ${token}` },
      //     params: { type: "shipping" },
      //   }
      // );
      // onSave(newAddressResponse.data.data[0] || null); // Truyền địa chỉ mới nhất
      // setError(null);
      // setStreetInput("");
      // setFormData({
      //   street: "",
      //   city: "",
      //   district: "",
      //   ward: "",
      //   province: "",
      //   postalCode: "",
      //   country: "Vietnam",
      //   type: "shipping",
      //   recipientName: "",
      //   phoneNumber: "",
      // });
      // setSelectedProvince("");
      // setSelectedDistrict("");
      // setSelectedWard("");
      // setActiveTab("selectProvince");
      // setCoordinates(null); // Đặt lại tọa độ sau khi lưu
      const response = await axios.put(
        `${API_URL}/addresses/update/${selectedAddressId}`,
        updatedFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Cập nhật lại danh sách địa chỉ từ API
      const newAddressResponse = await axios.get(
        `${API_URL}/addresses/search/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { type: "shipping" },
        }
      );
      onSave(newAddressResponse.data.data[0] || null);
      setError(null);
      setStreetInput("");
      setFormData({
        street: "",
        city: "",
        district: "",
        ward: "",
        province: "",
        postalCode: "",
        country: "Vietnam",
        type: "shipping",
        recipientName: "",
        phoneNumber: "",
      });
      setSelectedProvince("");
      setSelectedDistrict("");
      setSelectedWard("");
      setActiveTab("selectProvince");
      setCoordinates(null);
    } catch (error) {
      console.error(
        "Save address error:",
        error.response?.data || error.message
      );
      setError(
        error.response?.data?.error ||
          "Không thể lưu địa chỉ. Vui lòng thử lại."
      );
    }
  };

  // Xử lý lưu địa chỉ
  const handleSaveAddress = async () => {
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      setError("ID người dùng không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    if (
      !formData.street ||
      !formData.province ||
      !formData.district ||
      !formData.ward ||
      !formData.recipientName ||
      !formData.phoneNumber ||
      !formData.postalCode
    ) {
      setError(
        "Vui lòng điền đầy đủ thông tin: tên người nhận, số điện thoại, số nhà và đường, mã bưu điện."
      );
      return;
    }

    // Validate phoneNumber
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError(
        "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 chữ số)."
      );
      return;
    }

    // Validate postalCode
    const postalCodeRegex = /^\d{5,6}$/;
    if (!postalCodeRegex.test(formData.postalCode)) {
      setError("Mã bưu điện phải là số có 5 hoặc 6 chữ số.");
      return;
    }

    const payload = {
      user: userId,
      recipientName: formData.recipientName,
      phoneNumber: formData.phoneNumber,
      street: formData.street,
      city: formData.province,
      district: formData.district,
      ward: formData.ward,
      province: formData.province,
      postalCode: formData.postalCode,
      country: formData.country || "Vietnam",
      type: formData.type || "shipping",
      latitude: coordinates ? coordinates[0] : null,
      longitude: coordinates ? coordinates[1] : null,
      isDefaultShipping: true,
    };

    try {
      // let response;
      // if (selectedAddressId) {
      //   response = await axios.put(
      //     `${API_URL}/addresses/update/${selectedAddressId}`,
      //     payload,
      //     { headers: { Authorization: `Bearer ${token}` } }
      //   );
      // } else {
      //   response = await axios.post(`${API_URL}/addresses/add`, payload, {
      //     headers: { Authorization: `Bearer ${token}` },
      //   });
      // }
      // const newAddressResponse = await axios.get(
      //   `${API_URL}/addresses/search/${userId}`,
      //   {
      //     headers: { Authorization: `Bearer ${token}` },
      //     params: { type: "shipping" },
      //   }
      // );
      // onSave(newAddressResponse.data.data[0] || null);
      // setError(null);
      // setFormData({
      //   street: "",
      //   city: "",
      //   district: "",
      //   ward: "",
      //   province: "",
      //   postalCode: "",
      //   country: "Vietnam",
      //   type: "shipping",
      //   recipientName: "",
      //   phoneNumber: "",
      // });
      // setSelectedProvince("");
      // setSelectedDistrict("");
      // setSelectedWard("");
      // setStreetInput("");
      // setActiveTab("selectProvince");
      const response = await axios.put(
        `${API_URL}/addresses/update/${selectedAddressId}`,
        updatedFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Cập nhật lại danh sách địa chỉ từ API
      const newAddressResponse = await axios.get(
        `${API_URL}/addresses/search/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { type: "shipping" },
        }
      );
      onSave(newAddressResponse.data.data[0] || null);
      setError(null);
      setStreetInput("");
      setFormData({
        street: "",
        city: "",
        district: "",
        ward: "",
        province: "",
        postalCode: "",
        country: "Vietnam",
        type: "shipping",
        recipientName: "",
        phoneNumber: "",
      });
      setSelectedProvince("");
      setSelectedDistrict("");
      setSelectedWard("");
      setActiveTab("selectProvince");
      setCoordinates(null);
    } catch (error) {
      console.error(
        "Save address error:",
        error.response?.data || error.message
      );
      setError(
        error.response?.data?.error ||
          "Không thể lưu địa chỉ. Vui lòng thử lại."
      );
    }
  };

  // Component cập nhật map
  const MapUpdater = () => {
    // const map = useMap();
    // mapRef.current = map;
    // useEffect(() => {
    //   map.setView(coordinates, 15);
    // }, [map, coordinates]);
    // return null;
    const map = useMap();
    mapRef.current = map;
    useEffect(() => {
      if (map && coordinates) {
        map.setView(coordinates, 15, { animate: false });
      }
    }, [map, coordinates]);
    return null;
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "15px",
        borderRadius: "8px",
        border: "1px solid #ddd",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        width: "150%",
        marginTop: "10px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="address-modal">
        <h3 style={{ marginBottom: "10px", fontSize: "18px", color: "#333" }}>
          Quản lý địa chỉ
        </h3>
        <div
          className="address-selected"
          style={{
            marginBottom: "15px",
            padding: "10px",
            backgroundColor: "#f9f9f9",
            borderRadius: "4px",
          }}
        >
          {/* ${formData.recipientName}, ${formData.phoneNumber}, , ${formData.postalCode} */}
          {formData.ward && formData.district && formData.province
            ? `Địa chỉ đã chọn: 
            
              ${formData.street || "Chưa nhập số nhà"}, ${formData.ward}, ${
                formData.district
              }, ${formData.province}`
            : "Chưa chọn địa chỉ"}
        </div>
        {/* Chỉ hiển thị bản đồ khi có tọa độ */}
        {coordinates && (
          <div style={{ height: "300px", marginBottom: "15px" }}>
            <MapContainer
              center={coordinates}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url={`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={coordinates} icon={customIcon}>
                <Popup>
                  {formData.recipientName}, {formData.phoneNumber},{" "}
                  {formData.street || "Chưa nhập số nhà"}, {formData.ward},{" "}
                  {formData.district},{formData.province}, {formData.postalCode}
                </Popup>
              </Marker>
              <MapUpdater />
            </MapContainer>
          </div>
        )}
        {/* 
        <div style={{ height: "300px", marginBottom: "15px" }}>
          <MapContainer
            center={coordinates}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url={`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={coordinates} icon={customIcon}>
              <Popup>
                {formData.recipientName}, {formData.phoneNumber},{" "}
                {formData.street || "Chưa nhập số nhà"}, {formData.ward},{" "}
                {formData.district}, {formData.province}, {formData.postalCode}
              </Popup>
            </Marker>
            <MapUpdater />
          </MapContainer>
        </div> */}

        <div
          className="tabs"
          style={{
            marginBottom: "15px",
            borderBottom: "1px solid #ccc",
            display: "flex",
          }}
        >
          <button
            onClick={() => setActiveTab("selectProvince")}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom:
                activeTab === "selectProvince"
                  ? "2px solid #4CAF50"
                  : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontWeight: activeTab === "selectProvince" ? "bold" : "normal",
              color: activeTab === "selectProvince" ? "#4CAF50" : "#333",
              transition: "all 0.3s ease",
            }}
          >
            Tỉnh/TP
          </button>
          <button
            onClick={() => setActiveTab("selectDistrict")}
            disabled={!selectedProvince}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom:
                activeTab === "selectDistrict"
                  ? "2px solid #4CAF50"
                  : "2px solid transparent",
              background: "none",
              cursor: !selectedProvince ? "not-allowed" : "pointer",
              fontWeight: activeTab === "selectDistrict" ? "bold" : "normal",
              color: activeTab === "selectDistrict" ? "#4CAF50" : "#333",
              opacity: !selectedProvince ? 0.6 : 1,
              transition: "all 0.3s ease",
            }}
          >
            Quận/Huyện
          </button>
          <button
            onClick={() => setActiveTab("selectWard")}
            disabled={!selectedDistrict}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom:
                activeTab === "selectWard"
                  ? "2px solid #4CAF50"
                  : "2px solid transparent",
              background: "none",
              cursor: !selectedDistrict ? "not-allowed" : "pointer",
              fontWeight: activeTab === "selectWard" ? "bold" : "normal",
              color: activeTab === "selectWard" ? "#4CAF50" : "#333",
              opacity: !selectedDistrict ? 0.6 : 1,
              transition: "all 0.3s ease",
            }}
          >
            Phường/Xã
          </button>
          <button
            onClick={() => setActiveTab("existing")}
            disabled={!selectedWard}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom:
                activeTab === "existing"
                  ? "2px solid #4CAF50"
                  : "2px solid transparent",
              background: "none",
              cursor: !selectedWard ? "not-allowed" : "pointer",
              fontWeight: activeTab === "existing" ? "bold" : "normal",
              color: activeTab === "existing" ? "#4CAF50" : "#333",
              opacity: !selectedWard ? 0.6 : 1,
              transition: "all 0.3s ease",
            }}
          >
            Địa chỉ hiện có
          </button>
        </div>

        <div
          className="list"
          style={{
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "10px",
          }}
        >
          {activeTab === "selectProvince" && (
            <div>
              <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                Chọn tỉnh:
              </label>
              <select
                value={selectedProvince}
                onChange={handleProvinceChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  marginBottom: "10px",
                  color: "black",
                  marginTop: "20px",
                }}
              >
                <option value="">-- Chọn tỉnh --</option>
                {addressDataState.provinces &&
                  addressDataState.provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {activeTab === "selectDistrict" && selectedProvince && (
            <div>
              <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                Chọn quận/huyện:
              </label>
              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  marginBottom: "10px",
                  marginTop: "20px",
                  color: "black",
                }}
              >
                <option value="">-- Chọn quận/huyện --</option>
                {addressDataState.districts[selectedProvince] &&
                  addressDataState.districts[selectedProvince].map(
                    (district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    )
                  )}
              </select>
            </div>
          )}
          {activeTab === "selectWard" && selectedDistrict && (
            <div>
              <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                Chọn phường/xã:
              </label>
              <select
                value={selectedWard}
                onChange={handleWardChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  marginBottom: "10px",
                  marginTop: "20px",
                  color: "black",
                }}
              >
                <option value="">-- Chọn phường/xã --</option>
                {addressDataState.wards[selectedDistrict] ? (
                  addressDataState.wards[selectedDistrict].map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    Không có dữ liệu phường/xã cho quận/huyện này
                  </option>
                )}
              </select>
            </div>
          )}
          {activeTab === "existing" && selectedWard && (
            <div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Tên người nhận:
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleFormChange}
                  placeholder="Nhập tên người nhận"
                  style={{
                    width: "70%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    marginRight: "10px",
                    color: "black",
                  }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Số điện thoại:
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleFormChange}
                  placeholder="Nhập số điện thoại (10 chữ số)"
                  style={{
                    width: "70%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    marginRight: "10px",
                    color: "black",
                  }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Số nhà và đường:
                </label>
                <input
                  type="text"
                  value={streetInput}
                  onChange={(e) => setStreetInput(e.target.value)}
                  placeholder="Nhập số nhà và đường"
                  style={{
                    width: "70%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    marginRight: "10px",
                    color: "black",
                  }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Mã bưu điện:
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleFormChange}
                  placeholder="Nhập mã bưu điện (5-6 chữ số)"
                  style={{
                    width: "70%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    marginRight: "10px",
                    color: "black",
                  }}
                />
              </div>
              <button
                onClick={handleConfirmAddress}
                style={{
                  padding: "8px 15px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Xác nhận (Lưu)
              </button>
              {addresses.length > 0 ? (
                addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className="item"
                    onClick={() => handleSelectAddress(addr)}
                    style={{
                      padding: "8px",
                      cursor: "pointer",
                      backgroundColor:
                        selectedAddressId === addr._id
                          ? "#e0e0e0"
                          : "transparent",
                      borderRadius: "4px",
                      marginBottom: "5px",
                    }}
                  >
                    {`${addr.street}, ${addr.ward}, ${addr.district}, ${addr.province}, ${addr.postalCode}`}
                  </div>
                ))
              ) : (
                <p style={{ color: "#666" }}>
                  Không có địa chỉ nào trong phường/xã này.
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", marginTop: "10px" }}>
          <button
            onClick={handleSaveAddress}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <FaSave style={{ marginRight: "5px" }} /> Lưu
          </button>
          <button
            onClick={onCancel}
            style={{
              backgroundColor: "#f44336",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <FaTimes style={{ marginRight: "5px" }} /> Hủy
          </button>
        </div>
        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        <audio
          ref={audioRef}
          src="https://www.soundjay.com/buttons/beep-01a.mp3"
          preload="auto"
        />
      </div>
    </div>
  );
};

export default EditAddress;
