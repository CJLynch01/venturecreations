import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import ProductCard from '../components/ProductCard.jsx'

const PER_PAGE = 8

function Shop() {
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        const cats = ['All', ...new Set(data.map(p => p.category).filter(Boolean))]
        setCategories(cats)
      })
      .catch(err => console.error('Failed to load products:', err))
  }, [])

  useEffect(() => {
    let result = [...products]

    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory)
    }

    if (search) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price)
    else if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))

    setFiltered(result)
    setPage(1)
  }, [sort, search, selectedCategory, products])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <>
      <Header />

      {/* Shop Banner */}
      <section className="shop-banner">
        <h1>Our Collection</h1>
        <p>Custom shirts for every occasion</p>
      </section>

      <div className="shop-layout">

        {/* Sidebar */}
        <aside className="shop-sidebar">
          <h3>Categories</h3>
          <ul className="category-list">
            {categories.map(cat => (
              <li key={cat}>
                <button
                  className={`category-btn${selectedCategory === cat ? ' active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content */}
        <main className="shop-main">

          {/* Toolbar */}
          <div className="shop-toolbar">
            <p className="product-count">{filtered.length} Products</p>
            <div className="shop-toolbar-right">
              <input
                type="text"
                className="shop-search"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className="shop-sort"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {paginated.length > 0 ? (
            <div className="product-grid-2col">
              {paginated.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <p className="no-results">No products found.</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`page-btn${page === n ? ' active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}

              <button
                className="page-btn"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}

        </main>
      </div>

      <Footer />
    </>
  )
}

export default Shop
