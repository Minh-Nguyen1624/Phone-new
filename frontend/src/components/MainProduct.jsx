import React from "react";
import { RenderRating, formatQuantity } from "../utils/format";

const MainProduct = ({ phone, soldQuantities, toggleLike, purchasePhone }) => {
  const originalPrice = phone.price || 0;
  const finalPrice = phone.finalPrice || originalPrice;
  const discountPercentage =
    originalPrice === 0
      ? 0
      : phone.discount?.discountValue ||
        (((originalPrice - finalPrice) / originalPrice) * 100).toFixed(0) ||
        0;
  const quantity = phone.quantity || 0;
  const stock = phone.stock || 0;
  const reserved = phone.reserved || 0;
  const availableStock = stock - reserved;
  const like = phone.likedBy?.length || 0;
  const userId = localStorage.getItem("userId");
  const userLiked = phone.likedBy?.some(
    (likedById) => likedById.toString() === userId
  );
  const rating = phone.rating || 0;
  const isOutOfStock = availableStock <= 0;
  const soldQuantity = soldQuantities[phone._id] || 0; // Default to 0 if undefined

  console.log("MainProduct props:", { phone, soldQuantities, soldQuantity }); // Debug

  const stockPercentage =
    stock > 0 ? Math.min((availableStock / stock) * 100, 100) : 0;

  return (
    <div
      key={phone._id || phone.name}
      className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition duration-300"
    >
      <div className="relative">
        <img
          src={
            phone.image ||
            (phone.images && phone.images[0]?.url) ||
            "https://via.placeholder.com/200"
          }
          alt={phone.name || "Phone image"}
          className="bounce w-full h-[180px] object-cover rounded-lg"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {phone.name || "Unnamed Phone"}
        </h3>
        <p className="text-red-500 mt-2">
          <span className="font-bold">{finalPrice.toLocaleString()}đ</span>
        </p>
        <p className="text-red-500 mt-2">
          <span className="line-through text-gray-500">
            {originalPrice.toLocaleString()}đ
          </span>
        </p>
        <p className="text-sm text-gray-600 mt-1 text-discount">
          -{discountPercentage}%
        </p>
        <div className="flex items-center mt-2">
          <span className="text-yellow-500 text-sm">🔥</span>
          <div className="w-full bg-gray-200 rounded-full h-2.5 ml-2">
            <div
              className={`bg-yellow-400 h-2.5 rounded-full ${
                isOutOfStock ? "bg-red-500" : ""
              }`}
              style={{ width: `${stockPercentage}px` }}
            >
              <span
                className={`text-sm ml-2 ${
                  isOutOfStock ? "text-red-500 font-bold" : "text-gray-600"
                }`}
              >
                {isOutOfStock
                  ? "Hết hàng"
                  : `Còn ${formatQuantity(availableStock)} sản phẩm`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-rating items-center mt-1">
          {RenderRating(rating)}
          <span className="text-soldQuantity ml-2">
            Đã bán: {formatQuantity(soldQuantity)}
          </span>
        </div>
        <button
          className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300"
          onClick={() => purchasePhone(phone._id, 1)}
          disabled={isOutOfStock}
        >
          Mua ngay
        </button>
        <button
          className={`mt-2 w-full py-2 rounded-lg transition duration-300 ${
            userLiked ? "text-green-500" : "text-gray-500"
          }`}
          onClick={() => toggleLike(phone._id)}
          disabled={isOutOfStock}
        >
          {userLiked ? "✔️" : "◻️"}
        </button>
      </div>
    </div>
  );
};

export default MainProduct;
