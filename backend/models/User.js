import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["Admin", "Client"], default: "Client" },
});

export default mongoose.model("User", userSchema);
