import React from "react";
import { FaStar } from "react-icons/fa";
import "../css/Accessory.css";

const AccessoryProductList = ({ accessories = [], soldQuantities = {} }) => {
  console.log("AccessoryProductList - accessories:", accessories); // Log chi tiết

  if (!accessories || accessories.length === 0) {
    return <div className="no-products-message">Chưa có sản phẩm</div>;
  }
  return (
    <div className="list-product_camera">
      <div className="owt-stage">
        {Array.isArray(accessories) && accessories.length > 0 ? (
          accessories.map((item, index) => (
            <div className="owt-item" key={item._id || index}>
              <li className="item__cate">
                <a href="#" className="item__cate-link">
                  <div className="item-label"></div>
                  <div className="item-img">
                    <img
                      src={item.image || ""}
                      alt={item.name || "Product"}
                      className="bounce"
                    />
                  </div>
                  <p className="result-label">
                    <img
                      src={item.discount?.discountImage || ""}
                      alt=""
                      width="20px"
                      height="20px"
                    />
                    <span>{item.discount?.code || ""}</span>
                  </p>
                  <h3 className="result-title">{item.name || "No Name"}</h3>
                  <strong className="price">
                    {item.finalPrice || item.price || 0}₫
                  </strong>
                  <div className="box-p">
                    <p className="price-old">{item.price || 0}₫</p>
                    <span className="percent">
                      {"-"}
                      {item.discount?.discountValue || 0}%
                    </span>
                  </div>
                </a>
                <div className="item-bottom">
                  <a href="#" className="shipping"></a>
                </div>
                <div className="rating_Compare">
                  <div className="vote-txt">
                    <FaStar className="star" />
                    <b>{item.rating || 0}</b>
                  </div>
                  <span>• Đã bán {soldQuantities[item._id] || 0}</span>
                </div>
              </li>
            </div>
          ))
        ) : (
          <p>Không có sản phẩm để hiển thị</p>
        )}
      </div>
    </div>
  );
};

export default AccessoryProductList;
