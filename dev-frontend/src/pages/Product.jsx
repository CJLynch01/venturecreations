import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => setProduct(data))
      .catch(err => console.error('Failed to load product:', err))
  }, [id])

  if (!product) return <p style={{ padding: '2rem' }}>Loading...</p>

  return (
    <>
      <Header />
      <main className="product-detail-page">
        <div className="product-images">
          <img src={product.images[0]} alt={product.name} />
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>
          <p className="price">${product.price.toFixed(2)}</p>
          <p>{product.category}</p>
          <p>Available sizes: {product.sizes.join(', ')}</p>
          <p>Colors: {product.colors.join(', ')}</p>
          <p>In Stock: {product.stock}</p>

          <form action="/cart/add" method="POST" className="product-options">
            <input type="hidden" name="productId" value={product._id} />

            <label htmlFor="size">Select Size</label>
            <select
              name="size"
              id="size"
              required
              value={selectedSize}
              onChange={e => setSelectedSize(e.target.value)}
            >
              <option value="" disabled>Choose a size</option>
              {product.sizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>

            <label htmlFor="color">Select Color</label>
            <select
              name="color"
              id="color"
              required
              value={selectedColor}
              onChange={e => setSelectedColor(e.target.value)}
            >
              <option value="" disabled>Choose a color</option>
              {product.colors.map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>

            <button type="submit" className="btn-add">Add to Cart</button>
          </form>

          <Link to="/shop" className="btn btn-secondary" style={{ marginTop: '1rem' }}>← Back to Shop</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default Product
