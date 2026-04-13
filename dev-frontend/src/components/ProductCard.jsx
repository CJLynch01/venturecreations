import { Link } from 'react-router-dom'

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <img src={product.images[0]} alt={product.name} />
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="price">${product.price.toFixed(2)}</p>
        <Link to={`/shop/${product._id}`} className="btn">View Shirt</Link>
      </div>
    </div>
  )
}

export default ProductCard
