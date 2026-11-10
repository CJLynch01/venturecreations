// Admin photo picker: upload or paste photos, reorder them, remove them.
// Each photo is a hidden input in the form, so the order on screen is the order saved.
document.querySelectorAll("[data-photos]").forEach(box => {
  const grid = box.querySelector(".ph-grid");
  const field = box.dataset.field;
  const single = box.hasAttribute("data-single");
  const msg = box.querySelector(".msg");
  const file = box.querySelector("input[type=file]");
  const drop = box.querySelector(".ph-drop");
  const say = text => { msg.textContent = text || ""; };

  function tools(fig) {
    if (fig.querySelector(".ph-tools")) return;
    const bar = document.createElement("div");
    bar.className = "ph-tools";
    const actions = single ? [["remove", "Remove"]] : [["first", "Make main"], ["left", "←"], ["right", "→"], ["remove", "Remove"]];
    for (const [act, label] of actions) {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.act = act; b.textContent = label;
      if (label.length === 1) b.setAttribute("aria-label", act === "left" ? "Move earlier" : "Move later");
      bar.append(b);
    }
    fig.append(bar);
  }

  function add(url) {
    if (single) grid.innerHTML = "";
    const fig = document.createElement("figure");
    fig.className = "ph";
    const img = document.createElement("img");
    img.src = url; img.alt = "";
    img.onerror = () => { fig.classList.add("ph-bad"); say("One photo link didn't load. Check it, or remove it."); };
    const input = document.createElement("input");
    input.type = "hidden"; input.name = field; input.value = url;
    fig.append(img, input);
    tools(fig);
    grid.append(fig);
    refresh();
  }

  function refresh() {
    const figs = [...grid.children];
    figs.forEach((f, i) => f.classList.toggle("ph-main", i === 0 && !single));
    box.classList.toggle("ph-empty", figs.length === 0);
  }

  grid.addEventListener("click", e => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const fig = b.closest(".ph");
    if (b.dataset.act === "remove") fig.remove();
    if (b.dataset.act === "first") grid.prepend(fig);
    if (b.dataset.act === "left" && fig.previousElementSibling) fig.previousElementSibling.before(fig);
    if (b.dataset.act === "right" && fig.nextElementSibling) fig.nextElementSibling.after(fig);
    refresh();
  });

  async function upload(files) {
    files = [...files].filter(f => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
    if (!files.length) return say("Pick JPG, PNG or WebP photos.");
    if (box.dataset.enabled === "false") return say("Uploading needs the AWS keys in Render. Paste a photo link for now.");
    const big = files.find(f => f.size > 12 * 1024 * 1024);
    if (big) return say(`${big.name} is over 12 MB. Export it smaller and try again.`);
    const body = new FormData();
    const nameField = document.querySelector(box.dataset.folder || "");
    body.append("folder", nameField ? nameField.value : "");
    (single ? files.slice(0, 1) : files).forEach(f => body.append("photos", f));
    box.classList.add("ph-busy");
    say(`Uploading ${files.length === 1 ? "the photo" : files.length + " photos"}…`);
    try {
      const res = await fetch("/admin/uploads", { method: "POST", body, credentials: "same-origin" });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "The upload didn't go through. Try again.");
      out.urls.forEach(add);
      say("");
    } catch (err) {
      say(err.message);
    } finally {
      box.classList.remove("ph-busy");
      if (file) file.value = "";
    }
  }

  if (file) file.addEventListener("change", () => upload(file.files));
  if (drop) {
    ["dragenter", "dragover"].forEach(t => box.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => box.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
    box.addEventListener("drop", e => { if (e.dataTransfer.files.length) upload(e.dataTransfer.files); });
  }

  const link = box.querySelector(".ph-link");
  if (link) {
    const input = link.querySelector("input");
    const go = () => {
      const url = input.value.trim();
      if (!/^(https:\/\/|\/)/.test(url)) return say("Photo links start with https://");
      add(url); input.value = ""; say("");
    };
    link.querySelector("button").addEventListener("click", go);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  }

  [...grid.children].forEach(tools);
  refresh();

  // A shirt needs at least one photo before it can be saved
  const form = box.closest("form");
  if (form && !single) form.addEventListener("submit", e => {
    if (!grid.children.length) { e.preventDefault(); say("Add at least one photo."); box.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
});
