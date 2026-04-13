import { useState } from 'react'
import { Link } from 'react-router-dom'

function Header() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src="/images/VentureCreations.webp" alt="Venture Creations" />
      </Link>

      <button
        className="nav-toggle"
        aria-label="Toggle navigation"
        onClick={() => setNavOpen(!navOpen)}
      >
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </button>

      <ul className={`navbar-links${navOpen ? ' open' : ''}`}>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/shop">Shop</Link></li>
        <li><a href="/contact">Contact</a></li>
        <li><Link to="/blog">Blog</Link></li>
        <li><Link to="/cart" className="cart-link">🛒</Link></li>
        <li><a href="/auth/google" className="btn-nav">Login</a></li>
      </ul>
    </nav>
  )
}

export default Header
