import express from "express";
import BlogPost from "../models/BlogPost.js";
import { ensureAdmin } from "../middleware/auth.js"; // Make sure this middleware checks if user is admin
import { uploadsEnabled } from "../lib/uploads.js";

const router = express.Router();

// ========== ADMIN ROUTES ========== //

// Admin: Blog dashboard (list posts)
router.get("/admin/blog", ensureAdmin, async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.render("admin/blogDashboard", { title: "Blog", posts, saved: req.query.saved || "", page: "blogDashboard" });
  } catch (err) {
    console.error("Error loading blog dashboard:", err);
    res.status(500).send("Server error");
  }
});

// "What to Pack!" -> "what-to-pack"; adds -2, -3... when another post already has it
async function uniqueSlug(title, exceptId) {
  const base = String(title).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "post";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await BlogPost.exists({ slug, _id: { $ne: exceptId } }))) return slug;
  }
}

function postFromForm(b) {
  const cover = String(b.coverImageUrl || "").trim();
  return {
    title: String(b.title || "").trim().slice(0, 140),
    topic: String(b.topic || "").trim().slice(0, 60),
    shortDescription: String(b.description || "").trim().slice(0, 160),
    content: String(b.content || "").trim(),
    coverImageUrl: /^(https:\/\/|\/)/.test(cover) ? cover : "",
    hashtags: String(b.hashtags || "").split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean),
  };
}

async function renderPostForm(res, post, error = "") {
  const topics = (await BlogPost.distinct("topic")).filter(Boolean).sort();
  res.status(error ? 400 : 200).render("admin/postForm", {
    title: post._id ? "Edit post" : "Write a post", post, error, topics, uploadsEnabled: uploadsEnabled(),
  });
}
const postProblem = p => !p.title ? "Give the post a title." : !p.content ? "The post is empty." : "";

// Admin: New blog post form
router.get("/admin/blog/new", ensureAdmin, async (req, res) => {
  try {
    await renderPostForm(res, {});
  } catch (err) {
    console.error("Error loading post form:", err);
    res.status(500).send("Server error");
  }
});

// Admin: Create new blog post
router.post("/admin/blog", ensureAdmin, async (req, res) => {
  try {
    const post = postFromForm(req.body);
    const problem = postProblem(post);
    if (problem) return renderPostForm(res, post, problem);
    await BlogPost.create({ ...post, slug: await uniqueSlug(post.title) });
    res.redirect("/admin/blog?saved=added");
  } catch (err) {
    console.error("Error creating blog post:", err);
    res.status(500).send("Error creating blog post");
  }
});

// Admin: Edit blog post form
router.get("/admin/blog/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id).lean();
    if (!post) return res.status(404).send("Post not found");
    await renderPostForm(res, post);
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Server error");
  }
});

// Admin: Handle update. The link (slug) stays the same so shared links and Google keep working.
router.post("/admin/blog/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const existing = await BlogPost.findById(req.params.id);
    if (!existing) return res.status(404).send("Post not found");
    const post = postFromForm(req.body);
    const problem = postProblem(post);
    if (problem) return renderPostForm(res, { ...post, _id: existing._id, slug: existing.slug }, problem);
    Object.assign(existing, post, { updatedAt: new Date() });
    if (!existing.slug) existing.slug = await uniqueSlug(post.title, existing._id);
    await existing.save();
    res.redirect("/admin/blog?saved=updated");
  } catch (err) {
    console.error("Error updating blog post:", err);
    res.status(500).send("Error updating post");
  }
});

// Admin: Delete post
router.post("/admin/blog/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
    res.redirect("/admin/blog?saved=removed");
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
    // Search and link-preview details for the post
    Object.assign(res.locals.seo || (res.locals.seo = {}), {
      description: (post.shortDescription || post.content.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 155),
      image: post.coverImageUrl || undefined,
      type: "article",
    });
    res.render("blog/show", { post, title: post.title });
  } catch (err) {
    console.error("Error loading post:", err);
    res.status(500).send("Error loading blog post");
  }
});

// ========== API ROUTES (for React) ========== //

// API: List blog posts
router.get("/api/blog", async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Error loading blog posts:", err);
    res.status(500).json({ error: "Error loading posts" });
  }
});

// API: Single blog post
router.get("/api/blog/:slug", async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("Error loading post:", err);
    res.status(500).json({ error: "Error loading post" });
  }
});

export default router;