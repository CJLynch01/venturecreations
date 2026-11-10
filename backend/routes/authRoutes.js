import express from "express";
import passport from "passport";
import { googleEnabled } from "../config/passport.js";
import { mergeGuestCart } from "../lib/cart.js";

const router = express.Router();

router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Sign in", query: req.query });
});

router.get("/google", (req, res, next) => {
  if (!googleEnabled) return res.redirect("/auth/register?off=1");
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!googleEnabled) return res.redirect("/");
  // keepSessionInfo: passport starts a fresh session at sign-in, this carries the guest cart across
  passport.authenticate("google", { failureRedirect: "/auth/register", keepSessionInfo: true })(req, res, next);
}, async (req, res) => {
  // Keep what they added to the cart before signing in
  const guestCart = req.session.cart;
  try { await mergeGuestCart(req); } catch (err) { console.error("Cart merge failed:", err); }
  if (req.user.role === "Admin") res.redirect("/admin");
  else if (guestCart?.length) res.redirect("/cart");
  else res.redirect("/customer/dashboard");
});

router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

export default router;
