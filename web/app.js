firebase.initializeApp(window.FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

const SHARED_EMAIL = window.SHARED_AUTH_EMAIL;

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
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const deleteButton = document.getElementById("delete-button");

let currentCountdowns = []; // [{id, label, targetDate: Date}]
let editingId = null;
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
        };
      });
      renderAll();
    });
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

function openEditModal(item) {
  editingId = item ? item.id : null;
  modalTitle.textContent = item ? "Edit countdown" : "Add countdown";
  labelInput.value = item ? item.label : "";
  dateInput.value = item ? toDatetimeLocalValue(item.targetDate) : "";
  deleteButton.classList.toggle("hidden", !item);
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
