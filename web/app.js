firebase.initializeApp(window.FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

const SHARED_EMAIL = window.SHARED_AUTH_EMAIL;

const DEFAULT_COLOR = "#e2b33c";
const DEFAULT_TEXT_COLOR = "#f4f3f7";
const DEFAULT_FONT = "caveat";
const DEFAULT_OPACITY = 30;

const COLOR_PALETTE = ["#e2b33c", "#9b3a3a", "#3b5a8a", "#4a7a4f", "#c97a3d", "#3a8a82"];
const TEXT_COLOR_PALETTE = ["#f4f3f7", "#1b1f2a", "#e2b33c", "#ff7a9e"];
const FONTS = {
  caveat: { label: "Caveat", family: "'Caveat', cursive" },
  patrick: { label: "Patrick Hand", family: "'Patrick Hand', sans-serif" },
  fredoka: { label: "Fredoka", family: "'Fredoka', sans-serif" },
};

// ---- element refs ----
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const passwordInput = document.getElementById("password-input");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");
const logoutButton = document.getElementById("logout-button");

const primaryCard = document.getElementById("primary-countdown");
const primaryLabel = document.getElementById("primary-label");
const primaryTime = document.getElementById("primary-time");

const emptyState = document.getElementById("empty-state");
const listEl = document.getElementById("countdown-list");
const addButton = document.getElementById("add-button");

const editModal = document.getElementById("edit-modal");
const modalTitle = document.getElementById("modal-title");
const labelInput = document.getElementById("label-input");
const dateInput = document.getElementById("date-input");
const colorSwatchesEl = document.getElementById("color-swatches");
const textColorSwatchesEl = document.getElementById("text-color-swatches");
const fontOptionsEl = document.getElementById("font-options");
const opacityInput = document.getElementById("opacity-input");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const deleteButton = document.getElementById("delete-button");

let currentCountdowns = []; // [{id, label, targetDate, color, textColor, font, opacity}]
let editingId = null;
let selectedColor = DEFAULT_COLOR;
let selectedTextColor = DEFAULT_TEXT_COLOR;
let selectedFont = DEFAULT_FONT;
let unsubscribeSnapshot = null;

// ---- auth ----
loginButton.addEventListener("click", () => {
  const password = passwordInput.value;
  if (!password) return;
  loginError.classList.add("hidden");
  auth.signInWithEmailAndPassword(SHARED_EMAIL, password).catch((err) => {
    loginError.textContent = "Wrong password, try again.";
    loginError.classList.remove("hidden");
  });
});

passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginButton.click();
});

logoutButton.addEventListener("click", () => {
  auth.signOut();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    passwordInput.value = "";
    startListening();
  } else {
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
  }
});

// ---- firestore sync ----
function startListening() {
  unsubscribeSnapshot = db
    .collection("countdowns")
    .orderBy("targetDate", "asc")
    .onSnapshot((snapshot) => {
      currentCountdowns = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          label: data.label,
          targetDate: data.targetDate.toDate(),
          color: data.color || DEFAULT_COLOR,
          textColor: data.textColor || DEFAULT_TEXT_COLOR,
          font: data.font && FONTS[data.font] ? data.font : DEFAULT_FONT,
          opacity: data.opacity != null ? data.opacity : DEFAULT_OPACITY,
        };
      });
      renderAll();
    });
}

