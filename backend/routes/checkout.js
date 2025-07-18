import express from 'express';
import stripe from '../config/stripe.js';
const router = express.Router();

const STANDARD_SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_STANDARD;
const FREE_SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_FREE;

router.post('/create-checkout-session', async (req, res) => {
  try {
    const items = JSON.parse(req.body.items); // from hidden input in EJS
    const subtotal = parseFloat(req.body.subtotal); // also from EJS

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
          tax_behavior: 'exclusive',
        },
        quantity: item.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: [
        {
          shipping_rate: subtotal >= 100
            ? process.env.STRIPE_SHIPPING_FREE
            : process.env.STRIPE_SHIPPING_STANDARD,
        },
      ],
      automatic_tax: { enabled: true },
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to create session');
  }
});

export default router;