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
}) => {
  console.log("Props: ", accessories);
  console.log("Category: ", category);
  console.log("Selected Filter: ", selectedFilter);
  console.log("Selected Category ID: ", selectedCategoryId);

  const childCategories = getChildCategories();
  console.log(
    "Child Categories for selectedFilter:",
    selectedFilter,
    "selectedCategoryId:",
    selectedCategoryId,
    "Result:",
    childCategories
  );

  console.log("Show Sub Categories: ", showSubCategories);

  const [showSub, setShowSub] = useState(false);

  const shouldRender =
    showSubCategories || (childCategories.length > 0 && !loading);

  return (
    <>
      <div className="camera-section">
        <div className="camera-banner">
          <a href="#">
            <img
              src="	https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/76/0e/760e348210d23d2ab5b9524d630d79d0.png"
              alt="Thiết bị nhà thông tin"
              width="400px"
              height="400px"
            />
          </a>
        </div>
        <aside className="camera-list">
          <ul className="accessory-block_products">
            <li className="accessory-list">
              <a href="#">Nổi bật</a>
            </li>

            <div className="sell-all">
              <a href="#" className="accessory-all_products">
                Xem tất cả camera
              </a>
              <FaCaretRight className="caret-icon" />
            </div>
          </ul>
          <div className="prt-accessory">
            <div className="ajax-call">
              <div className="list-product_camera">
                <div className="owt-stage">
                  <div className="owt-item">
                    <li className="item__cate">
                      <a href="#" className="item__cate-link">
                        <div className="item-label"></div>
                        <div className="item-img">
                          <img
                            src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Products/Images/4728/329241/camera-ip-360-do-3mp-ezviz-ty1-thumb-1-638665876017214332-600x600.jpg"
                            alt=""
                          />
                        </div>
                        <p className="result-label">
                          <img src="#" alt="" />
                          <span>Sale Tựu Trường</span>
                        </p>
                        <h3></h3>
                        <strong></strong>
                        <div className="box-p">
                          <p className="price-old"></p>
                          <span></span>
                        </div>
                      </a>
                      <div className="item-bottom">
                        <a href="#" className="shipping"></a>
                      </div>
                      <div className="rating_Compare">
                        <div className="vote-txt">
                          <b></b>
                        </div>
                        <span></span>
                      </div>
                    </li>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default CameraSection;
