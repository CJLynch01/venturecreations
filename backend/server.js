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
import BlogPost from "./models/BlogPost.js";

// Shop settings and cart
import * as SHOP from "./config/shop.js";
import { cartCount, clearCart } from "./lib/cart.js";
import { withSlugs, siteUrl, absolute, productPath, productSummary, productJsonLd, breadcrumbJsonLd, storeJsonLd } from "./lib/seo.js";

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
const PRODUCTION = process.env.NODE_ENV === "production";

// Render sits in front of the app: trust its proxy so each shopper's real IP is used for
// rate limits (otherwise every visitor shares one limit) and secure cookies work over https
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Basic browser security headers
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  });
  if (PRODUCTION) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
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
      httpOnly: true,                      // page scripts can't read the login cookie
      sameSite: "lax",                     // other sites can't post forms (cart, admin) with it
      secure: PRODUCTION,                  // https only on the live site
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
  // Search and link-preview defaults; pages fill in res.locals.seo with their own title, description and photo
  res.locals.siteUrl = siteUrl(req);
  res.locals.absolute = src => absolute(req, src);
  res.locals.productPath = productPath;
  res.locals.seo = { canonical: siteUrl(req) + req.path, noindex: /^\/(cart|checkout|customer|auth|admin|search|success)/.test(req.path) };
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
  const products = withSlugs(await Product.find().sort({ createdAt: -1 }));
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
  Object.assign(res.locals.seo, {
    canonical: siteUrl(req) + "/",
    description: "Custom shirts for every venture: custom missionary shirts, Christmas and faith tees, mental health, cats, Día de los Muertos and Halloween shirts, made to order with group discounts.",
    image: hero[0]?.images?.[0], jsonld: [storeJsonLd(req)],
  });
  res.render("home", { title: "Custom shirts for every venture", products: products.slice(0, 8), hero, collections, mission, page: "home" });
});

app.get("/shop", async (req, res) => {
  const products = await allProducts();
  const active = SHOP.COLLECTIONS.find(c => c.id === req.query.c) ? req.query.c : "all";
  const counts = Object.fromEntries(SHOP.COLLECTIONS.map(c => [c.id, products.filter(p => p.collections.includes(c.id)).length]));
  const list = active === "all" ? products : products.filter(p => p.collections.includes(active));
  const coll = SHOP.COLLECTIONS.find(c => c.id === active);
  Object.assign(res.locals.seo, {
    canonical: siteUrl(req) + "/shop" + (coll ? `?c=${coll.id}` : ""),
    description: coll ? coll.blurb : "Shop every Venture Creations shirt: custom missionary shirts, faith, Christmas, mental health, cats, Día de los Muertos, Halloween and funny tees.",
    image: list[0]?.images?.[0],
  });
  res.render("shop", { title: coll ? `${coll.name} shirts` : "Shop all shirts", products: list, total: products.length, active, counts, page: "shop" });
});

app.get("/shop/:key", async (req, res) => {
  try {
    // Shirts live at readable addresses (/shop/nativity); old /shop/<id> links forward there
    const products = await allProducts();
    const key = String(req.params.key);
    const product = products.find(p => p.slug === key) || (/^[0-9a-f]{24}$/i.test(key) ? products.find(p => String(p._id) === key.toLowerCase()) : null);
    if (!product) return res.status(404).render("404");
    // The custom mission shirts have their own page
    const style = SHOP.missionStyleOf(product);
    if (style) return res.redirect(301, style.id === "original" ? "/mission" : `/mission?style=${style.id}`);
    if (key !== product.slug) return res.redirect(301, productPath(product));
    const related = products.filter(p => String(p._id) !== String(product._id) && SHOP.collectionsFor(product).some(c => p.collections.includes(c))).slice(0, 4);
    const coll = SHOP.COLLECTIONS.find(c => SHOP.collectionsFor(product).includes(c.id));
    Object.assign(res.locals.seo, {
      description: productSummary(product), image: product.images?.[0], type: "product", price: product.price,
      jsonld: [productJsonLd(req, product), breadcrumbJsonLd(req, [{ name: "Shop", path: "/shop" }, ...(coll ? [{ name: coll.name, path: `/shop?c=${coll.id}` }] : []), { name: product.name, path: productPath(product) }])],
    });
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
  const canonical = siteUrl(req) + "/mission" + (active.id === styles[0].id ? "" : `?style=${active.id}`);
  const ld = productJsonLd(req, active.product);
  ld.offers.url = canonical;
  Object.assign(res.locals.seo, {
    canonical,
    description: active.things
      ? "Custom missionary shirts: your mission's state or country in the middle, four things that describe the mission, and the mission name, hand-drawn and made to order."
      : "Custom missionary flag shirts with the flag of the country where they serve and the mission name, made to order.",
    image: active.product.images?.[0], type: "product", price: active.product.price, jsonld: [ld],
  });
  res.render("mission", { title: active.things ? "Custom missionary shirts" : "Custom missionary flag shirts", styles, active, page: "mission" });
});

app.get("/groups", async (req, res) => {
  const products = await allProducts();
  Object.assign(res.locals.seo, { description: "Group shirts for youth conferences, treks, mission prep, reunions and homecomings. Prices drop at 12, 24 and 48 shirts." });
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

// For search engines: the list of every page and shirt, and which areas to skip
app.get("/sitemap.xml", async (req, res) => {
  const site = siteUrl(req);
  const products = await allProducts();
  const posts = await BlogPost.find({}, { slug: 1, updatedAt: 1, createdAt: 1 }).catch(() => []);
  const day = d => new Date(d || Date.now()).toISOString().slice(0, 10);
  const urls = [
    { loc: "/", pri: "1.0" }, { loc: "/shop", pri: "0.9" }, { loc: "/mission", pri: "0.9" }, { loc: "/groups", pri: "0.7" },
    { loc: "/blog", pri: "0.5" }, { loc: "/contact", pri: "0.4" },
    ...SHOP.MISSION_STYLES.slice(1).filter(s => products.some(p => s.match.test(p.name))).map(s => ({ loc: `/mission?style=${s.id}`, pri: "0.8" })),
    ...SHOP.COLLECTIONS.filter(c => products.some(p => p.collections.includes(c.id))).map(c => ({ loc: `/shop?c=${c.id}`, pri: "0.7" })),
    ...products.filter(p => !SHOP.missionStyleOf(p)).map(p => ({ loc: productPath(p), pri: "0.8", mod: day(p.updatedAt || p.createdAt) })),
    ...posts.filter(p => p.slug).map(p => ({ loc: `/blog/${p.slug}`, pri: "0.5", mod: day(p.updatedAt || p.createdAt) })),
  ];
  const esc = s => s.replace(/&/g, "&amp;");
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${esc(site + u.loc)}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ""}<priority>${u.pri}</priority></url>`).join("\n") + "\n</urlset>\n");
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(TEST_SITE
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nDisallow: /admin\nDisallow: /cart\nDisallow: /checkout\nDisallow: /customer\nDisallow: /auth\nDisallow: /search\nDisallow: /success\n\nSitemap: ${siteUrl(req)}/sitemap.xml\n`);
});

// 404 handler
app.use((req, res) => {
  res.locals.seo = { noindex: true };
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