// ---- color helpers ----
function hexToRgba(hex, opacityPercent) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacityPercent / 100})`;
}

function applyTileStyle(el, item) {
  el.style.background = hexToRgba(item.color, item.opacity);
  el.style.color = item.textColor;
  el.style.fontFamily = FONTS[item.font].family;
}

// ---- rendering ----
function renderAll() {
  renderPrimary();
  renderList();
}

function renderPrimary() {
  const now = new Date();
  const upcoming = currentCountdowns.find((c) => c.targetDate.getTime() > now.getTime());
  if (!upcoming) {
    primaryCard.classList.add("hidden");
    return;
  }
  primaryCard.classList.remove("hidden");
  applyTileStyle(primaryCard, upcoming);
  primaryLabel.textContent = upcoming.label;
  primaryTime.textContent = formatDuration(upcoming.targetDate - now, true);
}

function renderList() {
  if (currentCountdowns.length === 0) {
    emptyState.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }
  emptyState.classList.add("hidden");

  const now = new Date();
  listEl.innerHTML = "";
  for (const item of currentCountdowns) {
    const diff = item.targetDate - now;
    const row = document.createElement("div");
    row.className = "countdown-item";
    applyTileStyle(row, item);
    row.innerHTML = `
      <div>
        <div class="item-label"></div>
        <div class="item-time ${diff <= 0 ? "today" : ""}"></div>
      </div>
    `;
    row.querySelector(".item-label").textContent = item.label;
    row.querySelector(".item-time").textContent =
      diff <= 0 ? "Today!" : formatDuration(diff, false);
    row.addEventListener("click", () => openEditModal(item));
    listEl.appendChild(row);
  }
}

function formatDuration(ms, includeSeconds) {
  if (ms <= 0) return "Today!";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, "0")}h`);
  parts.push(`${String(minutes).padStart(2, "0")}m`);
  if (includeSeconds) parts.push(`${String(seconds).padStart(2, "0")}s`);
  return parts.join(" ");
}

// tick every second so the primary display (and list) stay live
setInterval(renderAll, 1000);

// ---- add/edit modal ----
addButton.addEventListener("click", () => openEditModal(null));
cancelButton.addEventListener("click", closeEditModal);

function renderSwatchRow(container, palette, selected, onPick) {
  container.innerHTML = "";
  for (const color of palette) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch" + (color === selected ? " selected" : "");
    swatch.style.background = color;
    swatch.addEventListener("click", () => onPick(color));
    container.appendChild(swatch);
  }
}

function renderFontOptions() {
  fontOptionsEl.innerHTML = "";
  for (const [key, font] of Object.entries(FONTS)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "font-option" + (key === selectedFont ? " selected" : "");
    btn.style.fontFamily = font.family;
    btn.textContent = font.label;
    btn.addEventListener("click", () => {
      selectedFont = key;
      renderFontOptions();
    });
    fontOptionsEl.appendChild(btn);
  }
}

function renderPickers() {
  renderSwatchRow(colorSwatchesEl, COLOR_PALETTE, selectedColor, (color) => {
    selectedColor = color;
    renderPickers();
  });
  renderSwatchRow(textColorSwatchesEl, TEXT_COLOR_PALETTE, selectedTextColor, (color) => {
    selectedTextColor = color;
    renderPickers();
  });
  renderFontOptions();
}

function openEditModal(item) {
  editingId = item ? item.id : null;
  selectedColor = item ? item.color : DEFAULT_COLOR;
  selectedTextColor = item ? item.textColor : DEFAULT_TEXT_COLOR;
  selectedFont = item ? item.font : DEFAULT_FONT;
  opacityInput.value = item ? item.opacity : DEFAULT_OPACITY;
  modalTitle.textContent = item ? "Edit countdown" : "Add countdown";
  labelInput.value = item ? item.label : "";
  dateInput.value = item ? toDatetimeLocalValue(item.targetDate) : "";
  deleteButton.classList.toggle("hidden", !item);
  renderPickers();
  editModal.classList.remove("hidden");
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editingId = null;
}

saveButton.addEventListener("click", async () => {
  const label = labelInput.value.trim();
  const dateValue = dateInput.value;
  if (!label || !dateValue) return;

  const targetDate = new Date(dateValue);
  const data = {
    label,
    targetDate: firebase.firestore.Timestamp.fromDate(targetDate),
    color: selectedColor,
    textColor: selectedTextColor,
    font: selectedFont,
    opacity: Number(opacityInput.value),
  };

  if (editingId) {
    await db.collection("countdowns").doc(editingId).update(data);
  } else {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("countdowns").add(data);
  }
  closeEditModal();
});

deleteButton.addEventListener("click", async () => {
  if (!editingId) return;
  if (!confirm("Delete this countdown for both of you?")) return;
  await db.collection("countdowns").doc(editingId).delete();
  closeEditModal();
});

// ---- date helpers ----
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
