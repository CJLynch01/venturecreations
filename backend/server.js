// Environment setup
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// Core modules
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from "./config/passport.js";
import MongoStore from "connect-mongo";

// Models
import Product from "./models/product.js";

// Shop settings and cart
import * as SHOP from "./config/shop.js";
import { cartCount, clearCart } from "./lib/cart.js";

// Routes
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import checkoutRoutes from "./routes/checkout.js";
import blogRoutes from "./routes/blog.js";
import contactFormRoutes from "./routes/contactForm.js";
import webhookRoutes from "./routes/webhook.js";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;
// The test site shows a banner and has checkout turned off
const TEST_SITE = process.env.TEST_SITE === "1";

// Rate limiters
const cartLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const searchLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

// Webhook must be registered before express.json() parses the body
app.use("/webhook", webhookRoutes);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend/public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 14,   // two weeks, so a guest's cart is still there when they come back
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Everything every page needs: who's signed in, the cart badge, shop settings
app.use(async (req, res, next) => {
  res.locals.user = req.user;
  res.locals.shop = SHOP;
  res.locals.testSite = TEST_SITE;
  res.locals.path = req.path;
  try { res.locals.cartCount = await cartCount(req); } catch (err) { console.error("Cart count failed:", err); res.locals.cartCount = 0; }
  res.locals.cart = [];   // old admin templates read this
  next();
});

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Routes
app.use("/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/admin", adminRoutes);
app.use("/cart", cartLimiter, cartRoutes);
app.use("/customer", customerRoutes);
app.use("/checkout", checkoutLimiter, checkoutRoutes);
app.use("/", blogRoutes)
app.use("/contact", contactFormRoutes)

// Products with their collections attached
async function allProducts() {
  const products = await Product.find().sort({ createdAt: -1 });
  return products.map(p => Object.assign(p, { collections: SHOP.collectionsFor(p) }));
}
const missionProduct = products => products.find(p => SHOP.MISSION_MATCH.test(`${p.category} ${p.name}`));

// Public Pages
app.get("/", async (req, res) => {
  const products = await allProducts();
  // Each collection's picture: its newest shirt not already used by another collection
  const used = new Set();
  const collections = SHOP.COLLECTIONS.map(c => {
    const inC = products.filter(p => p.collections.includes(c.id) && p.images?.length);
    const cover = inC.find(p => !used.has(String(p._id))) || inC[0];
    if (cover) used.add(String(cover._id));
    return { ...c, cover };
  }).filter(c => c.cover);
  const mission = missionProduct(products);
  // Top photos: shirts she tags "featured" come first, then the newest
  const featured = p => (p.tags || []).some(t => /featured/i.test(t));
  const hero = [...products.filter(featured), ...products.filter(p => !featured(p))].filter(p => p !== mission && p.images?.length).slice(0, 4);
  res.render("home", { title: "Custom shirts for every venture", products: products.slice(0, 8), hero, collections, mission, page: "home" });
});

app.get("/shop", async (req, res) => {
  const products = await allProducts();
  const active = SHOP.COLLECTIONS.find(c => c.id === req.query.c) ? req.query.c : "all";
  const counts = Object.fromEntries(SHOP.COLLECTIONS.map(c => [c.id, products.filter(p => p.collections.includes(c.id)).length]));
  const list = active === "all" ? products : products.filter(p => p.collections.includes(active));
  res.render("shop", { title: "Shop", products: list, total: products.length, active, counts, page: "shop" });
});

app.get("/shop/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).render("404");
    // The custom mission shirt has its own builder page
    const style = SHOP.missionStyleOf(product);
    if (style) return res.redirect(`/mission?style=${style.id}`);
    const related = (await allProducts()).filter(p => String(p._id) !== String(product._id) && SHOP.collectionsFor(product).some(c => p.collections.includes(c))).slice(0, 4);
    res.render("shop/product", { title: product.name, product, related, page: "shop" });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("404");
    console.error("Error loading product:", err);
    res.status(500).send("Failed to load product.");
  }
});

app.get("/mission", async (req, res) => {
  const products = await allProducts();
  // Every custom mission style that has a product in the shop
  const styles = SHOP.MISSION_STYLES.map(s => ({ ...s, product: products.find(p => s.match.test(p.name)) })).filter(s => s.product);
  if (!styles.length) return res.status(404).render("404");
  const active = styles.find(s => s.id === req.query.style) || styles[0];
  res.render("mission", { title: "Custom mission shirts", styles, active, page: "mission" });
});

app.get("/groups", async (req, res) => {
  const products = await allProducts();
  res.render("groups", { title: "Group orders", products, mission: missionProduct(products), reqStyle: req.query.style || (req.query.mission === "1" ? "original" : ""), page: "groups" });
});

// Search Bar
app.get("/search", searchLimiter, async (req, res) => {
  const query = String(req.query.q || "").slice(0, 60);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  try {
    const results = query ? await Product.find({
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
        { seasonalCategory: { $regex: escaped, $options: "i" } }
      ]
    }) : [];

    res.render("searchResults", { title: `Search: ${query}`, query, results, page: "search" });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Something went wrong during the search.");
  }
});

// Stripe success/cancel routes
app.get('/success', async (req, res) => {
  // Signed-in carts are cleared by the Stripe webhook; a guest's cart lives in the session
  if (!req.user) { try { await clearCart(req); res.locals.cartCount = 0; } catch (err) { console.error(err); } }
  res.render('shop/success', { title: "Thank you", message: 'Your payment went through. Thank you! We will email you when your order ships.' });
});

app.get('/cancel', (req, res) => res.redirect('/cart'));

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", { title: "Page not found" });
});

// Connect to DB and start server
mongoose
  .connect(process.env.MONGO_URI, process.env.MONGO_URI?.startsWith("mongodb+srv") ? { tls: true, tlsAllowInvalidCertificates: false } : {})
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}${TEST_SITE ? " (test site)" : ""}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
