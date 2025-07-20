import dotenv from 'dotenv';
import express from 'express';
import stripe from '../config/stripe.js';


dotenv.config();

const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  const { items, subtotal } = req.body;

  if (!Array.isArray(items)) {
    console.error("Expected 'items' to be an array, but got:", items);
    return res.status(400).json({ error: "Invalid items format" });
  }

  console.log("Received checkout request:");
  console.log("Items:", items);
  console.log("Subtotal:", subtotal);

  try {
    // Set up shipping options
    const shippingOptions = [
      {
        shipping_rate: process.env.STANDARD_SHIPPING_RATE,
      },
    ];

    // Add free shipping option if subtotal >= $100 (i.e., 10000 cents)
    if (subtotal >= 10000) {
      shippingOptions.unshift({
        shipping_rate: process.env.STRIPE_SHIPPING_FREE,
      });
    }

    console.log("Using shipping options:", shippingOptions);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), // convert dollars to cents
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

    // Return Stripe checkout URL to frontend
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).send('Failed to create session');
  }
});

export default router;