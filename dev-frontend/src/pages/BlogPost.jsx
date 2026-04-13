import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then(res => res.json())
      .then(data => setPost(data))
      .catch(err => console.error('Failed to load post:', err))
  }, [slug])

  if (!post) return <p style={{ padding: '2rem' }}>Loading...</p>

  return (
    <>
      <Header />

      <main className="blog-post-page">
        {post.coverImageUrl && (
          <div className="blog-post-cover">
            <img src={post.coverImageUrl} alt={post.title} />
          </div>
        )}

        <article className="blog-post-content">
          {post.topic && <span className="blog-topic">{post.topic}</span>}
          <h1>{post.title}</h1>
          <p className="blog-post-date">
            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {post.shortDescription && (
            <p className="blog-post-description">{post.shortDescription}</p>
          )}

          <div className="blog-post-body">
            {post.content}
          </div>

          {post.hashtags?.length > 0 && (
            <div className="blog-tags" style={{ marginTop: '2rem' }}>
              {post.hashtags.map(tag => (
                <span key={tag} className="blog-tag">#{tag}</span>
              ))}
            </div>
          )}

          <Link to="/blog" className="btn btn-secondary" style={{ marginTop: '2rem', display: 'inline-block' }}>← Back to Blog</Link>
        </article>
      </main>

      <Footer />
    </>
  )
}

export default BlogPost
