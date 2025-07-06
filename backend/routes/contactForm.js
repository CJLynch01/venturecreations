import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.render("contact");
});

router.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    // Example: log to console, or send email, etc.
    console.log("Contact form submission:", { name, email, subject, message });

    // You can redirect or flash a success message
    res.redirect("/contact?success=true");
  } catch (err) {
    console.error("Error handling contact form:", err);
    res.status(500).send("Something went wrong.");
  }
});

export default router;
