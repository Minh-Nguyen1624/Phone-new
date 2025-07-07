export const formatQuantity = (quantity) => {
  if (quantity >= 1000) return `${(quantity / 1000).toFixed(1)}K`;
  if (quantity < 0) return "Hết";
  return quantity;
};

export const RenderRating = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  for (let i = 0; i < fullStars; i++)
    stars.push(
      <span key={i} className="text-yellow-500">
        ★
      </span>
    );
  if (hasHalfStar)
    stars.push(
      <span key="half" className="text-yellow-500 opacity-50">
        ★
      </span>
    );
  while (stars.length < 5)
    stars.push(
      <span key={`empty-${stars.length}`} className="text-gray-300">
        ★
      </span>
    );
  return stars;
};
