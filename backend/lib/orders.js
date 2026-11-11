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
    email: session.customer_details?.email || session.customer_email || undefined,
    subtotal: (session.amount_subtotal ?? session.amount_total) / 100,
    discount: (session.total_details?.amount_discount || 0) / 100,
    shipping: (session.total_details?.amount_shipping ?? session.shipping_cost?.amount_total ?? 0) / 100,
    tax: (session.total_details?.amount_tax || 0) / 100,
    shippingAddress: shippingOf(session),
  };
}

// Next order number: VC-1001, VC-1002... (one counter, safe when two orders arrive together)
export async function nextOrderNumber() {
  const { default: Setting } = await import("../models/Setting.js");
  const s = await Setting.findOneAndUpdate({ key: "orders.lastNumber" }, { $inc: { value: 1 }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true });
  if (s.value < 1001) { s.value += 1000; await Setting.updateOne({ _id: s._id }, { value: s.value }); }
  return s.value;
}
export const orderLabel = o => (o.number ? `VC-${o.number}` : `#${String(o._id).slice(-6).toUpperCase()}`);
