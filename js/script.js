const SITE_KEY = "srgecNssData";
const REQUIRED_DATA_VERSION = 4;

const navItems = [
  ["Home", "index.html"],
  ["About NSS", "about.html"],
  ["NSS Activities", "activities.html"],
  ["NSS Band Team", "band-team.html"],
  ["Camps", "camps.html"],
  ["NSS Core Team", "core-team.html"],
  ["Gallery", "gallery.html"],
  ["Contact", "contact.html"]
];

async function loadSiteData() {
  const stored = localStorage.getItem(SITE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.version === REQUIRED_DATA_VERSION) return parsed;
  }
  const response = await fetch("data/site.json");
  const data = await response.json();
  localStorage.setItem(SITE_KEY, JSON.stringify(data));
  return data;
}

function saveSiteData(data) {
  localStorage.setItem(SITE_KEY, JSON.stringify(data));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function initShell() {
  document.documentElement.dataset.theme = localStorage.getItem("srgecTheme") || "light";
  const page = document.body.dataset.page || "index.html";
  document.querySelectorAll("[data-nav]").forEach((nav) => {
    nav.innerHTML = navItems.map(([label, href]) => `<a class="${href === page ? "active" : ""}" href="${href}">${label}</a>`).join("");
  });
  document.querySelectorAll("[data-year]").forEach((el) => el.textContent = new Date().getFullYear());
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("srgecTheme", next);
    });
  });
  document.querySelectorAll("[data-menu-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => document.querySelector("[data-nav]")?.classList.toggle("open"));
  });
  const top = document.querySelector("[data-back-top]");
  window.addEventListener("scroll", () => top?.classList.toggle("show", window.scrollY > 450));
  window.addEventListener("load", () => document.querySelector(".loader")?.classList.add("is-hidden"));
}

function observeReveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in");
    });
  }, { threshold: .14 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

function formatDate(date) {
  return new Date(date).toLocaleString("en-IN", { month: "short", year: "numeric", day: "2-digit" });
}

function cardImage(item) {
  return `<img class="media" src="${item.image}" alt="${escapeHtml(item.title || item.name)}">`;
}

function renderStats(stats) {
  const wrap = document.querySelector("[data-stats]");
  if (!wrap) return;
  wrap.innerHTML = stats.map((stat) => `
    <article class="card stat-card reveal">
      <div class="stat-value" data-count="${stat.value}">0</div>
      <div class="stat-label">${escapeHtml(stat.label)}</div>
    </article>
  `).join("");
  animateCounters();
}

function animateCounters() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const max = Number(el.dataset.count);
      let current = 0;
      const step = Math.max(1, Math.ceil(max / 55));
      const timer = setInterval(() => {
        current += step;
        el.textContent = current >= max ? max : current;
        if (current >= max) clearInterval(timer);
      }, 24);
      io.unobserve(el);
    });
  });
  document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
}

