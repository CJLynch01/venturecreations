import express from "express";
import passport from "passport";

const router = express.Router();

// Start Google OAuth login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth callback
router.get("/google/callback", passport.authenticate("google", {
  failureRedirect: "/login"
}), (req, res) => {
  if (req.user.role === "Admin") {
    res.redirect("/admin");
  } else {
    res.redirect("/shop");
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

export default router;