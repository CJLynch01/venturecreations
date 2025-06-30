import express from "express";
import { ensureAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/dashboard", ensureAuthenticated, (req, res) => {
  // Only allow customers (not admins) to view this page
  if (req.user.role !== "Customer") return res.redirect("/");

  res.render("customer/dashboard", {
    title: "My Dashboard",
    user: req.user
  });
});

export default router;
