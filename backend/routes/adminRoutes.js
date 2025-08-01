// routes/adminRoutes.js
import express from "express";
import Product from "../models/product.js";
import { ensureAdmin } from "../middleware/auth.js";

const router = express.Router();

// Admin Dashboard - View recent products
router.get("/", ensureAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 }).limit(3); // Most recent
    res.render("admin/admin", {
      user: req.user,
      products,
      page: "admin"
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
    const { name, price, sizes, colors, category, seasonalCategory, tags } = req.body;
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
      tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()) : []
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
    const { name, price, sizes, colors, category, seasonalCategory, tags, action } = req.body;
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
      tags: tags ? tags.split(',').map((t) => t.trim().toLowerCase()) : []
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