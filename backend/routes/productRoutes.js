import express from 'express';
import Product from '../models/product.js';
import { getProducts, createProduct } from '../controllers/productController.js';

const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("Error loading products:", err);
    res.status(500).json({ error: "Failed to load products." });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Error loading product:", err);
    res.status(500).json({ error: "Failed to load product." });
  }
});

// POST /api/products
router.post('/', createProduct);

export default router;
