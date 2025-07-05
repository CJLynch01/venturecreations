// EDIT - Show edit form
router.get("/admin/blog/edit/:id", ensureAdmin, async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");
  res.render("admin/editPost", { post });
});

// EDIT - Handle update
router.post("/admin/blog/edit/:id", ensureAdmin, async (req, res) => {
  const { title, content } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "");
  try {
    await BlogPost.findByIdAndUpdate(req.params.id, {
      title,
      slug,
      content,
      updatedAt: new Date()
    });
    res.redirect("/admin/blog");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating blog post.");
  }
});

// DELETE - Handle delete
router.post("/admin/blog/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
    res.redirect("/admin/blog");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting blog post.");
  }
});