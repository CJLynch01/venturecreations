import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Register" });
});

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", passport.authenticate("google", {
  failureRedirect: "/login"
}), (req, res) => {
  if (req.user.role === "Admin") {
    res.redirect("/admin");
  } else {
    res.redirect("/shop");
  }
});

router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

export default router;