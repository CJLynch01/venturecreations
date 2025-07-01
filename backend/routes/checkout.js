import express from 'express';
import stripe from '../config/stripe.js';
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: req.body.items.map(item => ({
            price_data: {
            currency: 'usd',
            product_data: {
                name: item.name,
            },
            unit_amount: item.price * 100,
            tax_behavior: 'exclusive',
            },
            quantity: item.quantity,
        })),
        automatic_tax: { enabled: true },
        shipping_address_collection: {
            allowed_countries: ['US'],
        },
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