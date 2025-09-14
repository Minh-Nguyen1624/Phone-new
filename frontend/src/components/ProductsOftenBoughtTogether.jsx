import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8080/api";

const ProductOftenBoughtTogether = ({ product }) => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!product?._id) {
        throw new Error("Không có product._id để fetch");
      }
      console.log("Fetching related products for productId:", product._id);
      const response = await axios.get(
        `${API_URL}/phones/bought/${product._id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      console.log("API Response:", response.data); // Debug response
      if (response.data.success) {
        setRelatedProducts(response.data.data || []);
      } else {
        setError(response.data.message || "Không có sản phẩm liên quan");
      }
    } catch (error) {
      console.error(
        "API Error:",
        error.response?.status,
        error.response?.data || error.message
      );
      setError(
        error.response?.data?.message ||
          `Lỗi kết nối API (Mã: ${error.response?.status || "Unknown"})`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product?._id) {
      fetchRelatedProducts();
    } else {
      setRelatedProducts([]);
      setError("Không có sản phẩm để lấy dữ liệu liên quan");
      console.log("No product._id provided:", product);
    }
  }, [product?._id]);

  console.log("Related Products:", relatedProducts);

  if (loading) return <div className="related acc">Đang tải...</div>;
  if (error)
    return (
      <div className="related acc" style={{ color: "red" }}>
        {error}
      </div>
    );
  if (!relatedProducts.length)
    return <div className="related acc">Không có sản phẩm liên quan.</div>;

  return (
    <div className="related acc" style={{ marginTop: 30 }}>
      <p className="related__ttl">
        <span>Sản phẩm liên quan</span>
      </p>
      <div className="box-scroll p-slide">
        <div className="listproduct owl-carousel owl-loaded owl-drag">
          <div className="owl-stage-outer">
            <div
              className="owl-stage"
              style={{
                transform: "translate3d(0px,0px,0px)",
                transition: "all",
                width: `${relatedProducts.length * 234}px`,
              }}
            >
              {relatedProducts.map((item, index) => (
                <div
                  className="owl-item"
                  style={{ width: 234 }}
                  key={item._id || index}
                >
                  <div className="item">
                    <a href={`/product/${item._id}`} className="main-contain">
                      <div className="item-label"></div>
                      <div className="item-img item-img_9499">
                        <img
                          src={item.image || "https://via.placeholder.com/150"}
                          alt={item.name}
                          className="thumb ls-is-cached lazyloaded"
                        />
                      </div>
                      <p className="result-label temp6">
                        <img
                          src={item.image || "https://via.placeholder.com/50"}
                          alt={item.name}
                          className="ls-is-cached lazyloaded"
                        />
                        <span>Mua trả chậm</span>
                      </p>
                      <h3>{item.name || "Tên sản phẩm"}</h3>
                      <p className="item-txt-online">
                        <span>Online giá rẻ quá</span>
                      </p>
                      <strong className="price">
                        {item.finalPrice?.toLocaleString() || "0"} VNĐ
                      </strong>
                      <div className="box-p">
                        <p className="price-old black">
                          {item.price?.toLocaleString() || "0"} VNĐ
                        </p>
                        <span className="percent">
                          {item.price && item.finalPrice
                            ? `${Math.round(
                                ((item.price - item.finalPrice) / item.price) *
                                  100
                              )}%`
                            : "0%"}
                        </span>
                      </div>
                    </a>
                    <div className="item-bottom">
                      <a
                        href="javascript:;"
                        className="shiping"
                        aria-label="shiping"
                      ></a>
                    </div>
                    <div className="rating_Compare has_quantity">
                      <div className="vote-txt">
                        <i className="iconnewglobal-vote"></i>
                        <b>{item.rating || "0"}</b>
                      </div>
                      <span>• Đã bán {item.reserved || "0"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductOftenBoughtTogether;
