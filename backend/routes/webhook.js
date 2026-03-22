import express from "express";
import stripe from "../config/stripe.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
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

      const items = fullSession.line_items.data.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        price: item.amount_total / 100,
      }));

      const shipping = session.shipping_details?.address;

      // Find user by email and clear their cart
      const user = await User.findOne({ email: session.customer_details?.email });

      const order = new Order({
        userId: user?._id,
        stripeSessionId: session.id,
        items,
        total: session.amount_total / 100,
        shippingAddress: {
          name: session.shipping_details?.name,
          line1: shipping?.line1,
          line2: shipping?.line2,
          city: shipping?.city,
          state: shipping?.state,
          postal_code: shipping?.postal_code,
          country: shipping?.country,
        },
      });

      await order.save();

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
