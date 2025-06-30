import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["Admin", "Customer"], default: "Customer" },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number
    }
  ]
});

const User = mongoose.model("User", userSchema);
export default User;