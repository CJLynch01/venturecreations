// routes/adminRoutes.js
import express from "express";
import Product from "../models/product.js";
import { ensureAdmin } from "../middleware/auth.js";
import ContactMessage from "../models/ContactMessage.js";
import Idea, { IDEA_STATUSES } from "../models/Idea.js";
import Order from "../models/Order.js";
import Setting from "../models/Setting.js";
import { dashboardData, splitItem, ORDER_STEPS } from "../lib/dashboard.js";

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

// Move an order along: paid -> printed -> shipped (customers see this on their orders page)
router.post("/orders/:id/status", ensureAdmin, async (req, res) => {
  try {
    if (ORDER_STEPS.includes(req.body.status)) await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.redirect(req.body.back === "orders" ? "/admin/orders" : "/admin#queue");
  } catch (err) {
    console.error("Order status error:", err);
    res.status(500).send("Couldn't update the order.");
  }
});

// Every order, newest first, optionally one status
router.get("/orders", ensureAdmin, async (req, res) => {
  try {
    const status = ORDER_STEPS.includes(req.query.status) ? req.query.status : "";
    const orders = await Order.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(300).lean();
    res.render("admin/orders", { title: "Orders", status, steps: ORDER_STEPS,
      orders: orders.map(o => ({ ...o, status: o.status || "paid", lines: (o.items || []).map(it => ({ ...it, ...splitItem(it.name) })) })) });
  } catch (err) {
    console.error("Orders page error:", err);
    res.status(500).send("Failed to load orders.");
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
    res.render("admin/messages", { title: "Messages", messages });
    await ContactMessage.updateMany({ read: false }, { read: true });
  } catch (err) {
    console.error("Error loading messages:", err);
    res.status(500).send("Failed to load messages.");
  }
});

// Full Product List
router.get("/products", ensureAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 });
    res.render("admin/allProducts", { products });
  } catch (err) {
    console.error("Error loading all products:", err);
    res.status(500).send("Failed to load product list.");
  }
});

// Show Add Product Form
router.get("/products/new", ensureAdmin, (req, res) => {
  res.render("admin/newProduct");
});

// Handle Add Product Form
router.post("/products/new", ensureAdmin, async (req, res) => {
  try {
    const { name, price, sizes, colors, category, seasonalCategory, tags, description } = req.body;
    let { images } = req.body;

    // Ensure 'images' is an array
    if (!Array.isArray(images)) {
      images = [images];
    }

    const cleanImages = images.filter((url) => url.trim() !== "");

    const newProduct = new Product({
      name,
      price: parseFloat(price),
      sizes: sizes.split(",").map((s) => s.trim()),
      colors: colors.split(",").map((c) => c.trim()),
      category,
      images: cleanImages,
      seasonalCategory: seasonalCategory || 'None',
      tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()) : [],
      description: (description || '').trim().slice(0, 5000)
    });

    await newProduct.save();
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Failed to add product.");
  }
});

// Show Edit Product Form
router.get("/products/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.render("admin/editProduct", { product });
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Failed to load product.");
  }
});

// Handle Edit Product Form Submission
router.post("/products/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { name, price, sizes, colors, category, seasonalCategory, tags, action, description } = req.body;
    let { images, deleteImages } = req.body;

    // Normalize input
    if (!Array.isArray(images)) images = images ? [images] : [];
    if (!Array.isArray(deleteImages)) deleteImages = deleteImages ? [deleteImages] : [];

    // Filter out any images marked for deletion
    const cleanImages = images
      .filter(url => url.trim() !== "")
      .filter(url => !deleteImages.includes(url));

    // Update the product
    await Product.findByIdAndUpdate(req.params.id, {
      name,
      price: parseFloat(price),
      sizes: sizes.split(",").map((s) => s.trim()),
      colors: colors.split(",").map((c) => c.trim()),
      category,
      images: cleanImages,
      seasonalCategory: seasonalCategory || 'None',
      tags: tags ? tags.split(',').map((t) => t.trim().toLowerCase()) : [],
      description: (description || '').trim().slice(0, 5000)
    });

    if (action === 'deleteImages') {
      // Stay on the same edit page
      return res.redirect(`/admin/products/edit/${req.params.id}`);
    } else {
      // Normal update flow
      return res.redirect("/admin");
    }
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).send("Failed to update product.");
  }
});

// Handle Delete Product
router.post("/products/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Failed to delete product.");
  }
});

// Delete a specific image from a product
router.post("/products/:id/images/delete", ensureAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).send("Product not found");

    product.images = product.images.filter(img => img !== imageUrl);
    await product.save();

    res.redirect(`/admin/products/edit/${req.params.id}`);
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).send("Failed to delete image.");
  }
});


export default router;