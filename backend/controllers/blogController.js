import BlogPost from "../models/BlogPost.js";
import slugify from "slugify";

export const getAllPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.render("blog/index", { posts });
  } catch (err) {
    console.error("Error loading blog posts:", err);
    res.status(500).send("Error loading posts");
  }
};

export const getPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).render("404");
    res.render("blog/show", { post });
  } catch (err) {
    console.error("Error loading blog post:", err);
    res.status(500).send("Error loading post");
  }
};

export const createPost = async (req, res) => {
  try {
    const { title, topic, description, content, coverImageUrl, hashtags } = req.body;

    const newPost = new BlogPost({
      title,
      topic,
      shortDescription: description,
      content,
      coverImageUrl,
      hashtags: hashtags ? hashtags.split(",").map(tag => tag.trim()) : [],
      slug: slugify(title, { lower: true, strict: true }),
    });

    await newPost.save();
    res.redirect("/blog");
  } catch (err) {
    console.error("Error creating blog post:", err);
    res.status(500).send("Failed to create blog post");
  }
};