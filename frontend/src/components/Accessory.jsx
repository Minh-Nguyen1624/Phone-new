import React, { useState, useEffect, useRef } from "react";
import { FaFilter } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Header from "../components/Header";
import MainProduct from "../components/MainProduct";
import useAccessoryData from "../hooks/useAccessoryData";
import "../css/Accessory.css";

const API_URL = "http://localhost:8080/api";
const Limit = 10;
const InitialDisplayLimit = 8;

const Accessory = () => {
  return (
    <>
      <div className="header-top-bar">
        <div className="banner-top">
          <div className="item">
            <a href="#" className="item-link">
              <img src="//cdnv2.tgdd.vn/mwg-static/tgdd/Banner/3f/8d/3f8d409679edbe42ae3e1e908d62b630.png" />
            </a>
          </div>
        </div>
      </div>
      <Header />
      <div className="accessory-container">
        <section className="accessory-menu">
          <ul className="accessory-options">
            <li>
              <a>
                <img width="50" height="50" src="" />
                <span></span>
                <span></span>
              </a>
            </li>
          </ul>
        </section>

        <div className="warpper-content">
          <section className="accessory-products">
            <h3 className="accessory-options-title">Phụ kiện nổi bật</h3>
            <div className="accessory-products-list">
              <div className="accessory-products-category">
                <a href="#" className="accessory-product-link">
                  <img src="" alt="" width="64px" height="64px" />
                  <h3></h3>
                </a>
              </div>
            </div>
          </section>
        </div>

        <section className="category-brand">
          <div className="category-brand-header">
            <h3 className="category-brand-title">Thương hiệu phụ kiện</h3>
            <a href="#" className="category-all-brand">
              Xem tất cả
            </a>
          </div>
          <div className="quick-link">
            <a href="#" className="quick-link-item"></a>
          </div>
        </section>
      </div>
    </>
  );
};
export default Accessory;
