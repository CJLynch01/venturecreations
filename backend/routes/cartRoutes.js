// routes/cartRoutes.js
import express from "express";
import User from "../models/User.js";
import Product from "../models/product.js";

const router = express.Router();

// View Cart
router.get("/", async (req, res) => {
  if (!req.user) return res.redirect("/auth/google");

  try {
    const user = await User.findById(req.user._id).populate("cart.productId");

    const cartItems = user.cart.map(item => ({
      product: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color
    }));

    const subtotal = cartItems.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    const estimatedTax = subtotal * 0.0725;
    const shipping = subtotal >= 100 ? 0 : 4.99;
    const total = subtotal + estimatedTax + shipping;

    res.render("shop/cart", {
      cart: cartItems,
      subtotal,
      estimatedTax,
      shipping,
      total
    });
  } catch (err) {
    console.error("Error loading cart:", err);
    res.status(500).send("Error loading cart.");
  }
});

// Add to Cart
router.post("/add", async (req, res) => {
  const { productId, size, color } = req.body;

  if (!req.user) return res.redirect("/auth/google");

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    const user = await User.findById(req.user._id);

    const existingItem = user.cart.find(item => 
      item.productId.equals(productId) &&
      item.size === size &&
      item.color === color
    );
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({
        productId: product._id,
        quantity: 1,
        size,
        color
      });
    }

    await user.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).send("Error adding to cart.");
  }
});

// Remove from Cart
router.post("/remove", async (req, res) => {
  const { productId } = req.body;

  if (!req.user) return res.redirect("/auth/google");

  try {
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter(item => !item.productId.equals(productId));
    await user.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Error removing from cart:", err);
    res.status(500).send("Error removing item.");
  }
});

// Update Quantity
router.post("/update", async (req, res) => {
  const { productId, action } = req.body;

  if (!req.user) return res.redirect("/auth/google");

  try {
    const user = await User.findById(req.user._id);

    const item = user.cart.find(item => item.productId.equals(productId));
    if (item) {
      if (action === "increase") {
        item.quantity += 1;
      } else if (action === "decrease" && item.quantity > 1) {
        item.quantity -= 1;
      }
    }

    await user.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).send("Error updating item.");
  }
});

export default router;