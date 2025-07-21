import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});

adminSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model("Admin", adminSchema);