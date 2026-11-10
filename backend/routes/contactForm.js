import express from "express";
import rateLimit from "express-rate-limit";
import ContactMessage from "../models/ContactMessage.js";

const router = express.Router();
const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

router.get("/", (req, res) => {
  res.render("contact", {
    success: req.query.success,
    page: "contact"
  });
});

// Messages used to be only logged to the server console (and lost); now they're saved for the admin page
router.post("/", sendLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    if (!clip(email, 200) || !clip(message, 5000)) return res.redirect("/contact");
    await ContactMessage.create({ name: clip(name, 120), email: clip(email, 200), subject: clip(subject, 200), message: clip(message, 5000) });
    res.redirect("/contact?success=true");
  } catch (err) {
    console.error("Error handling contact form:", err);
    res.status(500).send("Something went wrong.");
  }
});

export default router;
