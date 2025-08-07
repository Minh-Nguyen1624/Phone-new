// import { useState, useEffect } from "react";
// import axios from "axios";

// const API_URL = "http://localhost:8080/api";
// const ForgotPassword = () => {
//   const [email, setEmail] = useState("");
//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await axios.post(
//         `${API_URL}/users/user-forgotPassword`,
//         { email }
//       );
//       setMessage(response.data.data.message);
//       setError("");
//     } catch (error) {
//       setError(
//         error.response?.data.message || "Lỗi khi gửi yêu cầu quên mật khẩu"
//       );
//       setMessage("");
//     }
//   };
//   return (
//     <div style={{ maxWidth: "400px", margin: "20px auto", padding: "20px" }}>
//       <h2 style={{ textAlign: "center" }}>Quên mật khẩu</h2>
//       {message && (
//         <p style={{ color: "green", textAlign: "center" }}>{message}</p>
//       )}
//       {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
//       <form
//         onSubmit={handleSubmit}
//         style={{ display: "flex", flexDirection: "column", gap: "15px" }}
//       >
//         <input
//           type="email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           placeholder="Nhập email của bạn"
//           style={{
//             padding: "10px",
//             borderRadius: "5px",
//             border: "1px solid #ccc",
//             color: "black",
//           }}
//           required
//         />
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
//           Gửi liên kết đặt lại
//         </button>
//       </form>
//     </div>
//   );
// };

// export default ForgotPassword;

import { useState } from "react";
import axios from "axios";
import Header from "./Header";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Login.css";

const API_URL = "http://localhost:8080/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Email không hợp lệ.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/users/user-forgotPassword`, {
        email,
      });
      setMessage(res.data.message);
    } catch (err) {
      setError(
        err.response?.data.message || "Lỗi khi gửi yêu cầu quên mật khẩu"
      );
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
            Quên mật khẩu
          </h2>
          {message && (
            <div className="alert alert-success text-center">{message}</div>
          )}
          {error && (
            <div className="alert alert-danger text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2 font-bold"
              >
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="form-control w-full pl-10 p-3 border-b border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent"
                  placeholder="Nhập email của bạn"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-3 rounded-full font-semibold text-white transition duration-300 btn-gradient mt-5"
            >
              {isLoading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "Gửi liên kết đặt lại"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
