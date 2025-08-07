// import { useEffect } from "react";
// import axios from "axios";
// import { useParams, useNavigate } from "react-router-dom";

// const API_URL = "http://localhost:8080/api";
// const VerifyEmail = () => {
//   const { token } = useParams();
//   const navigate = useNavigate();
//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const verify = async () => {
//       try {
//         const res = await axios.get(`${API_URL}/users/verify-email/${token}`);
//         setMessage(res.data.message);
//         setTimeout(() => navigate("/login"), 5000);
//       } catch (err) {
//         setError(err.response?.data.message || "Lỗi khi xác minh email");
//       }
//     };
//     if (token) verify();
//   }, [token, navigate]);

//   return (
//     <div style={{ textAlign: "center", marginTop: "50px" }}>
//       <h2>Xác minh email</h2>
//       {message && <p style={{ color: "green" }}>{message}</p>}
//       {error && <p style={{ color: "red" }}>{error}</p>}
//       {!message && !error && <p>Đang xác minh...</p>}
//     </div>
//   );
// };

// export default VerifyEmail;

import { useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Header from "./Header";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Login.css";

const API_URL = "http://localhost:8080/api";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/verify-email/${token}`);
        setMessage(res.data.message);
        setTimeout(() => navigate("/login"), 3000);
      } catch (err) {
        setError(err.response?.data.message || "Lỗi khi xác minh email");
      } finally {
        setIsLoading(false);
      }
    };
    if (token) verify();
  }, [token, navigate]);

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
            Xác minh email
          </h2>
          {isLoading && <div className="text-center">Đang xác minh...</div>}
          {message && (
            <div className="alert alert-success text-center">{message}</div>
          )}
          {error && (
            <div className="alert alert-danger text-center">{error}</div>
          )}
        </div>
      </div>
    </>
  );
};

export default VerifyEmail;
