import React from "react";
import OutstandingAccessoriesItem from "./OutstandingAccessoriesItem";
import "../css/Accessory.css";

const OutstandingAccessories = ({
  accessories = [],
  selectedCategoryId,
  selectedFilter,
}) => {
  const toCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  const isValid = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const filteredAccessories = accessories.filter((accessory) => {
    if (!selectedCategoryId) return true;
    return accessory?.category?._id === selectedCategoryId;
  });

  const uniqueAccessories = [];
  const seenIds = new Set();
  const seenCategoryNames = new Set();

  filteredAccessories.forEach((accessory) => {
    const id = accessory?._id;
    const categoryName = accessory?.category?.name?.toLowerCase();
    const imageUrl = accessory?.category?.imageUrl;

    // Kiểm tra nếu imageUrl không chứa "https://example.com/"
    const isExampleDomain =
      imageUrl && imageUrl.includes("https://example.com/");
    if (
      id &&
      !seenIds.has(id) &&
      categoryName &&
      !seenCategoryNames.has(categoryName) &&
      isValid(imageUrl) &&
      !isExampleDomain // Loại bỏ nếu chứa example.com
    ) {
      seenIds.add(id);
      seenCategoryNames.add(categoryName);
      uniqueAccessories.push(accessory);
    }
  });

  console.log("Unique accessories after filtering:", uniqueAccessories);

  if (uniqueAccessories.length === 0) {
    return null;
  }

  return (
    // <section className="accessory-products">
    <div className="accessory-products-list">
      {uniqueAccessories.length > 0 ? (
        uniqueAccessories
          .slice(0, 10)
          .map((accessory) => (
            <OutstandingAccessoriesItem
              key={accessory._id || Math.random()}
              accessory={accessory}
            />
          ))
      ) : (
        <p>Không có phụ kiện nào để hiển thị.</p>
      )}
    </div>
    // </section>
  );
};

export default OutstandingAccessories;
