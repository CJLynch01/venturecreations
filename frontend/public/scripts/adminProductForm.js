document.addEventListener("DOMContentLoaded", () => {
  const addImageBtn = document.getElementById("add-image-btn");
  const imageFields = document.getElementById("image-fields");

  if (addImageBtn && imageFields) {
    addImageBtn.addEventListener("click", () => {
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.name = "images[]";
      newInput.placeholder = `Image ${imageFields.children.length + 1} URL`;
      newInput.classList.add("form-control");
      imageFields.appendChild(newInput);
    });
  }


  
});
