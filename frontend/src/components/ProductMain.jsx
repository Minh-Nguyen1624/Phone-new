import {
  FaRegStar,
  FaCircle,
  FaCartPlus,
  FaPhoneAlt,
  FaAngleDown,
  FaAngleUp,
} from "react-icons/fa";

const PolicyItem = ({ title, description, highlight, extra }) => {
  return (
    <li>
      <div className="pl-icon"></div>
      <div className="pl-txt">
        <p>
          {title && <strong>{title}: </strong>}
          {description} {highlight && <strong>{highlight}</strong>}
          {extra && ` ${extra}`}
        </p>
      </div>
    </li>
  );
};

const ProductMain = ({
  product,
  handlePrev,
  handleNext,
  handleClickEvent,
  isOpen,
  specifications,
  images,
  handAddToCart,
  isActive,
  toggleIsActive,
  color,
  currentIndex,
  itemsPerPage,
}) => {
  // Lấy tất cả sections từ specificationFields
  const sections = product?.category?.specificationFields || [];
  console.log(
    "product?.category?.specificationFields:",
    product?.category?.specificationFields
  );

  const policySection = sections.find((section) => {
    section.sectionTitle === "Chính sách";
  });

  const policyItems = policySection
    ? policySection.fields
        .map((field) => {
          const value = specifications[field.key];
          if (value === undefined || value === null || value === "")
            return null;

          if (field.key === "inBox" && Array.isArray(value)) {
            return {
              title: field.label,
              description: "Trong hộp có: ",
              extra: value.join(", "),
            };
          }
          return {
            title: field.label,
            description: "",
            highlight: value,
          };
        })
        .filter((item) => item !== null)
    : [];

  return (
    <div className="box-main">
      <div className="box_left">
        <aside id="slider-detail" className="show">
          <div className="bgfullScreen-gallery"></div>
          <div className="wrap-slider">
            <div className="closefullScreen-gallery">Đóng</div>
            <div className="gallery-img">
              <div className="img-slide full">
                <div className="prev"></div>
                <div className="next"></div>
                <div className="owl-carousel slider-img owl-loaded owl-drag">
                  <div className="owl-stage-outer">
                    <div
                      className="owl-stage"
                      style={{
                        transform: "translate3d(0px, 0px, 0px)",
                        transition: "all 0.3s ease",
                        width: "2720px",
                      }}
                    >
                      <div className="owl-item" style={{ width: "680px" }}>
                        <div className="item-img">
                          <img
                            src={product?.image}
                            alt={product?.name || "Product Image"}
                            width="680px"
                            height="380px"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="owl-nav">
            <button
              type="button"
              aria-label="Previous"
              className="owl-prev prev"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <span>‹</span>
            </button>
            <button
              type="button"
              aria-label="Next"
              className="owl-next next"
              onClick={handleNext}
              disabled={
                currentIndex >=
                Math.max(0, Math.ceil((images?.length || 1) / itemsPerPage) - 1)
              }
            >
              <span>›</span>
            </button>
          </div>
          <div className="owl-dots">
            {images?.map((image, index) => (
              <button
                key={index}
                className={`owl-dot dotnumber${index} ${
                  index === currentIndex ? "active" : ""
                }`}
              >
                <img
                  className="theImg"
                  src={image?.url}
                  alt={image?.alt || "Thumbnail"}
                  width="50px"
                  height="50px"
                />
              </button>
            ))}
          </div>
        </aside>

        <div className="policy policy-vs">
          <h2>{product?.name || "NamPhuong-Store"}</h2>
          <ul className="policy__list">
            {/* <li>
              <div className="pl-icon"></div>
              <div className="pl-txt">
                <p>
                  1 đổi 1 trong vòng <b>12 tháng</b> đối với sản phẩm lỗi do nhà
                  sản xuất
                </p>
              </div>
            </li>
            <li>
              <div className="pl-icon"></div>
              <div className="pl-txt">
                <p>
                  Trong hộp có: Ốc vít, Tấm gắn, Sách hướng dẫn, Mẫu khoan, Dây
                  cáp, Camera, Bộ chuyển đổi nguồn DC
                </p>
              </div>
            </li>
            <li>
              <div className="pl-icon"></div>
              <div className="pl-txt">
                <p>
                  Bảo hành có cam kết <b>12 tháng</b>
                </p>
              </div>
            </li>
            <li>
              <div className="pl-icon"></div>
              <div className="pl-txt">
                <p>
                  Bảo hành <b>chính hãng camera giám sát 2 năm</b> tại các trung
                  tâm bảo hành hãng
                </p>
              </div>
            </li> */}
            {policyItems.map((item, index) => (
              <PolicyItem
                key={index}
                title={item.title}
                description={item.description}
                highlight={item.highlight}
                extra={item.extra}
              />
            ))}
          </ul>
        </div>

        <div id="tab-spec" className="tabs col2">
          <h2
            id="specification-tabs"
            className={`tab-link ${
              isActive === "specification" ? "current" : ""
            }`}
            onClick={() => toggleIsActive("specification")}
          >
            Thông số kỹ thuật
          </h2>
          <h2
            id="info-tabs"
            className={`tab-link ${isActive === "info" ? "current" : ""}`}
            onClick={() => toggleIsActive("info")}
          >
            Thông tin sản phẩm
          </h2>
        </div>

        <div className="specifications tab-content">
          <div id="specification-item" className="specification-item">
            {sections.length > 0 && (
              <div>
                {sections.map((section, sectionIndex) => (
                  <div
                    key={section._id}
                    className="box-specifi"
                    style={{ marginTop: "0", paddingTop: "20px" }}
                  >
                    <a
                      href="#"
                      onClick={(e) => handleClickEvent(sectionIndex, e)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "60px",
                      }}
                    >
                      {section.sectionTitle &&
                        section.sectionTitle.trim() !== "" && (
                          <h3>{section.sectionTitle}</h3>
                        )}
                      {isOpen[sectionIndex] ? (
                        <FaAngleUp style={{ marginRight: "10px" }} />
                      ) : (
                        <FaAngleDown style={{ marginRight: "10px" }} />
                      )}
                    </a>
                    {isOpen[sectionIndex] && (
                      <ul className="text-specifi">
                        {section.fields
                          .filter((field) => {
                            const keys = field.key.split(".");
                            let value = specifications;
                            for (let key of keys) {
                              value =
                                value && typeof value === "object"
                                  ? value[key]
                                  : undefined;
                              if (value === undefined) break;
                            }
                            return (
                              value !== undefined &&
                              value !== null &&
                              value !== ""
                            );
                          })
                          .map((field, fieldIndex) => {
                            const keys = field.key.split(".");
                            let value = specifications;
                            for (let key of keys) {
                              value =
                                value && typeof value === "object"
                                  ? value[key]
                                  : undefined;
                            }
                            let displayValue;
                            if (
                              field.key === "utilities" &&
                              Array.isArray(value)
                            ) {
                              displayValue = value.map((item, idx) => (
                                <span key={idx} style={{ display: "block" }}>
                                  {item}
                                </span>
                              ));
                            } else {
                              displayValue = Array.isArray(value)
                                ? value.join(", ")
                                : typeof value === "object" && value !== null
                                ? Object.entries(value)
                                    .map(
                                      ([subKey, subValue]) =>
                                        `${subKey}: ${subValue}`
                                    )
                                    .join(", ")
                                : value || "N/A";
                            }

                            return (
                              <li key={fieldIndex}>
                                <aside>
                                  <strong>{field.label}:</strong>
                                </aside>
                                <aside>{displayValue}</aside>
                              </li>
                            );
                          })}
                        {section.fields.every((field) => {
                          const keys = field.key.split(".");
                          let value = specifications;
                          for (let key of keys) {
                            value =
                              value && typeof value === "object"
                                ? value[key]
                                : undefined;
                            if (value === undefined) break;
                          }
                          return (
                            value === undefined ||
                            value === null ||
                            value === ""
                          );
                        }) && (
                          <li>
                            <aside>
                              <strong>Không có thông số phù hợp</strong>
                            </aside>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="box_right">
        <div className="banner-detail _bannerdetail__top">
          <a href="#" className="banner-detail_link">
            <img
              src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/97/e9/97e9fef634f10230fddc5a629990bcc4.png"
              alt="Banner Top"
              width="920px"
              height="230px"
            />
          </a>
        </div>
        <div className="banner-detail-1">
          <a href="#" className="banner-detail_link">
            <img
              src="https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/97/e9/97e9fef634f10230fddc5a629990bcc4.png"
              alt="Banner Bottom"
              width="920px"
              height="230px"
            />
          </a>
        </div>
        <div className="group-box03">
          <div className="scrolling_inner">
            <div className="box03 color group desk">
              <a href="#" className="box03__item item act">
                <FaCircle
                  className="circle"
                  style={{ backgroundColor: color || "#FBF7F4" }}
                />
                <span>{color || "Default Color"}</span>
              </a>
            </div>
          </div>
        </div>
        <div className="block-button buy">
          <a
            href="#"
            className="btn-buynow white"
            onClick={(e) => {
              e.preventDefault();
              handAddToCart(e);
            }}
          >
            <span className="icon">
              <FaCartPlus />
            </span>
            <span className="text">Thêm vào giỏ hàng</span>
          </a>
          <a href="#" className="btn-buynow buy" onClick={handleClickEvent}>
            Mua ngay
          </a>
        </div>
        <p className="callorder">
          <FaPhoneAlt className="icondetail-hotline" />
          <span className="call">Gọi đặt mua</span>
          <a href="tel:0368800168">0368 800 168</a>
          <span>(8:00 - 21:00)</span>
        </p>
      </div>
    </div>
  );
};

export default ProductMain;
