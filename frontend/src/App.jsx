import { useEffect } from "react";
import Register from "./components/Register";
import Login from "./components/Login";
import HomePage from "./components/HomePage";
import Profiler from "./components/Profiler";
import AdminDashboard from "./components/AdminDashboard";
import SmartPhone from "./components/SmartPhone";
import Monitor from "./components/Monitor";
import Laptop from "./components/Laptop";
import ComputerScreen from "./components/ComputerScreen";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import VerifyEmail from "./components/VerifyEmail";
import Notifications from "./components/Notifications";
import AddressTag from "./components/AddressTag"; // Import AddressTag
import Tablets from "./components/Tablets";
import Accessory from "./components/Accessory"; // Import Accessory component
import CategoryPage from "./components/CategoryPage";
import ProductDetail from "./components/ProductDetail";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const API_URL = "http://localhost:8080/api";

const libraries = ["place"];

// Component điều hướng sau khi đăng nhập
const AuthRedirect = () => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (
      token &&
      (location.pathname === "/login" ||
        location.pathname === "/forgot-password")
    ) {
      const fetchUserProfile = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/users/get-user-profile`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (response.data.success && response.data.data) {
            localStorage.setItem("userRole", response.data.data.role || "user");
            if (response.data.data.role === "admin") {
              window.location.href = "/admin";
            } else {
              window.location.href = "/";
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userId");
          window.location.href = "/login";
        }
      };
      fetchUserProfile();
    }
  }, [location, token]);

  return null;
};

// Component bảo vệ route
const ProtectedRoute = ({ children, roleRequired }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  if (!token) return <Navigate to="/login" />;
  if (roleRequired && userRole !== roleRequired) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <>
              <AuthRedirect />
              <Login />
            </>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route
          path="/forgot-password"
          element={
            <>
              <AuthRedirect />
              <ForgotPassword />
            </>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profiler>
                <AddressTag /> {/* Thêm AddressTag vào trang profile */}
              </Profiler>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roleRequired="admin">
              <AdminDashboard>
                <AddressTag /> {/* Thêm AddressTag vào trang admin */}
              </AdminDashboard>
            </ProtectedRoute>
          }
        />
        <Route path="/smartphones" element={<SmartPhone />} />
        <Route path="/laptops" element={<Laptop />} />
        <Route path="/monitors" element={<Monitor />} />
        <Route path="/computerscreen" element={<ComputerScreen />} />
        <Route path="/tablets" element={<Tablets />} />
        <Route path="/accessories" element={<Accessory />} />
        <Route path="/category/:categorySlug" element={<CategoryPage />} />
        <Route
          path="/product/:productId/:categorySlug"
          element={<ProductDetail />}
        />
      </Routes>
    </Router>
  );
}

export default App;
