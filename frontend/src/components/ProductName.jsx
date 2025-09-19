import {
  FaRegStar,
  FaCircle,
  FaCartPlus,
  FaPhoneAlt,
  FaAngleDown,
  FaAngleUp,
} from "react-icons/fa";

const ProductName = ({ name, product }) => (
  <div className="product-name">
    <div className="box-1">
      <h2>{name}</h2>
      <div className="box-2">
        {/* <span className="quantity-sale">Đã bán {product?.reserved}</span> */}
        <span className="quantity-sale">Đã bán {product?.sold ?? 0}</span>
        <div className="box-2_left">
          <div className="detail-rate">
            <p>
              <FaRegStar className="rating" />
              {product?.rating}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div className="like-fanpage">
      {/* <iframe
            src="#"
            frameborder="0"
            allowTransparency="true"
            scrolling="no"
            width="150px"
            height="40px"
            allow="encrypted-media"
            style={{ border: "none" }}
          ></iframe> */}
    </div>
  </div>
);

export default ProductName;
