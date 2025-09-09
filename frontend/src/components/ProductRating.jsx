import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import RatingSummary from "./RatingSummary";
import RatingBreakdown from "./RatingBreakdown";
import "../css/ProductDetailInfo.css";

const ProductRating = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8080/api/phones/${productId}`
        );
        setProduct(response.data.data);
      } catch (err) {
        setError("Failed to fetch product details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!product) return <p>No product data available</p>;

  return (
    <div className="wrap_rating wrap_border">
      <div className="bg_caoverrate"></div>
      <div className="rating-topzone">
        <div className="rating-topzonecmt-hascmt">
          <div className="boxrate rate-topzone">
            <h2 className="boxrate__title">Đánh giá {product.name}</h2>
            <div className="boxrate__top" style={{ marginTop: "30px" }}>
              <div
                className="box-star v2 not-has-gallery"
                style={{
                  display: "flex",
                  width: "100%",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  borderRight: "unset",
                  borderLeft: "unset",
                  margin: "unset",
                  padding: "unset",
                  alignItems: "center",
                }}
              >
                <RatingSummary
                  name={product.name}
                  // averageRating={product.averageRating}
                  averageRating={product.averageRating}
                  reviewCount={product.reviews?.length || 0}
                />
                <RatingBreakdown reviews={product.reviews || []} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductRating;
