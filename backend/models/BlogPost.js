// models/BlogPost.js
import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  shortDescription: { type: String },
  topic: { type: String },
  content: { type: String, required: true },
  author: { type: String, default: "Elisha" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  coverImageUrl: { type: String },
  hashtags: [{ type: String }]
});

export default mongoose.model("BlogPost", blogPostSchema);