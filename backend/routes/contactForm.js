import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import ContactMessage from "../models/ContactMessage.js";

const router = express.Router();
const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

// Spam filters people never see: a hidden "website" box only bots fill in, and a signed
// time stamp from when the form loaded (bots post within a second or two, or reuse old pages)
const sign = t => crypto.createHmac("sha256", process.env.SESSION_SECRET || "vc-contact").update(String(t)).digest("hex").slice(0, 16);
const formStamp = () => { const t = Date.now(); return `${t}.${sign(t)}`; };
function looksLikeBot(body) {
  if (clip(body.website, 200)) return true;
  const [t, sig] = String(body.stamp || "").split(".");
  if (!t || sig !== sign(t)) return true;
  const age = Date.now() - Number(t);
  return age < 3000 || age > 24 * 3600 * 1000;
}

router.get("/", (req, res) => {
  res.render("contact", {
    success: req.query.success,
    stamp: formStamp(),
    page: "contact"
  });
});

// Messages used to be only logged to the server console (and lost); now they're saved for the admin page
router.post("/", sendLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    if (!clip(email, 200) || !clip(message, 5000)) return res.redirect("/contact");
    // Bots get the same "sent" page so they don't learn to work around it; nothing is saved
    if (looksLikeBot(req.body)) {
      console.log("Contact form: dropped a likely spam message");
      return res.redirect("/contact?success=true");
    }
    await ContactMessage.create({ name: clip(name, 120), email: clip(email, 200), subject: clip(subject, 200), message: clip(message, 5000) });
    res.redirect("/contact?success=true");
  } catch (err) {
    console.error("Error handling contact form:", err);
    res.status(500).send("Something went wrong.");
  }
});

export default router;
