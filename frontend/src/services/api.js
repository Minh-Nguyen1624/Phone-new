import axios from "axios";

const API_URL = "http://localhost:8080/api";
const Limit = 8;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (response) => response,
  (error) => {
    if (error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const fecthPhones = async () => {
  const response = await axios.get(`${API_URL}/phones/`);
  return Array.isArray(response.data)
    ? response.data
    : response.data.data || [];
};

// export const regissterUser = async();

export const fetchPhones = async (
  page = 1,
  categoryId = null,
  searchQuery = "",
  brand = "",
  minPrice = "",
  maxPrice = ""
) => {
  const url = categoryId
    ? `${API_URL}/phones/filter?page=${page}&limit=${Limit}&category=${encodeURIComponent(
        categoryId
      )}${searchQuery ? `&name=${encodeURIComponent(searchQuery)}` : ""}${
        brand ? `&brand=${encodeURIComponent(brand)}` : ""
      }${minPrice ? `&minPrice=${encodeURIComponent(minPrice)}` : ""}${
        maxPrice ? `&maxPrice=${encodeURIComponent(maxPrice)}` : ""
      }`
    : `${API_URL}/phones/search?page=${page}&limit=${Limit}${
        searchQuery ? `&name=${encodeURIComponent(searchQuery)}` : ""
      }${brand ? `&brand=${encodeURIComponent(brand)}` : ""}${
        minPrice ? `&minPrice=${encodeURIComponent(minPrice)}` : ""
      }${maxPrice ? `&maxPrice=${encodeURIComponent(maxPrice)}` : ""}`;
  console.log("API URL:", url); // Log URL trực tiếp
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    console.log("API response:", response.data); // Log response
    let phoneData = Array.isArray(response.data.data)
      ? response.data.data
      : response.data.data || [];
    phoneData.sort((a, b) => a.name.localeCompare(b.name));
    return {
      phones: phoneData,
      totalPages: response.data.pagination?.totalPages || 1,
    };
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    throw new Error(
      "Không thể tải danh sách sản phẩm. Vui lòng kiểm tra API hoặc kết nối"
    );
  }
};

export const fetchSoldQuantities = async (phoneIds) => {
  const quantities = {};
  await Promise.all(
    phoneIds.map(async (phoneId) => {
      try {
        const soldResponse = await axios.get(
          `${API_URL}/phones/${phoneId}/sold`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        quantities[phoneId] = soldResponse.data.soldQuantity || 0;
      } catch (err) {
        console.error(`Error fetching sold quantity for ${phoneId}:`, err);
        quantities[phoneId] = 0;
      }
    })
  );
  return quantities;
};
