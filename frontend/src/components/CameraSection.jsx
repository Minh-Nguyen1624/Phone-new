import React, { useState } from "react";
import MainProduct from "./MainProduct";
import { FaCaretRight } from "react-icons/fa";
import "../css/Accessory.css";

const CameraSection = ({
  accessories,
  category,
  selectedFilter,
  selectedCategoryId,
  setAccessories,
  loading,
  getChildCategories,
  showSubCategories,
  filterByCategory,
}) => {
  console.log("Props: ", {
    accessories,
    category,
    selectedFilter,
    selectedCategoryId,
  });

  const toCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  const childCategories = getChildCategories();
  console.log("Child Categories:", childCategories);

  const [showSub, setShowSub] = useState(false);

  const shouldRender =
    showSubCategories || (childCategories.length > 0 && !loading);

  return (
    <>
      {shouldRender && !loading && (
        <div className="camera-section">
          <div className="camera-banner">
            <a href="#">
              <img
                src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/76/0e/760e348210d23d2ab5b9524d630d79d0.png"
                alt="Thiết bị nhà thông tin"
                width="400px"
                height="400px"
              />
            </a>
          </div>
          <aside className="camera-list">
            <ul className="accessory-block_products">
              <li className="accessory-list">
                <a href="#" onClick={() => setShowSub(true)}>
                  Nổi bật
                </a>
              </li>
              {childCategories.length > 0 ? (
                childCategories.slice(0, 4).map((cat) => (
                  <li
                    key={cat._id || cat.name}
                    className={`accessory-list-1 ${
                      selectedFilter === cat.name.toLowerCase() ? "active" : ""
                    }`}
                    onClick={() => filterByCategory(cat.name)}
                  >
                    <a href="#">{toCapitalize(cat.name)}</a>
                  </li>
                ))
              ) : (
                <p>Không có danh mục con để hiển thị</p>
              )}
              <div className="sell-all">
                <a href="#" className="accessory-all_products">
                  Xem tất cả phụ kiện Camera...
                </a>
                <FaCaretRight className="caret-icon" />
              </div>
            </ul>
            <div className="prt-accessory">
              <div className="ajax-call">
                <div className="list-product_camera">
                  <div className="owt-stage">
                    {accessories.length > 0 ? (
                      accessories.map((item, index) => (
                        <div className="owt-item" key={item._id || index}>
                          <li className="item__cate">
                            <a href="#" className="item__cate-link">
                              <div className="item-label"></div>
                              <div className="item-img">
                                <img
                                  src={
                                    item.image ||
                                    "https://cdnv2.tgdd.vn/mwg-static/tgdd/Products/Images/4728/329241/camera-ip-360-do-3mp-ezviz-ty1-thumb-1-638665876017214332-600x600.jpg"
                                  }
                                  alt={item.name}
                                  className="bounce"
                                />
                              </div>
                              <p className="result-label">
                                <img
                                  src="https://cdnv2.tgdd.vn/mwg-static/common/Campaign/32/11/32110c30b7f564e80acd07741b81597d.png"
                                  alt=""
                                  width="20px"
                                  height="20px"
                                />
                                <span>Sale Tựu Trường</span>
                              </p>
                              <h3 className="result-title">{item.name}</h3>
                              <strong className="price">
                                {item.finalPrice || item.price || "450.000"}₫
                              </strong>
                              <div className="box-p">
                                <p className="price-old">
                                  {item.price || "635.000"}₫
                                </p>
                                <span className="percent">
                                  {item.discount?.discountValue || "-29"}%
                                </span>
                              </div>
                            </a>
                            <div className="item-bottom">
                              <a href="#" className="shipping"></a>
                            </div>
                            <div className="rating_Compare">
                              <div className="vote-txt">
                                <b>{item.rating || "4.9"}</b>
                              </div>
                              <span>
                                • Đã bán{" "}
                                {item.soldQuantities?.[item._id] || "77,2k"}
                              </span>
                            </div>
                          </li>
                        </div>
                      ))
                    ) : (
                      <p>Không có sản phẩm để hiển thị</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default CameraSection;
