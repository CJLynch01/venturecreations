document.querySelectorAll('.product-img').forEach(img => {
    const images = JSON.parse(img.dataset.images);
    if (images.length > 1) {
      let index = 0;
      setInterval(() => {
        index = (index + 1) % images.length;
        img.src = images[index];
      }, 2500); // rotate every 2.5 seconds
    }
});