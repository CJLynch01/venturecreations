import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// Middleware to check admin access
function ensureAdmin(req, res, next) {
  if (req.user && req.user.email === process.env.ADMIN_EMAIL) {
    return next();
  }
  res.redirect("/");
}

// Admin Dashboard
router.get("/admin", ensureAdmin, async (req, res) => {
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

// Show Add Product Form
router.get("/admin/products/new", ensureAdmin, (req, res) => {
  res.render("admin/newProduct");
});

// Handle Add Product Form
router.post("/admin/products/new", ensureAdmin, async (req, res) => {
  try {
    const { name, price, sizes, colors, category, imageUrl, stock } = req.body;

    const newProduct = new Product({
      name,
      price,
      sizes: sizes.split(',').map(s => s.trim()),
      colors: colors.split(',').map(c => c.trim()),
      category,
      imageUrl,
      stock
    });

    await newProduct.save();
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Failed to add product.");
  }
});

// Show Edit Form
router.get("/admin/products/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.render("admin/editProduct", { product });
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Failed to load product.");
  }
});

// Handle Edit Form Submission
router.post("/admin/products/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { name, price, sizes, colors, category, imageUrl, stock } = req.body;

    await Product.findByIdAndUpdate(req.params.id, {
      name,
      price,
      sizes: sizes.split(',').map(s => s.trim()),
      colors: colors.split(',').map(c => c.trim()),
      category,
      imageUrl,
      stock
    });

    res.redirect("/admin");
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).send("Failed to update product.");
  }
});

// Handle Delete Request
router.post("/admin/products/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Failed to delete product.");
  }
});

export default router;