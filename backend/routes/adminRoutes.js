// routes/adminRoutes.js
import express from "express";
import Product from "../models/product.js";
import { ensureAdmin } from "../middleware/auth.js";
import ContactMessage from "../models/ContactMessage.js";
import Idea, { IDEA_STATUSES } from "../models/Idea.js";
import Order from "../models/Order.js";
import Setting from "../models/Setting.js";
import { dashboardData, splitItem, ORDER_STEPS } from "../lib/dashboard.js";
import { orderLabel, nextOrderNumber } from "../lib/orders.js";
import crypto from "crypto";
import { sendReceipt } from "../lib/invoice.js";
import { photoUpload, savePhotos, uploadsEnabled } from "../lib/uploads.js";
import { analyticsData } from "../lib/analytics.js";
import Visit from "../models/Visit.js";
import { withSlugs, productPath } from "../lib/seo.js";
import { CARRIERS, cleanTracking, guessCarrier } from "../lib/tracking.js";

const router = express.Router();

// Admin dashboard: orders to print and ship, sales, messages, ideas, setup steps
router.get("/", ensureAdmin, async (req, res) => {
  try {
    res.render("admin/admin", { title: "Dashboard", d: await dashboardData(), page: "admin" });
  } catch (error) {
    console.error("Admin page error:", error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// Where to land after changing an order: its invoice, the orders list, or the dashboard queue
const backTo = req => req.body.back === "invoice" ? `/invoice/${req.params.id}` : req.body.back === "orders" ? "/admin/orders" : "/admin#queue";

// ---- Invoices made by hand (Etsy, in person, Venmo, group orders) ----
const peekNextNumber = async () => Math.max(1001, ((await Setting.findOne({ key: "orders.lastNumber" }).lean())?.value || 1000) + 1);
const newInvoiceForm = async (res, v = {}, error = "") => res.status(error ? 400 : 200).render("admin/newInvoice", {
  title: "New invoice", v, error, nextNumber: await peekNextNumber(),
  products: await Product.find({}, { name: 1, price: 1 }).sort({ name: 1 }).lean() });

router.get("/invoices/new", ensureAdmin, async (req, res) => {
  try { await newInvoiceForm(res); } catch (err) { console.error("New invoice form error:", err); res.status(500).send("Couldn't load the form."); }
});

const cents = v => Math.max(0, Math.round((parseFloat(v) || 0) * 100));
const asList = v => (Array.isArray(v) ? v : v == null ? [] : [v]).map(x => String(x));
const clip = (v, n) => String(v || "").trim().slice(0, n);

router.post("/invoices", ensureAdmin, async (req, res) => {
  const b = req.body;
  const items = asList(b.item), details = asList(b.details), qtys = asList(b.qty), eaches = asList(b.each);
  const lines = items.map((item, i) => ({ item: clip(item, 120), details: clip(details[i], 160), qty: Math.min(999, Math.max(0, parseInt(qtys[i]) || 0)), each: eaches[i] }))
    .filter(l => l.item);
  const v = { ...b, lines, send: b.send === "1" };
  try {
    if (!clip(b.name, 80)) return newInvoiceForm(res, v, "Add the customer's name.");
    if (!lines.length || lines.some(l => !l.qty)) return newInvoiceForm(res, v, "Add at least one shirt with a quantity.");
    const email = clip(b.email, 120).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return newInvoiceForm(res, v, "That email doesn't look right.");

    const subtotal = lines.reduce((a, l) => a + l.qty * cents(l.each), 0);
    const discount = Math.min(subtotal, cents(b.discount)), shipping = cents(b.shipping), tax = cents(b.tax);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") ? new Date(`${b.date}T12:00:00-07:00`) : new Date();
    const status = ORDER_STEPS.includes(b.status) ? b.status : "paid";
    const payment = clip(b.payment, 30);

    const order = await Order.create({
      source: "manual", stripeSessionId: `manual-${crypto.randomUUID()}`, number: await nextOrderNumber(),
      items: lines.map(l => ({ name: l.details ? `${l.item} — ${l.details}` : l.item, quantity: l.qty, price: (l.qty * cents(l.each)) / 100 })),
      subtotal: subtotal / 100, discount: discount / 100, shipping: shipping / 100, tax: tax / 100,
      total: (subtotal - discount + shipping + tax) / 100,
      email: email || undefined, paid: Boolean(payment), paymentMethod: payment || undefined, notes: clip(b.notes, 500) || undefined,
      shippingAddress: { name: clip(b.name, 80), line1: clip(b.line1, 120), city: clip(b.city, 60), state: clip(b.state, 20), postal_code: clip(b.postal_code, 12), country: "US" },
      status, createdAt: day, ...(status !== "paid" ? { printedAt: day } : {}), ...(status === "shipped" ? { shippedAt: day } : {}),
    });
    let sent = "";
    if (v.send && email) {
      try { await sendReceipt(order, { again: true }); sent = "1"; }
      catch (err) { console.error("Invoice email failed:", err.message); sent = "fail"; }
    }
    res.redirect(`/invoice/${order._id}${sent ? "?sent=" + sent : ""}`);
  } catch (err) {
    console.error("Create invoice error:", err);
    res.status(500).send("Couldn't create the invoice.");
  }
});

// A by-hand invoice got paid
router.post("/orders/:id/paid", ensureAdmin, async (req, res) => {
  try {
    await Order.updateOne({ _id: req.params.id, source: "manual" }, { paid: true, paymentMethod: clip(req.body.payment, 30) || "Other" });
    res.redirect(`/invoice/${req.params.id}`);
  } catch (err) {
    console.error("Mark paid error:", err);
    res.status(500).send("Couldn't update the invoice.");
  }
});

// Send the order-received email again (e.g. the customer can't find it)
router.post("/orders/:id/receipt", ensureAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send("Order not found");
    await sendReceipt(order, { again: true });
    res.redirect(`/invoice/${order._id}?sent=1`);
  } catch (err) {
    console.error("Resend receipt error:", err);
    res.status(500).send("Couldn't send the receipt: " + err.message);
  }
});

// Tracking number and carrier from the order form (carrier guessed from the number if not picked)
function trackingFromForm(b) {
  const trackingNumber = cleanTracking(b.trackingNumber);
  if (!trackingNumber) return { trackingNumber: "", carrier: "" };
  return { trackingNumber, carrier: CARRIERS[b.carrier] ? b.carrier : guessCarrier(trackingNumber) };
}

// Move an order along: paid -> printed -> shipped (customers see this on their orders page)
router.post("/orders/:id/status", ensureAdmin, async (req, res) => {
  try {
    const status = req.body.status;
    if (ORDER_STEPS.includes(status)) {
      const update = { status, [`${status}At`]: new Date() };
      if (status === "shipped") Object.assign(update, trackingFromForm(req.body));
      await Order.findByIdAndUpdate(req.params.id, update);
    }
    res.redirect(backTo(req));
  } catch (err) {
    console.error("Order status error:", err);
    res.status(500).send("Couldn't update the order.");
  }
});

// Add or fix the tracking number on an order that already shipped
router.post("/orders/:id/tracking", ensureAdmin, async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, trackingFromForm(req.body));
    res.redirect(backTo(req));
  } catch (err) {
    console.error("Tracking update error:", err);
    res.status(500).send("Couldn't save the tracking number.");
  }
});