function renderHomeInfo(home) {
  const wrap = document.querySelector("[data-home-info]");
  if (!wrap || !home) return;
  wrap.innerHTML = `
    <div class="info-list">
      <p><strong>Started in SRGEC:</strong> ${escapeHtml(home.established)}</p>
      <p><strong>Year of establishment:</strong> ${escapeHtml(home.year)}</p>
      <p><strong>First NSS Programme Officer:</strong> ${escapeHtml(home.firstOfficer)}</p>
      <p><strong>Faculty coordinator:</strong> ${escapeHtml(home.facultyCoordinator)}</p>
    </div>
    <h3>Achievements</h3>
    <ul>${home.achievements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h3>Awards and recognitions</h3>
    <ul>${home.awards.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}

function renderActivityCards(data) {
  const wrap = document.querySelector("[data-activities]");
  if (!wrap) return;
  const search = document.querySelector("[data-search]");
  const year = document.querySelector("[data-year-filter]");
  const category = document.querySelector("[data-category-filter]");
  const years = [...new Set(data.activities.map((a) => a.year || new Date(a.date).getFullYear()))].sort((a, b) => b - a);
  const cats = [...new Set(data.activities.map((a) => a.category))].sort();
  if (year) year.innerHTML = `<option value="">All years</option>${years.map((y) => `<option>${y}</option>`).join("")}`;
  if (category) category.innerHTML = `<option value="">All categories</option>${cats.map((c) => `<option>${c}</option>`).join("")}`;
  const paint = () => {
    const term = (search?.value || "").toLowerCase();
    const y = year?.value || "";
    const c = category?.value || "";
    const list = data.activities.filter((a) => {
      const haystack = `${a.title} ${a.description} ${a.location} ${a.category} ${(a.tags || []).join(" ")}`.toLowerCase();
      return (!term || haystack.includes(term)) &&
        (!y || String(a.year || new Date(a.date).getFullYear()) === y) &&
        (!c || a.category === c);
    });
    wrap.innerHTML = list.map((a, index) => `
      <article class="card reveal">
        ${cardImage(a)}
        <div class="card-body">
          <span class="pill">${escapeHtml(a.category)}</span>
          <h3>${escapeHtml(a.title)}</h3>
          <p class="meta">${formatDate(a.date)} / ${escapeHtml(a.location)}</p>
          <p>${escapeHtml(a.description)}</p>
          <div class="pill-row">${(a.tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}</div>
          <p class="meta">${escapeHtml(a.volunteers)} volunteers / ${escapeHtml(a.organizers)}</p>
          <button class="btn ghost" data-modal-index="${index}">Details</button>
        </div>
      </article>
    `).join("") || `<p>No activities match your search.</p>`;
    document.querySelectorAll("[data-modal-index]").forEach((btn) => {
      btn.addEventListener("click", () => openActivityModal(list[Number(btn.dataset.modalIndex)]));
    });
    observeReveals();
  };
  [search, year, category].forEach((el) => el?.addEventListener("input", paint));
  paint();
}

function openActivityModal(activity) {
  const modal = document.querySelector("[data-modal]");
  if (!modal || !activity) return;
  modal.innerHTML = `
    <div class="modal-panel">
      <button class="icon-btn" data-close aria-label="Close">X</button>
      ${cardImage(activity)}
      <div class="card-body">
        <h2>${escapeHtml(activity.title || activity.name)}</h2>
        <p>${escapeHtml(activity.description || "")}</p>
        <div class="pill-row">${(activity.tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}</div>
        <p><strong>Date:</strong> ${activity.date ? formatDate(activity.date) : escapeHtml(activity.dates || activity.year || "")}</p>
        <p><strong>Location:</strong> ${escapeHtml(activity.location || activity.album || "")}</p>
        <p><strong>Volunteers:</strong> ${escapeHtml(activity.volunteers || "-")}</p>
        <p><strong>Organizers:</strong> ${escapeHtml(activity.organizers || "SRGEC NSS")}</p>
      </div>
    </div>`;
  modal.classList.add("open");
  modal.querySelector("[data-close]").addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.remove("open");
  }, { once: true });
}

function renderCamps(camps) {
  const wrap = document.querySelector("[data-camps]");
  if (!wrap) return;
  wrap.innerHTML = camps.map((camp) => `
    <article class="card reveal">
      ${cardImage({ ...camp, title: camp.name })}
      <div class="card-body">
        <span class="pill">${escapeHtml(camp.state)}</span>
        <h3>${escapeHtml(camp.name)}</h3>
        <p class="meta">${escapeHtml(camp.location)} / ${escapeHtml(camp.dates)}</p>
        <p>${escapeHtml(camp.description)}</p>
        <p><strong>Organizing authority:</strong> ${escapeHtml(camp.authority)}</p>
      </div>
    </article>
  `).join("");
}

function renderSelectedStudents(students) {
  const wrap = document.querySelector("[data-selected-students]");
  if (!wrap) return;
  wrap.innerHTML = students.map((student) => `
    <article class="card reveal">
      ${cardImage({ ...student, title: student.name })}
      <div class="card-body">
        <span class="pill">${escapeHtml(student.batch)}</span>
        <h3>${escapeHtml(student.name)}</h3>
        <p class="meta">${escapeHtml(student.branch)} / ${escapeHtml(student.year)} / ${escapeHtml(student.roll)}</p>
        <p><strong>Camp attended:</strong> ${escapeHtml(student.camp)}</p>
        <p><strong>University represented:</strong> ${escapeHtml(student.university)}</p>
        <p><strong>State represented:</strong> ${escapeHtml(student.state)}</p>
      </div>
    </article>
  `).join("");
}

function renderMembers(members) {
  const wrap = document.querySelector("[data-members]");
  if (!wrap) return;
  wrap.innerHTML = members.map((m) => `
    <article class="card reveal">
      ${cardImage({ ...m, title: m.name })}
      <div class="card-body">
        <span class="pill">${escapeHtml(m.period)}</span>
        <h3>${escapeHtml(m.name)}</h3>
        <p><strong>${escapeHtml(m.role)}</strong></p>
        <p class="meta">${escapeHtml(m.branch)}${m.roll ? " / " + escapeHtml(m.roll) : ""}</p>
        <p>${escapeHtml(m.bio)}</p>
        <p><strong>Achievements:</strong> ${escapeHtml(m.achievements || "Leadership and service contribution.")}</p>
        <p><strong>Camp participation:</strong> ${escapeHtml(m.camps || "NSS programs and camps.")}</p>
      </div>
    </article>
  `).join("");
}

function renderBand(band) {
  const instruments = document.querySelector("[data-band-instruments]");
  const captain = document.querySelector("[data-band-captain]");
  const schedule = document.querySelector("[data-band-schedule]");
  if (instruments) instruments.innerHTML = band.instruments.map((name) => `<span class="instrument">${escapeHtml(name)}</span>`).join("");
  if (captain) {
    captain.innerHTML = `<h3>${escapeHtml(band.captain.name)}</h3><p><strong>${escapeHtml(band.captain.role)}</strong></p><p>${escapeHtml(band.captain.responsibilities)}</p><p>${escapeHtml(band.captain.achievements)}</p>`;
  }
  if (schedule) {
    schedule.innerHTML = band.schedule.map((item) => `<li><strong>${escapeHtml(item.day)}:</strong> ${escapeHtml(item.time)} / ${escapeHtml(item.place)}</li>`).join("");
  }
}

function renderGallery(items) {
  const wrap = document.querySelector("[data-gallery]");
  if (!wrap) return;
  const album = document.querySelector("[data-album-filter]");
  const year = document.querySelector("[data-gallery-year-filter]");
  const type = document.querySelector("[data-type-filter]");
  const albums = [...new Set(items.map((item) => item.album))].sort();
  const years = [...new Set(items.map((item) => item.year))].sort((a, b) => b - a);
  if (album) album.innerHTML = `<option value="">All albums</option>${albums.map((a) => `<option>${a}</option>`).join("")}`;
  if (year) year.innerHTML = `<option value="">All years</option>${years.map((y) => `<option>${y}</option>`).join("")}`;
  const paint = () => {
    const list = items.filter((item) => {
      return (!album?.value || item.album === album.value) &&
        (!year?.value || item.year === year.value) &&
        (!type?.value || item.type === type.value);
    });
    wrap.innerHTML = list.map((item, index) => `
      <button class="card gallery-item reveal" data-lightbox="${index}" aria-label="Open ${escapeHtml(item.title)}">
        <img class="media" src="${item.image}" alt="${escapeHtml(item.title)}">
        <span class="card-body"><strong>${escapeHtml(item.title)}</strong><br><span class="meta">${escapeHtml(item.album)} / ${escapeHtml(item.year)} / ${escapeHtml(item.type)}</span></span>
      </button>
    `).join("");
    document.querySelectorAll("[data-lightbox]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = list[Number(btn.dataset.lightbox)];
        openActivityModal({ ...item, description: `${item.album} album item. Use filters for event-wise and year-wise albums.`, date: `${item.year}-01-01`, location: item.album, category: item.type, tags: [item.album, item.type], volunteers: "-", organizers: "SRGEC NSS" });
      });
    });
    observeReveals();
  };
  [album, year, type].forEach((el) => el?.addEventListener("input", paint));
  paint();
}

function renderAnnouncements(items) {
  const wrap = document.querySelector("[data-announcements]");
  if (!wrap) return;
  wrap.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderEvents(events) {
  const wrap = document.querySelector("[data-events]");
  if (!wrap) return;
  wrap.innerHTML = events.map((event) => `
    <article class="calendar-item reveal">
      <div class="calendar-date"><strong>${new Date(event.date).getDate()}</strong><span>${new Date(event.date).toLocaleString("en-IN", { month: "short" })}</span></div>
      <div><h3>${escapeHtml(event.title)}</h3><p class="meta">${escapeHtml(event.type)} / ${escapeHtml(event.venue)} / ${formatDate(event.date)}</p></div>
    </article>
  `).join("");
}

function renderRoles(roles) {
  const wrap = document.querySelector("[data-roles]");
  if (!wrap) return;
  wrap.innerHTML = roles.map((role) => `<article class="card card-body reveal"><h3>${escapeHtml(role.name)}</h3><p>${escapeHtml(role.scope)}</p></article>`).join("");
}

function initRegistrations(data) {
  document.querySelectorAll("[data-registration-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const entry = Object.fromEntries(new FormData(form).entries());
      entry.type = form.dataset.registrationForm;
      entry.createdAt = new Date().toISOString();
      data.registrations.unshift(entry);
      saveSiteData(data);
      form.reset();
      form.querySelector("[data-form-status]").textContent = "Registration saved locally.";
    });
  });
}

function initCertificateDownload() {
  const form = document.querySelector("[data-certificate-form]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(form).entries());
    const certificate = `SRGEC National Service Scheme (NSS)\n\nCertificate of Appreciation\n\nThis certificate is proudly presented to ${fields.name}\nRoll Number: ${fields.roll}\nFor active participation in ${fields.activity}.\n\nMotto: NOT ME BUT YOU\nProgramme Officer: Dr. V. Naveen Kumar\n`;
    const blob = new Blob([certificate], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fields.name || "nss"}-certificate.txt`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelector("[data-modal]")?.classList.remove("open");
});

document.addEventListener("DOMContentLoaded", async () => {
  initShell();
  observeReveals();
  const data = await loadSiteData();
  renderStats(data.stats);
  renderHomeInfo(data.home);
  renderActivityCards(data);
  renderCamps(data.camps);
  renderSelectedStudents(data.selectedStudents || []);
  renderMembers(data.members);
  renderBand(data.band || { instruments: [], schedule: [], captain: {} });
  renderGallery(data.gallery);
  renderAnnouncements(data.announcements);
  renderEvents(data.events || []);
  renderRoles(data.roles || []);
  observeReveals();
  initRegistrations(data);
  initCertificateDownload();
});
