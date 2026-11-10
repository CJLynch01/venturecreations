import mongoose from "mongoose";

// Small saved settings for the admin, e.g. which setup steps she has marked done
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Setting", settingSchema);
