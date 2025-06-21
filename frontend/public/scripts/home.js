document.addEventListener("DOMContentLoaded", () => {
  const productImages = document.querySelectorAll(".product-img");

  productImages.forEach(img => {
    const images = JSON.parse(img.dataset.images);
    if (!images || images.length <= 1) return;

    let index = 0;
    setInterval(() => {
      index = (index + 1) % images.length;
      img.src = images[index];
    }, 3000); // Change image every 3 seconds
  });
});