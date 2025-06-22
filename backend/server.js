import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

// Routes
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

// Models
import Product from "./models/Product.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend/public")));

app.use(
  session({
    secret: "yourSecretKey", // Change this to a secure value
    resave: false,
    saveUninitialized: true,
  })
);

app.use((req, res, next) => {
  res.locals.cart = req.session.cart || [];
  next();
});

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Mock user (until OAuth is added)
const mockUser = {
  displayName: process.env.ADMIN_NAME,
  email: process.env.ADMIN_EMAIL,
};

app.use((req, res, next) => {
  req.user = mockUser;
  res.locals.user = mockUser;
  next();
});

// Route mounts
app.use("/api/products", productRoutes);
app.use("/admin", adminRoutes);
app.use("/cart", cartRoutes);

// Public Pages
app.get("/", async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 }).limit(3);
  res.render("home", { title: "Welcome to Venture Creations", products });
});

app.get("/shop", async (req, res) => {
  const products = await Product.find();
  res.render("shop", { products });
});

// Individual Product Page
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

// Database & Server Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));