// Every order, newest first, optionally one status
// Orders list: one year at a time (newest first), grouped by month, 50 per page, with search
const ORDERS_PER_PAGE = 50;
const yearOf = d => Number(new Date(d).toLocaleDateString("en-US", { year: "numeric", timeZone: "America/Denver" }));
router.get("/orders", ensureAdmin, async (req, res) => {
  try {
    const status = ORDER_STEPS.includes(req.query.status) ? req.query.status : "";
    const q = String(req.query.q || "").trim().slice(0, 60);
    const statusQ = status === "paid" ? { $or: [{ status: "paid" }, { status: { $exists: false } }] } : status ? { status } : {};

    // Years that have orders (newest first); the page shows one year
    const [first, last] = await Promise.all([Order.findOne().sort({ createdAt: 1 }).lean(), Order.findOne().sort({ createdAt: -1 }).lean()]);
    const years = first ? Array.from({ length: yearOf(last.createdAt) - yearOf(first.createdAt) + 1 }, (_, i) => yearOf(last.createdAt) - i) : [];
    const year = years.includes(Number(req.query.year)) ? Number(req.query.year) : years[0];

    // Search covers every order (all years); otherwise the chosen year
    const filter = { ...statusQ };
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const num = Number(q.replace(/^vc-?/i, ""));
      filter.$and = [{ $or: [{ "shippingAddress.name": re }, { "shippingAddress.city": re }, { email: re }, { "items.name": re }, ...(num ? [{ number: num }] : [])] }];
    } else if (year) {
      filter.createdAt = { $gte: new Date(`${year}-01-01T00:00:00-07:00`), $lt: new Date(`${year + 1}-01-01T00:00:00-07:00`) };
    }

    const total = await Order.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
    const page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * ORDERS_PER_PAGE).limit(ORDERS_PER_PAGE).lean();

    // Month totals for the whole year (not just this page), for the month headings
    const monthTotals = {};
    if (!q && year) {
      const all = await Order.find(filter, { createdAt: 1, total: 1 }).lean();
      for (const o of all) {
        const m = new Date(o.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "America/Denver" });
        const t = monthTotals[m] || (monthTotals[m] = { orders: 0, sales: 0 });
        t.orders += 1; t.sales += o.total || 0;
      }
    }

    const qs = extra => "?" + new URLSearchParams(Object.entries({ status, year: q ? "" : year || "", q, ...extra }).filter(([, v]) => v !== "" && v != null)).toString();
    res.render("admin/orders", { title: "Orders", status, steps: ORDER_STEPS, years, year, q, page, pages, total, monthTotals, qs,
      orders: orders.map(o => ({ ...o, label: orderLabel(o), status: o.status || "paid", lines: (o.items || []).map(it => ({ ...it, ...splitItem(it.name) })),
        month: new Date(o.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "America/Denver" }) })) });
  } catch (err) {
    console.error("Orders page error:", err);
    res.status(500).send("Failed to load orders.");
  }
});

