import express from 'express';
import stripe from '../config/stripe.js';
import { getCart } from '../lib/cart.js';
import { missionStyleOf } from '../config/shop.js';

const router = express.Router();

// What she needs to print, written into the Stripe line item so it shows on the order
function lineName(l) {
  const bits = [l.size, l.color].filter(Boolean);
  if (l.custom) {
    bits.push(`"${l.custom.mission}"`);
    if (l.custom.place) bits.push(`${missionStyleOf(l.product)?.things === false ? 'flag' : 'center'}: ${l.custom.place}`);
    if (l.custom.things.length) bits.push(`things: ${l.custom.things.join(', ')}`);
  }
  return `${l.product.name}${bits.length ? ' — ' + bits.join(' · ') : ''}`.slice(0, 250);
}

// The cart is read on the server, so prices, sizes and custom text can't be changed by the browser
router.post('/create-checkout-session', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Checkout is turned off on the test site.' });
  try {
    const cart = await getCart(req);
    if (!cart.lines.length) return res.status(400).json({ error: 'Your cart is empty.' });

    const base = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    // Stripe needs a full https address for the photo; photos stored in the site itself start with "/"
    const photo = src => !src ? null : src.startsWith('/') ? (base.startsWith('https://') ? base + src : null) : src;
    const lineItems = cart.lines.map(l => ({
      price_data: {
        currency: 'usd',
        product_data: { name: lineName(l), ...(photo(l.product.images?.[0]) ? { images: [photo(l.product.images[0])] } : {}) },
        // Group discount is taken off each shirt so Stripe's total matches the cart
        unit_amount: Math.round(l.each * (1 - cart.off) * 100),
      },
      quantity: l.quantity,
    }));
    const subtotalCents = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);

    const standardRate = process.env.STANDARD_SHIPPING_RATE;
    const freeRate = process.env.STRIPE_SHIPPING_FREE || process.env.FREE_SHIPPING_RATE;
    const shippingOptions = [];
    if (subtotalCents >= 10000 && freeRate) shippingOptions.push({ shipping_rate: freeRate });
    if (standardRate) shippingOptions.push({ shipping_rate: standardRate });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['US'] },
      ...(shippingOptions.length ? { shipping_options: shippingOptions } : {}),
      automatic_tax: { enabled: true },
      ...(req.user?.email ? { customer_email: req.user.email } : {}),
      success_url: `${base}/success`,
      cancel_url: `${base}/cart`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Checkout could not start. Please try again.' });
  }
});

export default router;
