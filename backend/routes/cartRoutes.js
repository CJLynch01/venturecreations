import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// View Cart
router.get("/cart", (req, res) => {
  const cart = req.session.cart || [];
  res.render("cart", { cart });
});

// Add to Cart
router.post("/add", async (req, res) => {
  const { productId } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    if (!req.session.cart) req.session.cart = [];

    const existingItem = req.session.cart.find(item => item._id === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      req.session.cart.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity: 1,
      });
    }

    res.redirect("/cart");
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).send("Error adding to cart");
  }
});

// Remove from Cart
router.post("/cart/remove", (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.filter(item => item._id !== productId);
  res.redirect("/cart");
});

export default router;