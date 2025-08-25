import React from "react";
import TechAccessoriesItem from "./TechAccessoriesItem";
import "../css/Accessory.css";

const TechAccessories = ({
  accessories = [],
  selectedCategoryId,
  allAccessories = [],
}) => {
  const topCapitalize = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
  };

  const isValid = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (_) {
      return url.startsWith("/") || url.startsWith("https");
    }
  };

  const filteredAccessories =
    accessories.length > 0
      ? accessories
      : allAccessories.filter((accessory) => {
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

    const isExampleDomain =
      imageUrl && imageUrl.includes("https://example.com/");
    if (
      id &&
      !seenIds.has(id) &&
      categoryName &&
      !seenCategoryNames.has(categoryName) &&
      (isValid(imageUrl) || imageUrl) &&
      !isExampleDomain
    ) {
      seenIds.add(id);
      seenCategoryNames.add(categoryName);
      uniqueAccessories.push(accessory);
    } else {
      //   console.warn("Accessory filtered out:", {
      //     id,
      //     categoryName,
      //     imageUrl,
      //     isValid: isValid(imageUrl),
      //     isExampleDomain,
      //   });
    }
  });

  console.log(
    "Unique accessories after filtering:",
    uniqueAccessories.map((a) => ({
      _id: a._id,
      name: a.name,
      categoryName: a.category?.name,
      categorySlug: a.category?.slug,
      imageUrl: a.category?.imageUrl,
    }))
  );

  if (uniqueAccessories.length === 0) {
    return null;
  }

  return (
    <ul className="accessory-options">
      {uniqueAccessories.slice(0, 5).map((accessory, index) => (
        <TechAccessoriesItem
          key={accessory._id}
          accessory={accessory}
          index={index}
        />
      ))}
    </ul>
  );
};

export default TechAccessories;
