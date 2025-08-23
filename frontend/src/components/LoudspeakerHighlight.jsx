import React, { useEffect } from "react";
import LoudspeakerProductList from "./LoudspeakerProductList";
import { useAccessoryData } from "./useAccessoryData";
import "../css/Accessory.css";

const LoudspeakerHighlight = () => {
  const { accessories, loading, error, filterByCategory } = useAccessoryData();

  // Hàm xử lý khi nhấn "Nổi bật"
  useEffect(() => {
    filterByCategory(null); // Reset để hiển thị tất cả sản phẩm từ validCategories
  }, [filterByCategory]);

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="accessory-container">
      <div className="warpper-content">
        <div className="accessory-products accessory-products_camera">
          <div className="prt-accessory">
            <div className="camera-section">
              <div className="sell-all">
                <ul className="accessory-block_products">
                  <li className="accessory-list active">
                    <a href="#" onClick={() => filterByCategory(null)}>
                      Nổi bật
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="camera-list">
              <div className="list-product_camera highlight-container">
                <div className="owt-stage highlight-stage">
                  <LoudspeakerProductList
                    accessories={accessories}
                    soldQuantities={{}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoudspeakerHighlight;
