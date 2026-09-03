const ADMIN_KEY = "srgecNssAdmin";
const DATA_KEY = "srgecNssData";
const REQUIRED_DATA_VERSION = 4;
const credentials = { username: "admin", password: "nss@srgec" };

async function getData() {
  const stored = localStorage.getItem(DATA_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.version === REQUIRED_DATA_VERSION) return parsed;
  }
  const data = await (await fetch("../data/site.json")).json();
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  return data;
}

function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
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

function guard() {
  if (!localStorage.getItem(ADMIN_KEY) && !location.pathname.endsWith("login.html")) {
    location.href = "login.html";
  }
}

function initAdminNav() {
  const page = location.pathname.split("/").pop();
  document.querySelectorAll("[data-admin-nav] a").forEach((a) => {
    if (a.getAttribute("href") === page) a.classList.add("active");
  });
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    localStorage.removeItem(ADMIN_KEY);
    location.href = "login.html";
  });
}

function initLogin() {
  const form = document.querySelector("[data-login]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    if (fields.get("username") === credentials.username && fields.get("password") === credentials.password) {
      localStorage.setItem(ADMIN_KEY, "true");
      location.href = "dashboard.html";
    } else {
      document.querySelector("[data-login-error]").textContent = "Invalid login. Use admin / nss@srgec for this static demo.";
    }
  });
}

function fillOverview(data) {
  const wrap = document.querySelector("[data-admin-stats]");
  const registrations = document.querySelector("[data-registration-table]");
  const roles = document.querySelector("[data-admin-roles]");
  if (wrap) {
    const cards = [
      ["Volunteers", data.stats[0]?.value || 0],
      ["Activities", data.activities.length],
      ["Camps", data.camps.length],
      ["Band Members", data.stats[1]?.value || 0],
      ["Gallery Items", data.gallery.length],
      ["Registrations", data.registrations.length]
    ];
    wrap.innerHTML = cards.map(([label, value]) => `<article class="card stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></article>`).join("");
  }
  if (registrations) {
    registrations.innerHTML = makeTable(data.registrations, ["type", "name", "roll", "branch", "createdAt"], false);
  }
  if (roles) {
    roles.innerHTML = data.roles.map((role) => `<article class="card card-body"><h3>${escapeHtml(role.name)}</h3><p>${escapeHtml(role.scope)}</p></article>`).join("");
  }
}

function managerFields(type) {
  if (type === "activities") return ["title", "description", "date", "month", "year", "location", "category", "tags", "volunteers", "organizers", "image"];
  if (type === "camps") return ["name", "description", "dates", "location", "state", "authority", "image"];
  if (type === "members") return ["name", "role", "branch", "roll", "period", "achievements", "camps", "bio", "image"];
  return ["title", "type", "year", "album", "image"];
}

function makeInput(field, value = "") {
  const label = field.replace(/([A-Z])/g, " $1");
  const isLong = ["description", "bio", "achievements", "camps", "tags"].includes(field);
  const type = field === "date" ? "date" : field === "volunteers" || field === "year" ? "number" : "text";
  if (isLong) return `<label>${label}<textarea class="input" name="${field}" required>${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</textarea></label>`;
  return `<label>${label}<input class="input" name="${field}" type="${type}" value="${escapeHtml(value)}" required></label>`;
}

function normalizeItem(type, item) {
  if (type === "activities") {
    item.tags = String(item.tags || item.category).split(",").map((tag) => tag.trim()).filter(Boolean);
    item.month = item.month || new Date(item.date).toLocaleString("en-IN", { month: "long" });
    item.year = item.year || String(new Date(item.date).getFullYear());
  }
  return item;
}

