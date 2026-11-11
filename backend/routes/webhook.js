import express from "express";
import stripe from "../config/stripe.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { orderFromSession, nextOrderNumber } from "../lib/orders.js";
import { sendReceipt } from "../lib/invoice.js";

const router = express.Router();

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(503).send("Checkout is off");
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // Avoid duplicate orders
      const existing = await Order.findOne({ stripeSessionId: session.id });
      if (existing) return res.sendStatus(200);

      // Get full session with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });

      // Read everything from the session we just fetched (it uses the site's pinned Stripe version),
      // and link the order to whoever was signed in when checkout started
      const order = new Order({ ...orderFromSession(fullSession), number: await nextOrderNumber() });
      if (!order.shippingAddress?.line1) console.error(`Order ${session.id} has no shipping address; check it in Stripe`);
      await order.save();
      // Receipt to the customer (copy to the shop); a mail problem never loses the order
      sendReceipt(order).catch(err => console.error(`Receipt email failed for ${session.id}:`, err.message));
      const user = order.userId ? await User.findById(order.userId) : null;

      if (user) {
        user.cart = [];
        await user.save();
      }

      console.log(`Order saved for session ${session.id}`);
    } catch (err) {
      console.error("Error saving order:", err);
      return res.status(500).send("Error processing order");
    }
  }

  res.sendStatus(200);
});

export default router;
