import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import Product from "./models/Product.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend/public")));

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Mock user middleware (temporary until OAuth is added)
const mockUser = {
  displayName: process.env.ADMIN_NAME,
  email: process.env.ADMIN_EMAIL
};

app.use((req, res, next) => {
  req.user = mockUser;
  res.locals.user = mockUser; // makes user available in EJS partials
  next();
});

// Admin access middleware
function ensureAdmin(req, res, next) {
  if (req.user && req.user.email === process.env.ADMIN_EMAIL) {
    return next();
  }
  res.redirect("/");
}

// API Routes
app.use("/api/products", productRoutes);

// Admin EJS Routes
app.use("/", adminRoutes);

// Public Pages
app.get("/", async (req, res) => {
  const products = await Product.find().limit(3);
  res.render("home", { title: "Welcome to Venture Creations", products });
});

app.get("/shop", async (req, res) => {
  const products = await Product.find();
  res.render("shop", { products });
});

// Admin Dashboard
app.get("/admin", ensureAdmin, async (req, res) => {
  try {
    const products = await Product.find();
    res.render("admin", {
      user: req.user,
      products
    });
  } catch (error) {
    console.error("Admin page error:", error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// MongoDB & Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));