function makeTable(list, fields, actions = true) {
  if (!list.length) return `<div class="card card-body"><p>No records yet.</p></div>`;
  return `
    <table>
      <thead><tr>${fields.map((field) => `<th>${field}</th>`).join("")}${actions ? "<th>Action</th>" : ""}</tr></thead>
      <tbody>
      ${list.map((item, index) => `<tr>${fields.map((field) => `<td>${escapeHtml(Array.isArray(item[field]) ? item[field].join(", ") : item[field] || "")}</td>`).join("")}${actions ? `<td><button class="btn ghost" data-edit="${index}">Edit</button> <button class="btn ghost" data-delete="${index}">Delete</button></td>` : ""}</tr>`).join("")}
      </tbody>
    </table>`;
}

function renderManager(data, type, editIndex = null) {
  const table = document.querySelector("[data-manager-table]");
  const form = document.querySelector("[data-manager-form]");
  if (!table || !form || !type) return;
  const fields = managerFields(type);
  const list = data[type];
  const current = editIndex === null ? {} : list[editIndex];
  form.innerHTML = `
    <h2>${editIndex === null ? "Add" : "Edit"} ${type.slice(0, -1)}</h2>
    ${fields.map((field) => makeInput(field, current[field])).join("")}
    <label>Upload image or video<input class="input" name="upload" type="file" accept="image/*,video/*"></label>
    <div class="actions"><button class="btn orange">${editIndex === null ? "Add" : "Save"} ${type.slice(0, -1)}</button>${editIndex !== null ? `<button class="btn ghost" type="button" data-cancel-edit>Cancel</button>` : ""}</div>
    <p class="meta">Uploaded files are stored in this browser using Local Storage for the static demo.</p>
  `;
  table.innerHTML = makeTable(list, fields.slice(0, 5));
  form.onsubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const item = normalizeItem(type, Object.fromEntries(formData.entries()));
    const file = form.upload.files[0];
    if (file) {
      item.image = await fileToDataUrl(file);
      data.uploads.unshift({ name: file.name, type: file.type, usedIn: type, createdAt: new Date().toISOString() });
    }
    delete item.upload;
    if (editIndex === null) list.unshift(item);
    else list[editIndex] = item;
    saveData(data);
    renderManager(data, type);
  };
  form.querySelector("[data-cancel-edit]")?.addEventListener("click", () => renderManager(data, type));
  table.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => renderManager(data, type, Number(btn.dataset.edit)));
  });
  table.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      list.splice(Number(btn.dataset.delete), 1);
      saveData(data);
      renderManager(data, type);
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initSettings(data) {
  const form = document.querySelector("[data-settings]");
  if (!form) return;
  form.announcements.value = data.announcements.join("\n");
  form.events.value = data.events.map((event) => `${event.date}|${event.title}|${event.type}|${event.venue}`).join("\n");
  form.established.value = data.home.established;
  form.year.value = data.home.year;
  form.firstOfficer.value = data.home.firstOfficer;
  form.facultyCoordinator.value = data.home.facultyCoordinator;
  form.email.value = data.contact.email;
  form.phone.value = data.contact.phone;
  form.address.value = data.contact.address;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    data.announcements = form.announcements.value.split("\n").map((item) => item.trim()).filter(Boolean);
    data.events = form.events.value.split("\n").map((line) => {
      const [date, title, type, venue] = line.split("|").map((part) => part?.trim());
      return { date, title, type, venue };
    }).filter((eventItem) => eventItem.date && eventItem.title);
    data.home.established = form.established.value;
    data.home.year = form.year.value;
    data.home.firstOfficer = form.firstOfficer.value;
    data.home.facultyCoordinator = form.facultyCoordinator.value;
    data.contact.email = form.email.value;
    data.contact.phone = form.phone.value;
    data.contact.address = form.address.value;
    saveData(data);
    document.querySelector("[data-save-status]").textContent = "Saved locally.";
  });
}

function initReset(data) {
  document.querySelector("[data-reset-demo]")?.addEventListener("click", () => {
    localStorage.removeItem(DATA_KEY);
    location.reload();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  guard();
  initLogin();
  initAdminNav();
  if (location.pathname.endsWith("login.html")) return;
  const data = await getData();
  fillOverview(data);
  renderManager(data, document.body.dataset.manager);
  initSettings(data);
  initReset(data);
});
