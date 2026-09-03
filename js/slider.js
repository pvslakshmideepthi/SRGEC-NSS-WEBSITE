document.addEventListener("DOMContentLoaded", async () => {
  const slider = document.querySelector("[data-slider]");
  if (!slider) return;
  const data = JSON.parse(localStorage.getItem("srgecNssData") || "null") || await (await fetch("data/site.json")).json();
  const slides = [...data.activities, ...data.camps.map((camp) => ({ title: camp.name, description: camp.description, image: camp.image }))].slice(0, 7);
  slider.innerHTML = `
    <div class="slides">${slides.map((slide) => `
      <article class="slide">
        <img src="${slide.image}" alt="${slide.title}">
        <div class="slide-content">
          <span class="eyebrow">SRGEC NSS</span>
          <h2>${slide.title}</h2>
          <p>${slide.description}</p>
        </div>
      </article>
    `).join("")}</div>
    <div class="slider-controls">
      <button class="icon-btn" data-prev aria-label="Previous slide">&lt;</button>
      <button class="icon-btn" data-next aria-label="Next slide">&gt;</button>
    </div>`;
  const track = slider.querySelector(".slides");
  let current = 0;
  const go = (dir) => {
    current = (current + dir + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
  };
  slider.querySelector("[data-prev]").addEventListener("click", () => go(-1));
  slider.querySelector("[data-next]").addEventListener("click", () => go(1));
  setInterval(() => go(1), 5000);
});
