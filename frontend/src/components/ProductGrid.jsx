import React from "react";
import MainProduct from "../components/MainProduct";
import "../css/MainProduct.css";

const ProductGrid = ({
  monitors,
  soldQuantities,
  displayLimit,
  loadMore,
  purchasePhone,
}) => {
  return (
    <>
      {/* <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        style={{ paddingTop: "40px", paddingBottom: "40px" }}
      >
        {monitors.slice(0, displayLimit).map((monitor) => (
          <MainProduct
            key={monitor._id}
            phone={monitor}
            soldQuantities={soldQuantities[monitor._id] || 0}
            purchasePhone={purchasePhone}
          />
        ))}
      </div> */}
      <ul className="listproduct">
        {monitors.slice(0, displayLimit).map((monitor) => (
          <MainProduct
            key={monitor._id}
            phone={monitor}
            soldQuantities={soldQuantities[monitor._id] || 0}
            purchasePhone={purchasePhone}
          />
        ))}
      </ul>
      {displayLimit < monitors.length && (
        <div
          className="text-center mt-4 flex justify-content-center"
          style={{ paddingBottom: "2rem" }}
        >
          <button
            className="text-blue py-2 px-4 rounded-lg transition duration-300 bg-white hover:bg-gray-100"
            onClick={loadMore}
          >
            Xem thêm sản phẩm
          </button>
        </div>
      )}
    </>
  );
};

export default ProductGrid;
