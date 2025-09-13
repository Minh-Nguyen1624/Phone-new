import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8080/api";

const ProductOftenBoughtTogether = ({ product }) => {
  // console.log("ProductOftenBoughtTogether", product);
  const [relatedproductsId, setRelatedProductsId] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await axios.get(
        `${API_URL}/phones/related/${product._id}`
      );
      setRelatedProductsId(response.data.data);
    } catch (error) {
      console.error(error);
      setError("Lỗi kết nối API hoặc không có sản phẩm liên quan");
    } finally {
      setLoading(false);
    }
  };

  // if (product._id) {
  //   fetchRelatedProducts();
  // }

  useEffect(() => {
    fetchRelatedProducts();
  }, [product._id]);

  // console.log("relatedproductsId", relatedproductsId);

  return (
    <>
      <div className="related acc">
        <p className="related__ttl">
          <span>Sản phẩm thường mua cùng</span>
        </p>
        <div className="box-scroll p-slide">
          <div className="owl-stage-outer">
            <div className="owl-stage">
              <div className="owl-item active">
                <div className="item">
                  <a href="#" className="main-contain">
                    <div className="item-label"></div>
                    <div className="item-img item-img_9499">
                      <img
                        src="#"
                        alt="name"
                        className="thumb ls-is-cached lazyloaded"
                      />
                    </div>
                    <p className="result-label temp6">
                      <img
                        src="#"
                        alt="name"
                        className="ls-is-cached lazyloaded"
                      />
                      <span>Mua trả chậm</span>
                    </p>
                    <h3>Sạc 3 cổng Anker PowerPort III Pod A2667</h3>
                    <p className="item-txt-online">
                      <span>Online giá rẻ quá</span>
                    </p>
                    <strong className="price">price</strong>
                    <div className="box-p">
                      <p className="price-old black">giá chưa giảm</p>
                      <span className="percent">Phần trăm</span>
                    </div>
                  </a>
                  <div className="item-bottom">
                    <a
                      href="javascript:;"
                      className="shiping"
                      aria-label="shiping"
                    ></a>
                  </div>
                  <div className="rating_Compare  has_quantity">
                    <div className="vote-txt">
                      <i className="iconnewglobal-vote"></i>
                      <b>4.9</b>
                    </div>

                    <span>• Đã bán 631</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductOftenBoughtTogether;
