// LOADER (basic placeholder)
setTimeout(() => {
  document.getElementById("loader").style.display = "none";
}, 2500);

// LOGO ANIMATION
setTimeout(() => {
  document.querySelector(".x").style.opacity = 1;
}, 2600);

setTimeout(() => {
  document.querySelector(".tr").style.opacity = 1;
}, 3000);

// GIF HOVER
document.querySelectorAll(".gif-shot img").forEach(img => {
  const gif = img.dataset.gif;
  const still = img.src;

  img.addEventListener("mouseenter", () => {
    img.src = gif;
  });

  img.addEventListener("mouseleave", () => {
    img.src = still;
  });
});