// Analytics: visitors, shirts viewed, where people come from, cart and checkout
router.get("/analytics", ensureAdmin, async (req, res) => {
  try {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const names = new Map(withSlugs(await Product.find({}, { name: 1, createdAt: 1 }).lean()).map(p => [productPath(p), p.name]));
    res.render("admin/analytics", { title: "Analytics", a: await analyticsData(days, names), reset: req.query.reset === "1" });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).send("Couldn't load analytics.");
  }
});

// Clear the visit counts and start over (orders and shirts aren't touched)
router.post("/analytics/reset", ensureAdmin, async (req, res) => {
  try {
    if (req.body.confirm === "yes") await Visit.deleteMany({});
    res.redirect("/admin/analytics?reset=1");
  } catch (err) {
    console.error("Analytics reset error:", err);
    res.status(500).send("Couldn't clear analytics.");
  }
});

// Setup steps she does by hand (like Google Search Console) can be checked off
router.post("/setup/:key", ensureAdmin, async (req, res) => {
  try {
    if (/^[a-zA-Z]{1,30}$/.test(req.params.key)) {
      const cur = (await Setting.findOne({ key: "setup.done" }))?.value || {};
      await Setting.findOneAndUpdate({ key: "setup.done" }, { value: { ...cur, [req.params.key]: true }, updatedAt: new Date() }, { upsert: true });
    }
    res.redirect("/admin");
  } catch (err) {
    console.error("Setup step error:", err);
    res.status(500).send("Couldn't save that.");
  }
});

