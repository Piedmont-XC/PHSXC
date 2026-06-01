// PHSXC My Workout Log v24
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrZU9YRCoi1giUkmyski0VrBzKpI1Tfrk--TYInwjK48yo7SCaT0I66mHbuW1Tc0Fp/exec";

const firstNameEl = document.getElementById("firstName");
const lastInitialEl = document.getElementById("lastInitial");
const selectedDateEl = document.getElementById("selectedDate");
const statusEl = document.getElementById("logStatus");
const resultsEl = document.getElementById("logResults");

function localISODate(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function parseISODateAsLocal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftSelectedDate(days) {
  const base = selectedDateEl.value ? parseISODateAsLocal(selectedDateEl.value) : new Date();
  base.setDate(base.getDate() + days);
  selectedDateEl.value = localISODate(base);
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function cleanFirstName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cleanLastInitial(value) {
  return String(value || "").trim().replace(/[^a-zA-Z]/g, "").slice(0, 1).toUpperCase();
}

function formatNumber(value, digits = 1) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  if (Math.abs(num - Math.round(num)) < 0.001) return String(Math.round(num));
  return num.toFixed(digits);
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatDisplayDate(isoOrText) {
  if (!isoOrText) return "";
  const raw = String(isoOrText);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}


function updateLogWorkoutLink() {
  const link = document.getElementById("logWorkoutFromMyLogBtn");
  if (!link) return;

  const params = new URLSearchParams({
    date: selectedDateEl.value || localISODate(),
    firstName: cleanFirstName(firstNameEl.value),
    lastInitial: cleanLastInitial(lastInitialEl.value)
  });

  link.href = `log.html?${params.toString()}`;
}

function init() {
  firstNameEl.value = getParam("firstName") || localStorage.getItem("phsxcFirstName") || "";
  lastInitialEl.value = getParam("lastInitial") || localStorage.getItem("phsxcLastInitial") || "";
  selectedDateEl.value = getParam("date") || localISODate();

  firstNameEl.addEventListener("input", updateLogWorkoutLink);

  lastInitialEl.addEventListener("input", event => {
    event.target.value = cleanLastInitial(event.target.value);
    updateLogWorkoutLink();
  });

  document.getElementById("prevWeekBtn").addEventListener("click", () => {
    shiftSelectedDate(-7);
    updateLogWorkoutLink();
    loadLog();
  });

  document.getElementById("thisWeekBtn").addEventListener("click", () => {
    selectedDateEl.value = localISODate();
    updateLogWorkoutLink();
    loadLog();
  });

  document.getElementById("nextWeekBtn").addEventListener("click", () => {
    shiftSelectedDate(7);
    updateLogWorkoutLink();
    loadLog();
  });

  selectedDateEl.addEventListener("change", () => {
    updateLogWorkoutLink();
    loadLog();
  });
  document.getElementById("showLogBtn").addEventListener("click", loadLog);
  updateLogWorkoutLink();

  if (firstNameEl.value && lastInitialEl.value) {
    loadLog();
  }
}

function validate() {
  if (!cleanFirstName(firstNameEl.value)) {
    statusEl.textContent = "Please enter your first name.";
    statusEl.className = "form-status error";
    firstNameEl.focus();
    return false;
  }

  if (!cleanLastInitial(lastInitialEl.value)) {
    statusEl.textContent = "Please enter your last initial.";
    statusEl.className = "form-status error";
    lastInitialEl.focus();
    return false;
  }

  if (!selectedDateEl.value) {
    statusEl.textContent = "Please choose a date.";
    statusEl.className = "form-status error";
    selectedDateEl.focus();
    return false;
  }

  return true;
}

function loadViaJSONP(payload) {
  return new Promise((resolve, reject) => {
    const callback = `phsxcGetLogCallback_${Date.now()}`;
    const params = new URLSearchParams({
      action: "getLog",
      callback,
      firstName: payload.firstName,
      lastInitial: payload.lastInitial,
      selectedDate: payload.selectedDate,
      v: Date.now().toString()
    });

    const scriptUrl = `${GOOGLE_APPS_SCRIPT_URL}${GOOGLE_APPS_SCRIPT_URL.includes("?") ? "&" : "?"}${params.toString()}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out. Please try again."));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callback] = function(response) {
      cleanup();
      if (response && response.ok) resolve(response);
      else reject(new Error(response?.error || "Could not load workout log."));
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Could not load workout log. Check connection and try again."));
    };

    script.src = scriptUrl;
    document.body.appendChild(script);
  });
}

async function loadLog() {
  if (!validate()) return;

  const firstName = cleanFirstName(firstNameEl.value);
  const lastInitial = cleanLastInitial(lastInitialEl.value);

  localStorage.setItem("phsxcFirstName", firstName);
  localStorage.setItem("phsxcLastInitial", lastInitial);

  const payload = {
    firstName,
    lastInitial,
    selectedDate: selectedDateEl.value
  };

  statusEl.textContent = "Loading…";
  statusEl.className = "form-status";
  resultsEl.hidden = true;

  try {
    const response = await loadViaJSONP(payload);
    renderResults(response);
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = err.message || "Could not load workout log.";
    statusEl.className = "form-status error";
  }
}

function renderResults(response) {
  resultsEl.hidden = false;

  document.getElementById("resultsTitle").textContent = `${response.displayName}’s Workout Log`;
  document.getElementById("resultsSubtitle").textContent = response.periodLabel || "";

  const day = response.dayTotals || {};
  const week = response.weekTotals || {};
  const summer = response.summerTotals || {};

  document.getElementById("daySummary").innerHTML =
    `${formatNumber(day.minutes, 0)} min<br>${formatNumber(day.miles, 2)} mi<br>${day.entries || 0} entries`;

  document.getElementById("weekSummary").innerHTML =
    `${formatNumber(week.minutes, 0)} min<br>${formatNumber(week.miles, 2)} mi<br>${week.entries || 0} entries`;

  document.getElementById("summerSummary").innerHTML =
    `${formatNumber(summer.minutes, 0)} min<br>${formatNumber(summer.miles, 2)} mi<br>${summer.entries || 0} entries`;

  document.getElementById("strengthSummary").innerHTML =
    `${day.strengthSessions || 0} day · ${week.strengthSessions || 0} week · ${summer.strengthSessions || 0} summer`;

  const entries = response.weekEntries || [];
  document.getElementById("entriesHeading").textContent =
    entries.length ? `Entries This Week (${entries.length})` : "Entries This Week";

  const list = document.getElementById("entriesList");
  if (!entries.length) {
    list.innerHTML = `<p class="details">No entries found for this week.</p>`;
    return;
  }

  list.innerHTML = entries.map(entry => `
    <article class="entry-card ${entry.normalizedDate === response.selectedDate ? "selected-day-entry" : ""}">
      <h3>${escapeHTML(formatDisplayDate(entry.normalizedDate || entry.date))}</h3>
      <p class="entry-main">${formatNumber(entry.timeRun, 0)} min · ${formatNumber(entry.distanceRun, 2)} mi</p>
      <p class="entry-detail">Effort: ${escapeHTML(entry.effort || "")}/10 · Felt: ${escapeHTML(entry.feel || "")}</p>
      <p class="entry-detail">Strength: ${escapeHTML(entry.strength || "No")}${entry.entryType === "Additional" ? " · Additional Entry" : ""}</p>
      ${entry.exercises ? `<p class="entry-detail">Exercises: ${escapeHTML(entry.exercises)}</p>` : ""}
      ${entry.notes ? `<p class="entry-notes">${escapeHTML(entry.notes)}</p>` : ""}
    </article>
  `).join("");
}

init();
