import express from 'express';
import stripe from '../config/stripe.js';
const router = express.Router();

const FREE_SHIPPING_RATE_ID = process.env.FREE_SHIPPING_RATE_ID;
const STANDARD_SHIPPING_RATE_ID = process.env.STANDARD_SHIPPING_RATE_ID;

router.post('/create-checkout-session', async (req, res) => {
  try {
    const items = req.body.items;

    const subtotal = items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    const shippingRateId = subtotal >= 100 ? FREE_SHIPPING_RATE_ID : STANDARD_SHIPPING_RATE_ID;

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
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: [
        { shipping_rate: shippingRateId }
      ],
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