// Cart for everyone: signed-in customers keep it on their account, guests keep it in their session.
// Prices are always looked up here from the database, never taken from the browser.
import crypto from "crypto";
import User from "../models/User.js";
import Product from "../models/product.js";
import { bulkDiscount, nextTier, FREE_SHIPPING_OVER, SHIPPING_FLAT, TAX_ESTIMATE } from "../config/shop.js";

const MAX_QTY = 500;
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

async function load(req) {
  if (req.user) {
    const user = await User.findById(req.user._id);
    return { user, items: user ? user.cart : [] };
  }
  req.session.cart = req.session.cart || [];
  return { user: null, items: req.session.cart };
}

async function save(req, ctx) {
  if (ctx.user) await ctx.user.save();
  else req.session.cart = ctx.items;
}

// Custom details for the mission shirt: name, state or country, and the four things they chose or wrote in
export function cleanCustom(body) {
  const mission = clean(body.mission, 40);
  if (!mission) return null;
  const raw = Array.isArray(body.things) ? body.things : Object.values(body.things || {});
  const things = raw.map(t => clean(t, 30)).filter(Boolean).slice(0, 4);
  return { mission, place: clean(body.place, 40), things };
}

const plainCustom = c => (c && c.mission ? { mission: c.mission, place: c.place || "", things: [...(c.things || [])] } : null);
const sameCustom = (a, b) => JSON.stringify(plainCustom(a)) === JSON.stringify(plainCustom(b));

export async function addItem(req, { productId, size, color, quantity = 1, custom = null }) {
  const product = await Product.findById(productId);
  if (!product) throw Object.assign(new Error("That shirt isn't available."), { status: 404 });
  size = clean(size, 8); color = clean(color, 40);
  if (product.sizes?.length && !product.sizes.includes(size)) throw Object.assign(new Error("Choose a size."), { status: 400 });
  if (product.colors?.length && !product.colors.includes(color)) throw Object.assign(new Error("Choose a color."), { status: 400 });
  quantity = Math.max(1, Math.min(MAX_QTY, parseInt(quantity) || 1));

  const ctx = await load(req);
  const line = ctx.items.find(i => String(i.productId) === String(product._id) && i.size === size && i.color === color && sameCustom(i.custom, custom));
  if (line) line.quantity = Math.min(MAX_QTY, line.quantity + quantity);
  else ctx.items.push({ ...(ctx.user ? {} : { _id: crypto.randomUUID() }), productId: product._id, quantity, size, color, custom: custom || undefined });
  await save(req, ctx);
  return product;
}

export async function updateItem(req, lineId, action) {
  const ctx = await load(req);
  const i = ctx.items.findIndex(x => String(x._id) === String(lineId));
  if (i < 0) return;
  if (action === "remove") ctx.items.splice(i, 1);
  else if (action === "increase") ctx.items[i].quantity = Math.min(MAX_QTY, ctx.items[i].quantity + 1);
  else if (action === "decrease") ctx.items[i].quantity = Math.max(1, ctx.items[i].quantity - 1);
  await save(req, ctx);
}

export async function clearCart(req) {
  const ctx = await load(req);
  ctx.items.splice(0, ctx.items.length);
  await save(req, ctx);
}

// Full cart with products and prices, ready for the page and for checkout
export async function getCart(req) {
  const ctx = await load(req);
  const ids = ctx.items.map(i => i.productId);
  const products = await Product.find({ _id: { $in: ids } });
  const byId = Object.fromEntries(products.map(p => [String(p._id), p]));
  const lines = ctx.items.filter(i => byId[String(i.productId)]).map(i => {
    const p = byId[String(i.productId)];
    const custom = plainCustom(i.custom);
    const each = p.price;
    return { id: String(i._id), product: p, quantity: i.quantity, size: i.size, color: i.color, custom, each, total: each * i.quantity };
  });
  const count = lines.reduce((a, l) => a + l.quantity, 0);
  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  const off = bulkDiscount(count);
  const discount = Math.round(subtotal * off * 100) / 100;
  const afterDiscount = subtotal - discount;
  const shipping = count === 0 || afterDiscount >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  const tax = afterDiscount * TAX_ESTIMATE;
  const next = nextTier(count);
  return {
    lines, count, subtotal, off, discount, afterDiscount, shipping, tax,
    total: afterDiscount + shipping + tax,
    toFreeShipping: Math.max(0, FREE_SHIPPING_OVER - afterDiscount),
    nextTier: next ? { need: next.min - count, off: next.off } : null,
  };
}

// Just the number of shirts, for the header badge on every page
export async function cartCount(req) {
  const ctx = await load(req);
  return ctx.items.reduce((a, i) => a + (i.quantity || 0), 0);
}

// After a guest signs in, move their session cart onto their account
export async function mergeGuestCart(req) {
  if (!req.user || !req.session.cart?.length) return;
  const user = await User.findById(req.user._id);
  if (!user) return;
  for (const i of req.session.cart) {
    const line = user.cart.find(x => String(x.productId) === String(i.productId) && x.size === i.size && x.color === i.color && sameCustom(x.custom, i.custom));
    if (line) line.quantity += i.quantity;
    else user.cart.push({ productId: i.productId, quantity: i.quantity, size: i.size, color: i.color, custom: i.custom });
  }
  await user.save();
  req.session.cart = [];
}
