import express from "express";
import BlogPost from "../models/BlogPost.js";
import { ensureAdmin } from "../middleware/auth.js"; // Make sure this middleware checks if user is admin

const router = express.Router();

// ========== ADMIN ROUTES ========== //

// Admin: Blog dashboard (list posts)
router.get("/admin/blog", ensureAdmin, async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.render("admin/blogDashboard", { posts });
  } catch (err) {
    console.error("Error loading blog dashboard:", err);
    res.status(500).send("Server error");
  }
});

// Admin: New blog post form
router.get("/admin/blog/new", ensureAdmin, (req, res) => {
  res.render("admin/newPost");
});

// Admin: Create new blog post
router.post("/admin/blog", ensureAdmin, async (req, res) => {
  const { title, content } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "");
  try {
    await BlogPost.create({ title, slug, content });
    res.redirect("/admin/blog");
  } catch (err) {
    console.error("Error creating blog post:", err);
    res.status(500).send("Error creating blog post");
  }
});

// Admin: Edit blog post form
router.get("/admin/blog/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");
    res.render("admin/editPost", { post });
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Server error");
  }
});

// Admin: Handle update
router.post("/admin/blog/edit/:id", ensureAdmin, async (req, res) => {
  const { title, content } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "");
  try {
    await BlogPost.findByIdAndUpdate(req.params.id, {
      title,
      slug,
      content,
      updatedAt: new Date(),
    });
    res.redirect("/admin/blog");
  } catch (err) {
    console.error("Error updating blog post:", err);
    res.status(500).send("Error updating post");
  }
});

// Admin: Delete post
router.post("/admin/blog/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
    res.redirect("/admin/blog");
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).send("Error deleting post");
  }
});


// ========== PUBLIC ROUTES ========== //

// Public: List blog posts
router.get("/blog", async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.render("blog/blog", { posts, page: "blog" });
  } catch (err) {
    console.error("Error loading blog posts:", err);
    res.status(500).send("Error loading posts");
  }
});

// Public: View single post
router.get("/blog/:slug", async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).render("404");
    res.render("blog/show", { post });
  } catch (err) {
    console.error("Error loading post:", err);
    res.status(500).send("Error loading blog post");
  }
});

export default router;