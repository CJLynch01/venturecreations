document.addEventListener("DOMContentLoaded", () => {
  // Product image cycling
  const productImages = document.querySelectorAll(".product-img");
  productImages.forEach(img => {
    const images = JSON.parse(img.dataset.images);
    if (!images || images.length <= 1) return;

    let index = 0;
    setInterval(() => {
      index = (index + 1) % images.length;
      img.src = images[index];
    }, 3000);
  });

  // Hamburger toggle logic
  const toggle = document.getElementById("navToggle");

  // Try for mainNav first
  let nav = document.getElementById("mainNav");

  // Fallback to mainNav2 if it's not on this page
  if (!nav) {
    nav = document.getElementById("mainNav2");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
    });

    // Close menu when a link is clicked
    const navLinks = nav.querySelectorAll("a");
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
      });
    });
  }
});
