import crypto from "crypto";
import express from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { googleEnabled } from "../config/passport.js";
import { mergeGuestCart } from "../lib/cart.js";
import { mailEnabled, sendMail } from "../lib/mailer.js";
import User from "../models/User.js";
import LoginToken from "../models/LoginToken.js";

const router = express.Router();
const TEST_SITE = process.env.TEST_SITE === "1";
const LINK_MINUTES = 15;
const hash = t => crypto.createHash("sha256").update(t).digest("hex");
const cleanEmail = e => String(e || "").trim().toLowerCase().slice(0, 200);
const looksLikeEmail = e => /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(e);

router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Sign in", query: req.query, googleEnabled, emailEnabled: mailEnabled || TEST_SITE });
});

// Where to go after signing in
async function finishSignIn(req, res) {
  const guestCart = req.session.cart;
  try { await mergeGuestCart(req); } catch (err) { console.error("Cart merge failed:", err); }
  if (req.user.role === "Admin") res.redirect("/admin");
  else if (guestCart?.length) res.redirect("/cart");
  else res.redirect("/customer/dashboard");
}

router.get("/google", (req, res, next) => {
  if (!googleEnabled) return res.redirect("/auth/register?off=1");
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!googleEnabled) return res.redirect("/");
  // keepSessionInfo: passport starts a fresh session at sign-in, this carries the guest cart across
  passport.authenticate("google", { failureRedirect: "/auth/register", keepSessionInfo: true })(req, res, next);
}, finishSignIn);

// ---- Sign in with an email link (no password) ----
const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).render("auth/register", { title: "Sign in", query: { err: "slow" }, googleEnabled, emailEnabled: true }) });

router.post("/email", sendLimiter, async (req, res) => {
  const email = cleanEmail(req.body.email);
  if (!looksLikeEmail(email)) return res.render("auth/register", { title: "Sign in", query: { err: "email" }, googleEnabled, emailEnabled: true, email });
  if (!mailEnabled && !TEST_SITE) return res.render("auth/register", { title: "Sign in", query: { err: "nomail" }, googleEnabled, emailEnabled: false });
  try {
    // At most 3 links per email in 15 minutes
    const recent = await LoginToken.countDocuments({ email, createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } });
    let testLink = null;
    if (recent < 3) {
      const token = crypto.randomBytes(32).toString("base64url");
      await LoginToken.create({ email, tokenHash: hash(token), expiresAt: new Date(Date.now() + LINK_MINUTES * 60 * 1000) });
      const link = `${process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`}/auth/email/verify?token=${token}`;
      if (mailEnabled) {
        await sendMail({
          to: email,
          subject: "Your Venture Creations sign-in link",
          text: `Tap this link to sign in to Venture Creations:\n\n${link}\n\nIt works once and expires in ${LINK_MINUTES} minutes. If you didn't ask to sign in, you can ignore this email.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1c2233">
            <h2 style="font-family:Georgia,serif;font-weight:400">Sign in to Venture <i style="color:#4a5ca3">Creations</i></h2>
            <p>Tap the button to sign in. It works once and expires in ${LINK_MINUTES} minutes.</p>
            <p><a href="${link}" style="display:inline-block;background:#1c2233;color:#fff;padding:12px 24px;text-decoration:none;letter-spacing:.1em;font-size:13px;font-weight:bold">SIGN IN</a></p>
            <p style="color:#5b6275;font-size:13px">If you didn't ask to sign in, you can ignore this email.</p></div>`,
        });
      } else {
        testLink = link;   // test site only: no email is sent, the link is shown on the page
        console.log(`[test site] sign-in link for ${email}: ${link}`);
      }
    }
    // Same answer whether or not the email has an account
    res.render("auth/register", { title: "Check your email", query: { sent: "1" }, googleEnabled, emailEnabled: true, email, testLink });
  } catch (err) {
    console.error("Email sign-in failed:", err);
    res.render("auth/register", { title: "Sign in", query: { err: "send" }, googleEnabled, emailEnabled: true, email });
  }
});

// Opening the link shows a button; the sign-in happens on the button press (POST), so email
// apps that open links to scan them don't use the link up
router.get("/email/verify", async (req, res) => {
  const token = String(req.query.token || "");
  const found = token && await LoginToken.findOne({ tokenHash: hash(token), used: false, expiresAt: { $gt: new Date() } });
  res.render("auth/verify", { title: "Finish signing in", token: found ? token : "", email: found?.email });
});

router.post("/email/verify", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    // Mark used in the same step as checking, so a link can't be used twice
    const found = token && await LoginToken.findOneAndUpdate({ tokenHash: hash(token), used: false, expiresAt: { $gt: new Date() } }, { used: true });
    if (!found) return res.render("auth/verify", { title: "Finish signing in", token: "", email: null });
    // Same account as their Google sign-in if the address matches (ignoring capital letters)
    let user = await User.findOne({ email: { $regex: `^${found.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (!user) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) ?? [];
      user = await User.create({ email: found.email, name: found.email.split("@")[0], role: adminEmails.includes(found.email) ? "Admin" : "Customer" });
    }
    req.login(user, { keepSessionInfo: true }, err => (err ? next(err) : finishSignIn(req, res)));
  } catch (err) { next(err); }
});

router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

export default router;
