import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/images/VentureCreations.webp" alt="Venture Creations" />
          <p>Custom shirts to support all of life's ventures. From missionary work to youth group events.</p>
        </div>

        <div className="footer-links-group">
          <div className="footer-col">
            <h5>Shop</h5>
            <ul>
              <li><Link to="/shop">All Products</Link></li>
              <li><Link to="/shop">Missionary Shirts</Link></li>
              <li><Link to="/shop">Group Shirts</Link></li>
              <li><Link to="/shop">Business Shirts</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/auth/google">Login</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Venture Creations. All rights reserved.</p>
        <div className="social-icons">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://www.pinterest.com" target="_blank" rel="noreferrer" aria-label="Pinterest">
            <i className="fab fa-pinterest-p"></i>
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
