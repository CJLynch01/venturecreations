import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  stripeSessionId: { type: String, required: true, unique: true },
  items: [
    {
      name: String,
      quantity: Number,
      price: Number,
      size: String,
      color: String,
    }
  ],
  total: Number,
  shippingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal_code: String,
    country: String,
  },
  status: { type: String, default: "paid" },   // paid -> printed -> shipped
  printedAt: Date,
  shippedAt: Date,
  carrier: String,          // usps, ups or fedex (lib/tracking.js)
  trackingNumber: String,
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
