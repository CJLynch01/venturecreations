// routes/publicRoutes.js
import express from "express";
import BlogPost from "../models/BlogPost.js";

const router = express.Router();

// Blog Listing Page
router.get("/blog", async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.render("blog/index", { posts });
  } catch (err) {
    console.error("Error loading blog posts:", err);
    res.status(500).send("Error loading posts");
  }
});

// Single Blog Post Page
router.get("/blog/:slug", async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).render("404");
    res.render("blog/show", { post });
  } catch (err) {
    console.error("Error loading blog post:", err);
    res.status(500).send("Error loading post");
  }
});

export default router;
