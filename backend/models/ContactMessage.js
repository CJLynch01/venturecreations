import mongoose from "mongoose";

// Messages from the contact form, listed for her at /admin/messages
const contactMessageSchema = new mongoose.Schema({
  name: { type: String, maxlength: 120 },
  email: { type: String, maxlength: 200 },
  subject: { type: String, maxlength: 200 },
  message: { type: String, maxlength: 5000 },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("ContactMessage", contactMessageSchema);
