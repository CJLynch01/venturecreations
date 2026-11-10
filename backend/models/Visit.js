import mongoose from "mongoose";

// One page view or shop event, for the admin Analytics page.
// No cookies and no IP addresses: "visitor" is a one-way hash that changes every day,
// so it counts unique visitors per day without following anyone around.
const visitSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  day: String,                                  // yyyy-mm-dd in Utah time
  kind: { type: String, enum: ["page", "cart", "checkout"], default: "page" },
  path: String,
  ref: String,                                  // where they came from: Google, Pinterest, Etsy, Direct...
  device: String,                               // Phone, Tablet or Computer
  visitor: String,
  q: String,                                    // what they searched for, on search pages
});
visitSchema.index({ day: 1, kind: 1 });
visitSchema.index({ at: 1 }, { expireAfterSeconds: 400 * 864e2 });   // keep about 13 months

export default mongoose.model("Visit", visitSchema);