// Ideas list: what could come next for the shop, with a status she can change
const STARTER_IDEAS = [
  { title: "Mission Wall", status: "Planned", link: "https://claude.ai/artifact/M2EqqDzjTF1WzC9sHyXaSM",
    notes: "A searchable wall of every mission shirt she's made, with \"be the first from your mission\" for new ones. Each mission can get its own page so moms find it on Google." },
  { title: "Gift Finder", status: "Planned", link: "https://claude.ai/artifact/1HgKmhk7kP9Ytfd2MnWwCT",
    notes: "Two questions (who it's for, the occasion) pick shirts with a one-line reason each. Doubles as the Christmas gift guide." },
  { title: "Our story: how a shirt is made", link: "https://claude.ai/artifact/3ejbrU8hGhsaWRWSdTmHKY",
    notes: "Designed, printed, pressed, shipped. Shows the family behind the shirts." },
  { title: "Real Etsy reviews on the site", notes: "4.9 stars, 39 orders, 4 years on Etsy. Copy her best reviews over word for word." },
  { title: "Pinterest pins on the home page", notes: "Show the pins she already makes, and link to her Pinterest." },
  { title: "Family homecoming bundle", notes: "Matching mission shirts for the whole family at the airport. Would need youth and baby sizes." },
  { title: "Email list (10% off first order)", notes: "One email when a new design or holiday collection drops." },
  { title: "Grok social queue", notes: "Grok drafts Pinterest/Instagram posts for each shirt; she approves before anything posts." },
  { title: "Print queue and \"made with\" setting", notes: "Each shirt marked DTF, vinyl or Printify; paid orders become a print-and-ship to-do list." },
  { title: "Profit calculator", notes: "Her real costs (blank, transfer, mailer, postage) show what she keeps on each shirt." },
  { title: "Bring over the Etsy-only shirts", notes: "16 designs only on Etsy (Momster, Dadcula, LDS Temple...). Needs the Etsy listings download." },
];

router.get("/ideas", ensureAdmin, async (req, res) => {
  try {
    // First visit: start the list with the ideas we've talked about
    if (await Idea.countDocuments() === 0) await Idea.insertMany(STARTER_IDEAS.map((x, i) => ({ ...x, order: i })));
    const ideas = await Idea.find().sort({ order: 1, createdAt: 1 });
    res.render("admin/ideas", { title: "Ideas", ideas, statuses: IDEA_STATUSES });
  } catch (err) {
    console.error("Error loading ideas:", err);
    res.status(500).send("Failed to load ideas.");
  }
});

const cleanIdea = b => ({
  title: String(b.title || "").trim().slice(0, 120),
  notes: String(b.notes || "").trim().slice(0, 2000),
  link: /^https?:\/\//.test(String(b.link || "").trim()) ? String(b.link).trim().slice(0, 300) : "",
  status: IDEA_STATUSES.includes(b.status) ? b.status : "Idea",
});

router.post("/ideas", ensureAdmin, async (req, res) => {
  try {
    const idea = cleanIdea(req.body);
    if (idea.title) await Idea.create({ ...idea, order: await Idea.countDocuments() });
    res.redirect("/admin/ideas");
  } catch (err) {
    console.error("Error adding idea:", err);
    res.status(500).send("Failed to add idea.");
  }
});

router.post("/ideas/:id", ensureAdmin, async (req, res) => {
  try {
    if (req.body.action === "delete") await Idea.findByIdAndDelete(req.params.id);
    else {
      const idea = cleanIdea(req.body);
      if (idea.title) await Idea.findByIdAndUpdate(req.params.id, idea);
    }
    res.redirect("/admin/ideas");
  } catch (err) {
    console.error("Error updating idea:", err);
    res.status(500).send("Failed to update idea.");
  }
});

// Contact form messages, newest first; opening the page marks them read
router.get("/messages", ensureAdmin, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(200);
    res.render("admin/messages", { title: "Messages", messages, deleted: req.query.deleted === "1" });
    await ContactMessage.updateMany({ read: false }, { read: true });
  } catch (err) {
    console.error("Error loading messages:", err);
    res.status(500).send("Failed to load messages.");
  }
});

// Delete a message (spam, or one she's done with)
router.post("/messages/:id/delete", ensureAdmin, async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    res.redirect("/admin/messages?deleted=1");
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).send("Failed to delete the message.");
  }
});

// Shirts: list, add, edit, remove
const SEASONS = Product.schema.path("seasonalCategory").enumValues;
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "Youth S", "Youth M", "Youth L", "Youth XL"];
const COLOR_OPTIONS = ["Black", "White", "Dark Heather Gray", "Light Heather Gray", "Heather Gray", "Navy", "Navy Blue Heather",
  "Heather Mauve", "Charity Pink", "Red", "Maroon", "Autumn", "Sand", "Olive Green", "Forest Green", "Atlantic Green"];

