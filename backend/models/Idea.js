import mongoose from "mongoose";

// Ideas for the shop, listed for her at /admin/ideas
export const IDEA_STATUSES = ["Idea", "Planned", "In progress", "Live", "Not doing"];

const ideaSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 120 },
  notes: { type: String, maxlength: 2000 },
  link: { type: String, maxlength: 300 },
  status: { type: String, enum: IDEA_STATUSES, default: "Idea" },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Idea", ideaSchema);
