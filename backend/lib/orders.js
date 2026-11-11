// Turns a paid Stripe Checkout session into what we save as an order.
// Kept separate from the webhook so it can be tested without Stripe.
import mongoose from "mongoose";

// Stripe moved the shipping details in newer API versions; read whichever one is there
export function shippingOf(session) {
  const s = session.shipping_details || session.collected_information?.shipping_details || null;
  const a = s?.address || {};
  return {
    name: s?.name || session.customer_details?.name,
    line1: a.line1, line2: a.line2, city: a.city, state: a.state, postal_code: a.postal_code, country: a.country,
  };
}

// The signed-in customer, passed to Stripe when checkout started (never the email typed at Stripe)
export const customerIdOf = session =>
  mongoose.isValidObjectId(session.client_reference_id) ? session.client_reference_id : null;

export function orderFromSession(session) {
  return {
    userId: customerIdOf(session) || undefined,
    stripeSessionId: session.id,
    items: (session.line_items?.data || []).map(item => ({ name: item.description, quantity: item.quantity, price: item.amount_total / 100 })),
    total: session.amount_total / 100,
    shippingAddress: shippingOf(session),
  };
}
