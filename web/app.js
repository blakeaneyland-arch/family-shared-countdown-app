firebase.initializeApp(window.FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

const SHARED_EMAIL = window.SHARED_AUTH_EMAIL;

const DEFAULT_COLOR = "#e2b33c";
const DEFAULT_TEXT_COLOR = "#f4f3f7";
const DEFAULT_FONT = "caveat";
const DEFAULT_OPACITY = 30;
const DEFAULT_FONT_SCALE = 1;
const DEFAULT_PRIMARY_SCALE = 1;
const DEVICE_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const COLOR_PALETTE = ["#e2b33c", "#9b3a3a", "#3b5a8a", "#4a7a4f", "#c97a3d", "#3a8a82"];
const TEXT_COLOR_PALETTE = ["#f4f3f7", "#1b1f2a", "#e2b33c", "#ff7a9e"];
const FONTS = {
  caveat: { label: "Caveat", family: "'Caveat', cursive" },
  patrick: { label: "Patrick Hand", family: "'Patrick Hand', sans-serif" },
  fredoka: { label: "Fredoka", family: "'Fredoka', sans-serif" },
  shadows: { label: "Shadows", family: "'Shadows Into Light', cursive" },
  marker: { label: "Marker", family: "'Permanent Marker', cursive" },
  pacifico: { label: "Pacifico", family: "'Pacifico', cursive" },
  indie: { label: "Indie Flower", family: "'Indie Flower', cursive" },
  baloo: { label: "Baloo", family: "'Baloo 2', sans-serif" },
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
const timezoneInput = document.getElementById("timezone-input");
const colorSwatchesEl = document.getElementById("color-swatches");
const textColorSwatchesEl = document.getElementById("text-color-swatches");
const fontOptionsEl = document.getElementById("font-options");
const opacityInput = document.getElementById("opacity-input");
const scaleInput = document.getElementById("scale-input");
const primaryScaleInput = document.getElementById("primary-scale-input");
const primaryToggleButton = document.getElementById("primary-toggle-button");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const deleteButton = document.getElementById("delete-button");

// [{id, label, targetDate, color, textColor, font, opacity, fontScale, primaryScale, isPrimary}]
let currentCountdowns = [];
let currentPrimaryItem = null;
let editingId = null;
let selectedColor = DEFAULT_COLOR;
let selectedTextColor = DEFAULT_TEXT_COLOR;
let selectedFont = DEFAULT_FONT;
let selectedIsPrimary = false;
let unsubscribeSnapshot = null;

// ---- timezone list (populated once; device's own zone is the default) ----
for (const tz of Intl.supportedValuesOf("timeZone")) {
  const option = document.createElement("option");
  option.value = tz;
  option.textContent = tz.replace(/_/g, " ");
  timezoneInput.appendChild(option);
}

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
    stopCelebration();
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
          fontScale: data.fontScale || DEFAULT_FONT_SCALE,
          primaryScale: data.primaryScale || DEFAULT_PRIMARY_SCALE,
          isPrimary: !!data.isPrimary,
          timezone: data.timezone || DEVICE_TIMEZONE,
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
  el.style.setProperty("--tile-scale", item.fontScale);
}

// ---- rendering ----
function renderAll() {
  renderPrimary();
  renderList();
}

function renderPrimary() {
  const now = new Date();
  currentPrimaryItem =
    currentCountdowns.find((c) => c.isPrimary) ||
    currentCountdowns.find((c) => c.targetDate.getTime() > now.getTime()) ||
    null;

  if (!currentPrimaryItem) {
    primaryCard.classList.add("hidden");
    stopCelebration();
    return;
  }
  primaryCard.classList.remove("hidden");
  applyTileStyle(primaryCard, currentPrimaryItem);
  primaryCard.style.setProperty("--primary-scale", currentPrimaryItem.primaryScale);
  primaryLabel.textContent = currentPrimaryItem.label;

  const diff = currentPrimaryItem.targetDate - now;
  primaryTime.textContent = formatDuration(diff, true);

  if (diff <= 0) {
    startCelebration();
  } else {
    stopCelebration();
  }
}

// ---- celebration: fires while the featured countdown is at/past zero,
// stops as soon as it's deleted, re-dated to the future, or swapped out. ----
let celebrating = false;
let celebrationInterval = null;

function fireworksBurst() {
  confetti({
    particleCount: 70,
    angle: 60 + Math.random() * 60,
    spread: 60 + Math.random() * 20,
    startVelocity: 45,
    origin: { x: 0.1 + Math.random() * 0.8, y: 0.7 },
  });
}

function startCelebration() {
  if (celebrating) return;
  celebrating = true;
  fireworksBurst();
  celebrationInterval = setInterval(fireworksBurst, 3500);
}

function stopCelebration() {
  if (!celebrating) return;
  celebrating = false;
  clearInterval(celebrationInterval);
  celebrationInterval = null;
}

primaryCard.addEventListener("click", () => {
  if (currentPrimaryItem) openEditModal(currentPrimaryItem);
});

function renderList() {
  const rest = currentCountdowns.filter((c) => !currentPrimaryItem || c.id !== currentPrimaryItem.id);

  if (rest.length === 0) {
    emptyState.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }
  emptyState.classList.add("hidden");

  const now = new Date();
  listEl.innerHTML = "";
  for (const item of rest) {
    const diff = item.targetDate - now;
    const row = document.createElement("div");
    row.className = "countdown-item";
    applyTileStyle(row, item);
    row.innerHTML = `
      <div class="item-label"></div>
      <div class="item-time ${diff <= 0 ? "today" : ""}"></div>
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
  const totalDays = Math.floor(totalSeconds / 86400);
  const years = Math.floor(totalDays / 365);
  const days = totalDays - years * 365;
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (years > 0 || days > 0) parts.push(`${days}d`);
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

function renderPrimaryToggle() {
  primaryToggleButton.classList.toggle("selected", selectedIsPrimary);
}

primaryToggleButton.addEventListener("click", () => {
  selectedIsPrimary = !selectedIsPrimary;
  renderPrimaryToggle();
});

function openEditModal(item) {
  editingId = item ? item.id : null;
  selectedColor = item ? item.color : DEFAULT_COLOR;
  selectedTextColor = item ? item.textColor : DEFAULT_TEXT_COLOR;
  selectedFont = item ? item.font : DEFAULT_FONT;
  selectedIsPrimary = item ? item.isPrimary : false;
  opacityInput.value = item ? item.opacity : DEFAULT_OPACITY;
  scaleInput.value = item ? item.fontScale : DEFAULT_FONT_SCALE;
  primaryScaleInput.value = item ? item.primaryScale : DEFAULT_PRIMARY_SCALE;
  modalTitle.textContent = item ? "Edit countdown" : "Add countdown";
  labelInput.value = item ? item.label : "";
  timezoneInput.value = item ? item.timezone : DEVICE_TIMEZONE;
  dateInput.value = item ? utcToZonedDateTimeLocalValue(item.targetDate, item.timezone) : "";
  deleteButton.classList.toggle("hidden", !item);
  renderPickers();
  renderPrimaryToggle();
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

  const targetDate = zonedDateTimeToUTC(dateValue, timezoneInput.value);
  const data = {
    label,
    targetDate: firebase.firestore.Timestamp.fromDate(targetDate),
    color: selectedColor,
    textColor: selectedTextColor,
    font: selectedFont,
    opacity: Number(opacityInput.value),
    fontScale: Number(scaleInput.value),
    primaryScale: Number(primaryScaleInput.value),
    isPrimary: selectedIsPrimary,
    timezone: timezoneInput.value,
  };

  const batch = db.batch();

  // Only one countdown can be primary at a time -- clear it from any other doc.
  if (selectedIsPrimary) {
    for (const other of currentCountdowns) {
      if (other.isPrimary && other.id !== editingId) {
        batch.update(db.collection("countdowns").doc(other.id), { isPrimary: false });
      }
    }
  }

  if (editingId) {
    batch.update(db.collection("countdowns").doc(editingId), data);
  } else {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    batch.set(db.collection("countdowns").doc(), data);
  }

  await batch.commit();
  closeEditModal();
});

deleteButton.addEventListener("click", async () => {
  if (!editingId) return;
  if (!confirm("Delete this countdown for both of you?")) return;
  await db.collection("countdowns").doc(editingId).delete();
  closeEditModal();
});

// ---- timezone-aware date helpers ----
// Converts a <input type="datetime-local"> value, interpreted as wall-clock
// time IN THE GIVEN ZONE (not the browser's own zone), into the correct UTC
// instant. There's no built-in JS API for this, so: treat the entered
// components as if they were UTC (a "naive" guess), look up what offset the
// real zone actually has at that moment, then shift by that offset.
function zonedDateTimeToUTC(dateTimeLocalValue, timeZone) {
  const [datePart, timePart] = dateTimeLocalValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);

  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(naiveUtcMs))
    .find((p) => p.type === "timeZoneName").value;

  const match = offsetPart.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
  let offsetMinutes = 0;
  if (match) {
    const hoursOffset = parseInt(match[1], 10);
    const mins = match[2] ? parseInt(match[2], 10) : 0;
    offsetMinutes = hoursOffset * 60 + (hoursOffset < 0 ? -mins : mins);
  }

  return new Date(naiveUtcMs - offsetMinutes * 60000);
}

// The reverse: given a UTC instant, what does the wall-clock time read as
// in the given zone (for populating the edit form with what was originally entered).
function utcToZonedDateTimeLocalValue(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
