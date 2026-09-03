document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelector("[data-modal]")?.classList.remove("open");
});