// Checkbox arrays or comma lists ("S, M, L") both work
const list = v => (Array.isArray(v) ? v : String(v || "").split(","))
  .map(x => String(x).trim()).filter(Boolean)
  .filter((x, i, a) => a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i);

function productFromForm(b) {
  const price = Math.round(parseFloat(b.price) * 100) / 100;
  return {
    name: String(b.name || "").trim().slice(0, 140),
    price: Number.isFinite(price) && price > 0 ? price : NaN,
    sizes: list(b.sizes),
    colors: [...list(b.colors), ...list(b.otherColors)].filter((x, i, a) => a.indexOf(x) === i),
    category: list(b.category).join(", "),
    images: list(b.images).filter(u => /^(https:\/\/|\/)/.test(u)),
    seasonalCategory: SEASONS.includes(b.seasonalCategory) ? b.seasonalCategory : "None",
    tags: list(b.tags).map(t => t.toLowerCase().replace(/^#/, "")),
    description: String(b.description || "").trim().slice(0, 5000),
  };
}
const formProblem = p => !p.name ? "Give the shirt a name."
  : !Number.isFinite(p.price) ? "Add a price."
  : !p.sizes.length ? "Pick at least one size."
  : !p.colors.length ? "Pick at least one color."
  : !p.images.length ? "Add at least one photo." : "";

async function renderProductForm(res, product, error = "") {
  const categories = (await Product.distinct("category")).flatMap(c => list(c)).filter((x, i, a) => a.indexOf(x) === i).sort();
  res.status(error ? 400 : 200).render("admin/productForm", {
    title: product._id ? `Edit ${product.name}` : "Add a shirt", product, error,
    seasons: SEASONS, sizeOptions: SIZE_OPTIONS, colorOptions: COLOR_OPTIONS, categories, uploadsEnabled: uploadsEnabled(),
  });
}

router.get("/products", ensureAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1, _id: -1 }).lean();
    res.render("admin/allProducts", { title: "Shirts", products, saved: req.query.saved || "" });
  } catch (err) {
    console.error("Error loading all products:", err);
    res.status(500).send("Failed to load product list.");
  }
});

router.get("/products/new", ensureAdmin, async (req, res) => {
  try {
    await renderProductForm(res, { sizes: ["S", "M", "L", "XL", "2XL"], colors: [], images: [], tags: [], seasonalCategory: "None" });
  } catch (err) {
    console.error("Error loading add form:", err);
    res.status(500).send("Failed to load the form.");
  }
});

router.post("/products/new", ensureAdmin, async (req, res) => {
  try {
    const p = productFromForm(req.body);
    const problem = formProblem(p);
    if (problem) return renderProductForm(res, { ...p, price: req.body.price }, problem);
    await Product.create(p);
    res.redirect("/admin/products?saved=added");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Failed to add product.");
  }
});

router.get("/products/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).send("Product not found");
    await renderProductForm(res, product);
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Failed to load product.");
  }
});

router.post("/products/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const p = productFromForm(req.body);
    const problem = formProblem(p);
    if (problem) return renderProductForm(res, { ...p, _id: req.params.id, price: req.body.price }, problem);
    await Product.findByIdAndUpdate(req.params.id, p, { runValidators: true });
    res.redirect("/admin/products?saved=updated");
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).send("Failed to update product.");
  }
});

router.post("/products/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin/products?saved=removed");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Failed to delete product.");
  }
});

// Photo upload for the shirt and blog forms; answers with the new photo links
router.post("/uploads", ensureAdmin, (req, res) => {
  photoUpload(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Each photo has to be under 12 MB." : "Couldn't read those photos." });
      if (!req.files?.length) return res.status(400).json({ error: "Pick JPG, PNG or WebP photos." });
      res.json({ urls: await savePhotos(req.files, req.body.folder) });
    } catch (e) {
      console.error("Upload error:", e);
      res.status(500).json({ error: uploadsEnabled() ? "The upload didn't go through. Try again." : "Uploading needs the AWS keys in Render. Paste a photo link for now." });
    }
  });
});

export default router;