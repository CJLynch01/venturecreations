// models/BlogPost.js
import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  content: { type: String, required: true },
  author: { type: String, default: "Elisha" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  coverImageUrl: { type: String }, // optional
});

export default mongoose.model("BlogPost", blogPostSchema);
