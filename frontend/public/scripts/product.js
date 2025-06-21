document.addEventListener("DOMContentLoaded", () => {
  const images = JSON.parse(document.getElementById("mainImage").dataset.images);
  const mainImage = document.getElementById("mainImage");
  let currentIndex = 0;

  const showImage = (index) => {
    mainImage.src = images[index];
  };

  document.getElementById("prevImage").addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    showImage(currentIndex);
  });

  document.getElementById("nextImage").addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % images.length;
    showImage(currentIndex);
  });
});
