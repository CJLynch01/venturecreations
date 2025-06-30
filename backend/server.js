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

// Models
import User from "./models/User.js";
import Product from "./models/Product.js";

// Routes
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend/public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultSecret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Load user and cart into views
app.use(async (req, res, next) => {
  res.locals.user = req.user;

  if (req.user && req.user.role === "Customer") {
    try {
      const user = await User.findById(req.user._id);
      res.locals.cart = user.cart || [];
    } catch (err) {
      console.error("Error loading cart into res.locals:", err);
      res.locals.cart = [];
    }
  } else {
    res.locals.cart = [];
  }

  next();
});

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Routes
app.use("/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/admin", adminRoutes);
app.use("/cart", cartRoutes);
app.use("/customer", customerRoutes);

// Public Pages
app.get("/", async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 }).limit(3);
  res.render("home", { title: "Welcome to Venture Creations", products });
});

app.get("/shop", async (req, res) => {
  const products = await Product.find();
  res.render("shop", { products });
});

app.get("/shop/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.render("shop/product", { product });
  } catch (err) {
    console.error("Error loading product:", err);
    res.status(500).send("Failed to load product.");
  }
});

// Connect to DB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));