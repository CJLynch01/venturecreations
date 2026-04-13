import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

function Blog() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    fetch('/api/blog')
      .then(res => res.json())
      .then(data => setPosts(data))
      .catch(err => console.error('Failed to load posts:', err))
  }, [])

  return (
    <>
      <Header />

      <section className="blog-banner">
        <h1>Our Blog</h1>
        <p>Stories, tips, and inspiration</p>
      </section>

      <main className="blog-page-react">
        {posts.length === 0 ? (
          <p className="no-results">No posts yet.</p>
        ) : (
          <div className="blog-grid-react">
            {posts.map(post => (
              <Link to={`/blog/${post.slug}`} key={post._id} className="blog-card-react">
                {post.coverImageUrl && (
                  <img src={post.coverImageUrl} alt={post.title} className="blog-card-img" />
                )}
                <div className="blog-card-body">
                  {post.topic && <span className="blog-topic">{post.topic}</span>}
                  <h2>{post.title}</h2>
                  {post.shortDescription && <p>{post.shortDescription}</p>}
                  <div className="blog-meta">
                    <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    {post.hashtags?.length > 0 && (
                      <div className="blog-tags">
                        {post.hashtags.map(tag => (
                          <span key={tag} className="blog-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="read-more-link">Read More →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}

export default Blog
