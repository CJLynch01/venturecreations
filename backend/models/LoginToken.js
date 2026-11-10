import mongoose from "mongoose";

// One-time email sign-in links. Only a hash of the token is stored; links expire after 15 minutes
// and the database deletes old ones on its own.
const loginTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("LoginToken", loginTokenSchema);
