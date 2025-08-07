// import axios from "axios";
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";

// const API_URL = "http://localhost:8080/api";
// const Notifications = () => {
//   const navigate = useNavigate();
//   const [emailNotifications, setEmailNotifications] = useState(true);
//   const [smsNotifications, setSmsNotifications] = useState(true);
//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");

//   // Lấy cài đặt thông báo ban đầu
//   useEffect(() => {
//     const fetchNotifications = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get(`${API_URL}/users/get-user-profile`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setEmailNotifications(res.data.data.emailNotifications);
//         setSmsNotifications(res.data.data.smsNotifications);
//       } catch (err) {
//         setError(err.response?.data.message || "Lỗi khi lấy cài đặt thông báo");
//       }
//     };
//     fetchNotifications();
//   }, []);
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await axios.put(
//         `${API_URL}/users/update-notification/${userId}`,
//         { emailNotifications, smsNotifications },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setMessage(response.data.message);
//       setError("");
//     } catch (error) {
//       setError(error.response?.data.message || "Lỗi khi cập nhật thông báo");
//       setMessage("");
//       if (
//         err.response?.status === 403 &&
//         err.response?.data.message.includes("xác minh")
//       ) {
//         navigate("/verify-email");
//       }
//     }
//   };

//   return (
//     <div style={{ maxWidth: "600px", margin: "20px auto", padding: "20px" }}>
//       <h2 style={{ textAlign: "center" }}>Cài đặt thông báo</h2>
//       {message && (
//         <p style={{ color: "green", textAlign: "center" }}>{message}</p>
//       )}
//       {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
//       <form
//         onSubmit={handleSubmit}
//         style={{ display: "flex", flexDirection: "column", gap: "15px" }}
//       >
//         <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//           <input
//             type="checkbox"
//             checked={emailNotifications}
//             onChange={(e) => setEmailNotifications(e.target.checked)}
//             style={{ width: "20px", height: "20px" }}
//           />
//           Nhận thông báo qua email
//         </label>
//         <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//           <input
//             type="checkbox"
//             checked={smsNotifications}
//             onChange={(e) => setSmsNotifications(e.target.checked)}
//             style={{ width: "20px", height: "20px" }}
//           />
//           Nhận thông báo qua SMS
//         </label>
//         <button
//           type="submit"
//           style={{
//             backgroundColor: "#007bff",
//             color: "#fff",
//             padding: "10px",
//             border: "none",
//             borderRadius: "5px",
//             cursor: "pointer",
//           }}
//         >
//           Cập nhật thông báo
//         </button>
//       </form>
//     </div>
//   );
// };

// export default Notifications;

import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Login.css";

const API_URL = "http://localhost:8080/api";

const Notifications = () => {
  const navigate = useNavigate();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/users/get-user-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEmailNotifications(res.data.data.emailNotifications);
        setSmsNotifications(res.data.data.smsNotifications);
      } catch (err) {
        setError(err.response?.data.message || "Lỗi khi lấy cài đặt thông báo");
        if (
          err.response?.status === 403 &&
          err.response?.data.message.includes("xác minh")
        ) {
          navigate("/verify-email");
        }
      }
    };
    fetchNotifications();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      const res = await axios.put(
        `${API_URL}/auth/update-notifications/${userId}`,
        { emailNotifications, smsNotifications },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data.message || "Lỗi khi cập nhật thông báo");
      if (
        err.response?.status === 403 &&
        err.response?.data.message.includes("xác minh")
      ) {
        navigate("/verify-email");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div
          className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-transparent"
          style={{
            borderImage: "linear-gradient(90deg, #a1c4fd 0%, #c2e9fb 100%) 1",
          }}
        >
          <h2
            className="text-4xl font-bold text-center text-gray-900 mb-8"
            style={{ textShadow: "2px 2px 0 #eee" }}
          >
            Cài đặt thông báo
          </h2>
          {message && (
            <div className="alert alert-success text-center">{message}</div>
          )}
          {error && (
            <div className="alert alert-danger text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-check">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="form-check-input"
                id="emailNotifications"
              />
              <label
                className="form-check-label font-medium text-gray-700"
                htmlFor="emailNotifications"
              >
                Nhận thông báo qua email (khuyến mãi, đơn hàng)
              </label>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
                className="form-check-input"
                id="smsNotifications"
              />
              <label
                className="form-check-label font-medium text-gray-700"
                htmlFor="smsNotifications"
              >
                Nhận thông báo qua SMS (trạng thái đơn hàng, OTP)
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-3 rounded-full font-semibold text-white transition duration-300 btn-gradient"
            >
              {isLoading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "Cập nhật thông báo"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Notifications;
