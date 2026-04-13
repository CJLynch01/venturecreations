import dotenv from 'dotenv';
import express from 'express';
import stripe from '../config/stripe.js';
import Product from '../models/product.js';
import User from '../models/User.js';

dotenv.config();

const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    console.error("Expected 'items' to be an array, but got:", items);
    return res.status(400).json({ error: "Invalid items format" });
  }

  try {
    // Look up real prices from the database — never trust client-sent prices
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    const lineItems = items.map(item => {
      const product = productMap[item.productId];
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      return {
        price_data: {
          currency: 'usd',
          product_data: { name: product.name },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const serverSubtotal = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);

    // Set up shipping options
    const shippingOptions = [
      {
        shipping_rate: process.env.STANDARD_SHIPPING_RATE,
      },
    ];

    // Add free shipping option if subtotal >= $100 (i.e., 10000 cents)
    if (serverSubtotal >= 10000) {
      shippingOptions.unshift({
        shipping_rate: process.env.STRIPE_SHIPPING_FREE,
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: shippingOptions,
      automatic_tax: { enabled: true },
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    // Return Stripe checkout URL to frontend
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).send('Failed to create session');
  }
});

export default router;