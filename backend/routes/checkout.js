import express from 'express';
import stripe from '../config/stripe.js';

const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  let { items, subtotal } = req.body;

  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      console.error('Error parsing items:', err);
      return res.status(400).json({ error: 'Invalid items format' });
    }
  }

  // Debug logs for development
  console.log('Received checkout request:');
  console.log('Type of items:', typeof items);
  console.log('Items:', items);
  console.log('Subtotal:', subtotal);

  // Handle potential stringified items array
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      console.error('Error parsing items JSON:', err);
      return res.status(400).json({ error: 'Invalid items format' });
    }
  }

  // Final validation
  if (!Array.isArray(items)) {
    console.error("Expected 'items' to be an array, but got:", items);
    return res.status(400).json({ error: "Invalid items format" });
  }

  try {
    // Define default shipping options
    const shippingOptions = [
      {
        shipping_rate: process.env.STRIPE_SHIPPING_STANDARD,
      },
    ];

    // Add free shipping if subtotal >= $100 (in cents)
    if (subtotal >= 10000) {
      shippingOptions.unshift({
        shipping_rate: process.env.STRIPE_SHIPPING_FREE,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: shippingOptions,
      automatic_tax: { enabled: true },
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).send('Failed to create session');
  }
});

export default router;