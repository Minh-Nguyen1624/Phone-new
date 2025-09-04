const ProductDetailLink = ({ product }) => (
  <ul>
    <li>
      <a href={product?.link} target="_blank" rel="noopener noreferrer">
        {product?.link}
      </a>
    </li>
  </ul>
);

export default ProductDetailLink;
