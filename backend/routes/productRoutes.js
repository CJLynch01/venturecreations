import express from 'express';
import { getProducts, createProduct } from '../controllers/productController.js';
import Product from '../models/Product.js';

const router = express.Router();

router.get('/', getProducts);

router.get("/shop/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.render("shop/product", { product });
  } catch (err) {
    console.error("Error loading product:", err);
    res.status(500).send("Failed to load product.");
  }
});

router.post('/', createProduct);

export default router;