import express from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import Order from "../models/Order.js";

const router = express.Router();

router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  // Only allow customers (not admins) to view this page
  if (req.user.role !== "Customer") return res.redirect("/");

  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });

  res.render("customer/dashboard", {
    title: "My Dashboard",
    user: req.user,
    orders
  });
});

export default router;
