import express from "express";
import Product from "../models/Product.js";
import { ensureAdmin } from "../middleware/auth.js";

const router = express.Router();

// Admin Dashboard - View recent products
router.get("/", ensureAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 }).limit(3); // Most recent
    res.render("admin/admin", {
      user: req.user,
      products,
    });
  } catch (error) {
    console.error("Admin page error:", error);
    res.status(500).send("Error loading admin dashboard.");
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
    const { name, price, sizes, colors, category, stock } = req.body;
    let { images } = req.body;

    // Ensure 'images' is an array
    if (!Array.isArray(images)) {
      images = [images]; // convert to array if it's just one
    }

    const cleanImages = images.filter((url) => url.trim() !== "");

    const newProduct = new Product({
      name,
      price: parseFloat(price),
      sizes: sizes.split(",").map((s) => s.trim()),
      colors: colors.split(",").map((c) => c.trim()),
      category,
      images: cleanImages,
      stock: parseInt(stock, 10),
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
    const { name, price, sizes, colors, category, stock } = req.body;
    let { images } = req.body;

    // Ensure 'images' is an array
    if (!Array.isArray(images)) {
      images = [images];
    }

    const cleanImages = images.filter((url) => url.trim() !== "");

    await Product.findByIdAndUpdate(req.params.id, {
      name,
      price: parseFloat(price),
      sizes: sizes.split(",").map((s) => s.trim()),
      colors: colors.split(",").map((c) => c.trim()),
      category,
      images: cleanImages,
      stock: parseInt(stock, 10),
    });

    res.redirect("/admin");
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

export default router;