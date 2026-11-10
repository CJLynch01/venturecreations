// routes/cartRoutes.js
// Works for guests and signed-in customers. Forms post normally; the slide-in cart sends
// "Accept: application/json" and gets the updated cart back instead of a redirect.
import express from "express";
import Product from "../models/product.js";
import { addItem, updateItem, getCart, cleanCustom } from "../lib/cart.js";
import { isPersonalized, missionStyleOf } from "../config/shop.js";

const router = express.Router();
const wantsJson = req => (req.get("accept") || "").includes("application/json");

function cartJson(c) {
  return {
    count: c.count, subtotal: c.subtotal, discount: c.discount, off: c.off, afterDiscount: c.afterDiscount,
    shipping: c.shipping, toFreeShipping: c.toFreeShipping, nextTier: c.nextTier,
    lines: c.lines.map(l => ({
      id: l.id, name: l.product.name, image: l.product.images?.[0] || "", size: l.size, color: l.color,
      custom: l.custom, quantity: l.quantity, each: l.each, total: l.total, productId: String(l.product._id),
    })),
  };
}

async function reply(req, res, message) {
  if (wantsJson(req)) return res.json({ ok: true, message, cart: cartJson(await getCart(req)) });
  res.redirect("/cart");
}
function fail(req, res, err) {
  const status = err.status || 500;
  if (status === 500) console.error("Cart error:", err);
  const message = status === 500 ? "Something went wrong. Please try again." : err.message;
  if (wantsJson(req)) return res.status(status).json({ ok: false, message });
  res.status(status).send(message);
}

// View cart
router.get("/", async (req, res) => {
  try {
    const cart = await getCart(req);
    if (wantsJson(req)) return res.json(cartJson(cart));
    res.render("shop/cart", { title: "Your cart", cartData: cart, page: "cart" });
  } catch (err) { fail(req, res, err); }
});

// Add a shirt
router.post("/add", async (req, res) => {
  try {
    const { productId, size, color, quantity } = req.body;
    // Personalized shirts carry the customer's text (stored like a mission name)
    const product = await Product.findById(productId).catch(() => null);
    let custom = null;
    if (product && isPersonalized(product)) {
      custom = cleanCustom({ mission: req.body.personal });
      if (!custom) throw Object.assign(new Error("Type what you'd like on your shirt."), { status: 400 });
    }
    const p = await addItem(req, { productId, size, color, quantity, custom });
    await reply(req, res, `Added ${p.name}`);
  } catch (err) { fail(req, res, err); }
});

// Add a custom mission shirt from the builder
router.post("/custom", async (req, res) => {
  try {
    const product = await Product.findById(req.body.productId).catch(() => null);
    const style = missionStyleOf(product);
    if (!style) throw Object.assign(new Error("Custom mission shirts aren't available right now."), { status: 404 });
    const custom = cleanCustom(style.things ? req.body : { mission: req.body.mission, place: req.body.place });
    if (!custom) throw Object.assign(new Error("Type the mission name first."), { status: 400 });
    if (!custom.place) throw Object.assign(new Error(style.things ? "Type the state or country." : "Type the country for the flag."), { status: 400 });
    await addItem(req, { productId: product._id, size: req.body.size, color: req.body.color, quantity: req.body.quantity, custom });
    await reply(req, res, `Added your ${custom.mission} shirt`);
  } catch (err) { fail(req, res, err); }
});

// Add a group order: one design, one color, many sizes at once
router.post("/group", async (req, res) => {
  try {
    const sizes = req.body.sizes && typeof req.body.sizes === "object" ? req.body.sizes : {};
    const productId = req.body.productId;
    const style = missionStyleOf(await Product.findById(productId).catch(() => null));
    const custom = style ? cleanCustom(style.things ? req.body : { mission: req.body.mission, place: req.body.place }) : null;
    if (style && !custom) throw Object.assign(new Error("Type the mission name first."), { status: 400 });
    let added = 0;
    for (const [size, q] of Object.entries(sizes)) {
      const quantity = parseInt(q) || 0;
      if (quantity > 0) { await addItem(req, { productId, size, color: req.body.color, quantity, custom }); added += quantity; }
    }
    if (!added) throw Object.assign(new Error("Enter how many shirts you need in each size."), { status: 400 });
    await reply(req, res, `Added ${added} shirts`);
  } catch (err) { fail(req, res, err); }
});

// Change quantity or remove a line
router.post("/update", async (req, res) => {
  try {
    await updateItem(req, req.body.lineId, req.body.action);
    await reply(req, res);
  } catch (err) { fail(req, res, err); }
});
router.post("/remove", async (req, res) => {
  try {
    await updateItem(req, req.body.lineId, "remove");
    await reply(req, res);
  } catch (err) { fail(req, res, err); }
});

export default router;
