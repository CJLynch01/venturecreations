import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// Show Add Product Form
router.get("/admin/products/new", (req, res) => {
  res.render("admin/newProduct");
});

// Handle Add Product Form
router.post("/admin/products/new", async (req, res) => {
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
router.get("/admin/products/edit/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.render("admin/editProduct", { product });
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Failed to load product.");
  }
});

// Handle Edit Form
router.post("/admin/products/edit/:id", async (req, res) => {
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

// Handle Delete
router.post("/admin/products/delete/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Failed to delete product.");
  }
});

export default router;