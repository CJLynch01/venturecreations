import express from 'express';
import Product from '../models/product.js';
import { getProducts, createProduct } from '../controllers/productController.js';

const router = express.Router();

// GET /shop/
router.get('/', async (req, res) => {
  const products = await Product.find();
  res.render('shop', { products });
});

// GET /shop/:id — product view page
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.render('product', { product });
  } catch (err) {
    console.error("Error loading product:", err);
    res.status(500).send("Failed to load product.");
  }
});

// POST /api/products
router.post('/', createProduct);

export default router;
