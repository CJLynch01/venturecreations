import express from 'express';
import stripe from '../config/stripe.js';
const router = express.Router();

const STANDARD_SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_STANDARD;
const FREE_SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_FREE;

router.post('/create-checkout-session', async (req, res) => {
  try {
    const subtotal = parseFloat(req.body.subtotal);
    const items = JSON.parse(req.body.items);

    const shippingRateId = subtotal >= 100 ? FREE_SHIPPING_RATE_ID : STANDARD_SHIPPING_RATE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
          tax_behavior: 'exclusive',
        },
        quantity: item.quantity,
      })),
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: [{ shipping_rate: shippingRateId }],
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.redirect(303, session.url);
  } catch (err) {
    console.error('Checkout session error:', err);
    res.status(500).send('Checkout session creation failed');
  }
});

export default router;