import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import ProductCard from '../components/ProductCard.jsx'

function Home() {
  const [products, setProducts] = useState([])

  const [heroProduct, setHeroProduct] = useState(null)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.slice(0, 4))
        const random = data[Math.floor(Math.random() * data.length)]
        setHeroProduct(random)
      })
      .catch(err => console.error('Failed to load products:', err))
  }, [])

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="hero">
        <div className="hero-left">
          <h1>Custom Shirts for Every Venture</h1>
          <p>From missionary trips to youth group events — we craft shirts that inspire confidence and unity.</p>
          <Link to="/shop" className="btn-hero">Shop Now</Link>
        </div>
        <div className="hero-right">
          <img src={heroProduct?.images[0] || '/images/banner1.webp'} alt="Featured Shirt" />
        </div>
      </section>

      {/* Search */}
      <section className="search-section">
        <form action="/search" method="GET" className="search-form">
          <input type="text" name="q" placeholder="Search products..." />
          <button type="submit"><i className="fas fa-search"></i></button>
        </form>
      </section>

      {/* Category Banners */}
      <section className="categories-section">
      <div className="categories">
        <div className="category-card">
          <img src="/images/banner2.webp" alt="Missionary Shirts" />
          <div className="category-overlay">
            <h3>Missionary Shirts</h3>
            <Link to="/shop">Shop Now</Link>
          </div>
        </div>
        <div className="category-card">
          <img src="/images/banner1.webp" alt="Group Shirts" />
          <div className="category-overlay">
            <h3>Group Shirts</h3>
            <Link to="/shop">Shop Now</Link>
          </div>
        </div>
        <div className="category-card">
          <img src="/images/banner3.webp" alt="Business Shirts" />
          <div className="category-overlay">
            <h3>Business Shirts</h3>
            <Link to="/shop">Shop Now</Link>
          </div>
        </div>
      </div>
      </section>

      {/* Featured Products */}
      <section className="featured">
        <div className="section-header">
          <h2>Newly Added Designs</h2>
          <Link to="/shop">View All →</Link>
        </div>
        <div className="product-grid">
          {products.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Value Props */}
      <section className="value-props">
        <div className="value-props-inner">
          <div className="value-prop">
            <img src="/images/shipping.png" alt="Fast Shipping" />
            <h4>Fast, Free Shipping</h4>
            <p>On orders over $100</p>
          </div>
          <div className="value-prop">
            <img src="/images/thumbup.png" alt="Satisfaction Guarantee" />
            <h4>Satisfaction Guarantee</h4>
            <p>On all of our products</p>
          </div>
          <div className="value-prop">
            <img src="/images/bulk.png" alt="Bulk Discounts" />
            <h4>Bulk Discounts</h4>
            <p>Available on all products</p>
          </div>
          <div className="value-prop">
            <img src="/images/customizable.png" alt="Customizable" />
            <h4>Customizable Designs</h4>
            <p>Available on all products</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

export default Home
