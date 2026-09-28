const STORAGE = {
  entries: "quietJournal.entries",
  user: "quietJournal.user",
  loggedIn: "quietJournal.loggedIn"
};

const seedEntries = [
  {
    id: crypto.randomUUID(),
    title: "A slower Monday",
    date: "2026-09-28",
    mood: "Calm",
    body: "I gave myself permission to move a little slower today. A quiet coffee, a short walk, and getting the important things done was enough."
  },
  {
    id: crypto.randomUUID(),
    title: "Small progress",
    date: "2026-09-25",
    mood: "Focused",
    body: "Spent a few focused hours on a project that has been sitting in the back of my mind. It feels good to see one small piece finally taking shape."
  },
  {
    id: crypto.randomUUID(),
    title: "Weekend thoughts",
    date: "2026-09-20",
    mood: "Thoughtful",
    body: "The weekend was simple. Sometimes the ordinary days are the ones worth remembering."
  }
];

let entries = loadEntries();
let selectedMood = "Calm";
let toastTimer;

const $ = (id) => document.getElementById(id);

function loadEntries() {
  const saved = localStorage.getItem(STORAGE.entries);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(STORAGE.entries, JSON.stringify(seedEntries));
  return seedEntries;
}

function saveEntries() {
  localStorage.setItem(STORAGE.entries, JSON.stringify(entries));
}

function getUser() {
  return JSON.parse(localStorage.getItem(STORAGE.user) || "null");
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  }).format(new Date(dateString + "T12:00:00"));
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
}

function firstNameFromEmail(email) {
  const raw = (email || "there").split("@")[0].replace(/[._-]+/g, " ");
  return raw.split(" ")[0].replace(/^\w/, c => c.toUpperCase());
}

function showApp() {
  const user = getUser();
  if (!user) return;
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  const name = firstNameFromEmail(user.email);
  $("firstName").textContent = name;
  $("profileName").textContent = name;
  $("profileEmail").textContent = user.email;
  $("avatar").textContent = name[0] || "Y";
  $("dateLabel").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric"
  }).format(new Date());
  renderEntries();
  renderInsights();
}

function showLogin() {
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
}

function renderEntries() {
  const query = $("searchInput").value.trim().toLowerCase();
  const sort = $("sortSelect").value;

  let filtered = entries.filter(e =>
    e.title.toLowerCase().includes(query) ||
    e.body.toLowerCase().includes(query) ||
    e.mood.toLowerCase().includes(query)
  );

  if (sort === "newest") filtered.sort((a,b) => b.date.localeCompare(a.date));
  if (sort === "oldest") filtered.sort((a,b) => a.date.localeCompare(b.date));
  if (sort === "title") filtered.sort((a,b) => a.title.localeCompare(b.title));

  $("totalEntries").textContent = entries.length;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  $("monthEntries").textContent = entries.filter(e => e.date.startsWith(monthKey)).length;

  $("entryList").innerHTML = filtered.map(entry => `
    <article class="entry-card">
      <div>
        <div class="entry-meta">${formatDate(entry.date)} <span class="entry-tag">${escapeHTML(entry.mood)}</span></div>
        <h3 class="entry-title">${escapeHTML(entry.title)}</h3>
        <p class="entry-preview">${escapeHTML(entry.body.length > 180 ? entry.body.slice(0, 180) + "…" : entry.body)}</p>
      </div>
      <div class="entry-actions">
        <button class="icon-btn" title="Edit entry" onclick="editEntry('${entry.id}')">✎</button>
        <button class="icon-btn" title="Delete entry" onclick="deleteEntry('${entry.id}')">×</button>
      </div>
    </article>
  `).join("");

  $("emptyState").classList.toggle("hidden", filtered.length !== 0);
  $("entryList").classList.toggle("hidden", filtered.length === 0);
}

function renderInsights() {
  const words = entries.reduce((sum, e) => sum + e.body.trim().split(/\s+/).filter(Boolean).length, 0);
  const longest = entries.reduce((max, e) => Math.max(max, e.body.trim().split(/\s+/).filter(Boolean).length), 0);
  const days = new Set(entries.map(e => e.date)).size;
  $("wordCount").textContent = words.toLocaleString();
  $("longestEntry").textContent = `${longest} words`;
  $("writingDays").textContent = days;
}

function openModal(entry = null) {
  $("entryModal").classList.remove("hidden");
  $("entryModal").setAttribute("aria-hidden", "false");
  $("modalTitle").textContent = entry ? "Edit entry" : "New entry";
  $("entryId").value = entry?.id || "";
  $("entryTitle").value = entry?.title || "";
  $("entryDate").value = entry?.date || new Date().toISOString().slice(0,10);
  $("entryBody").value = entry?.body || "";
  selectedMood = entry?.mood || "Calm";
  document.querySelectorAll(".mood-row button").forEach(btn =>
    btn.classList.toggle("selected", btn.dataset.mood === selectedMood)
  );
  setTimeout(() => $("entryTitle").focus(), 50);
}

function closeModal() {
  $("entryModal").classList.add("hidden");
  $("entryModal").setAttribute("aria-hidden", "true");
}

function editEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (entry) openModal(entry);
}

function deleteEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  renderEntries();
  renderInsights();
  showToast("Entry deleted");
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

$("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("email").value.trim();
  localStorage.setItem(STORAGE.user, JSON.stringify({ email }));
  localStorage.setItem(STORAGE.loggedIn, "true");
  showApp();
  showToast("Welcome to your journal");
});

$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(STORAGE.loggedIn);
  showLogin();
});

$("newEntryBtn").addEventListener("click", () => openModal());
$("emptyNewBtn").addEventListener("click", () => openModal());
$("closeModalBtn").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);

$("entryModal").addEventListener("click", (event) => {
  if (event.target === $("entryModal")) closeModal();
});

document.querySelectorAll(".mood-row button").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedMood = btn.dataset.mood;
    document.querySelectorAll(".mood-row button").forEach(b => b.classList.toggle("selected", b === btn));
  });
});

$("entryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("entryId").value;
  const entry = {
    id: id || crypto.randomUUID(),
    title: $("entryTitle").value.trim(),
    date: $("entryDate").value,
    mood: selectedMood,
    body: $("entryBody").value.trim()
  };

  if (id) {
    entries = entries.map(e => e.id === id ? entry : e);
    showToast("Entry updated");
  } else {
    entries.push(entry);
    showToast("Entry saved");
  }

  saveEntries();
  renderEntries();
  renderInsights();
  closeModal();
});

$("searchInput").addEventListener("input", renderEntries);
$("sortSelect").addEventListener("change", renderEntries);

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const isJournal = btn.dataset.view === "journal";
    $("journalView").classList.toggle("hidden", !isJournal);
    $("insightsView").classList.toggle("hidden", isJournal);
    $("pageTitle").innerHTML = isJournal
      ? `Good evening, <span id="firstName">${firstNameFromEmail(getUser()?.email)}</span>.`
      : "A look back at your writing.";
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("entryModal").classList.contains("hidden")) closeModal();
});

if (localStorage.getItem(STORAGE.loggedIn) === "true" && getUser()) showApp();
