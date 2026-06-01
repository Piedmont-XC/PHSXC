// PHSXC My Workout Log v18
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrZU9YRCoi1giUkmyski0VrBzKpI1Tfrk--TYInwjK48yo7SCaT0I66mHbuW1Tc0Fp/exec";

const firstNameEl = document.getElementById("firstName");
const lastInitialEl = document.getElementById("lastInitial");
const selectedDateEl = document.getElementById("selectedDate");
const statusEl = document.getElementById("logStatus");
const resultsEl = document.getElementById("logResults");

let viewMode = "thisWeek";

function localISODate(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
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

function buildDisplayName(firstName, lastInitial) {
  const first = cleanFirstName(firstName);
  const initial = cleanLastInitial(lastInitial);
  return initial ? `${first} ${initial}.` : first;
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
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function init() {
  firstNameEl.value = getParam("firstName") || localStorage.getItem("phsxcFirstName") || "";
  lastInitialEl.value = getParam("lastInitial") || localStorage.getItem("phsxcLastInitial") || "";
  selectedDateEl.value = getParam("date") || localISODate();

  const requestedMode = getParam("mode");
  if (requestedMode) setViewMode(requestedMode);

  lastInitialEl.addEventListener("input", event => {
    event.target.value = cleanLastInitial(event.target.value);
  });

  document.querySelectorAll(".view-choice").forEach(btn => {
    btn.addEventListener("click", () => setViewMode(btn.dataset.mode));
  });

  document.getElementById("showLogBtn").addEventListener("click", loadLog);

  if (firstNameEl.value && lastInitialEl.value) {
    loadLog();
  }
}

function setViewMode(mode) {
  viewMode = mode || "thisWeek";
  document.querySelectorAll(".view-choice").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.mode === viewMode);
  });
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
      viewMode: payload.viewMode,
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
    viewMode,
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

  const summer = response.summerTotals || {};
  const period = response.periodTotals || {};

  document.getElementById("summerSummary").innerHTML =
    `${formatNumber(summer.minutes, 0)} min<br>${formatNumber(summer.miles, 2)} mi<br>${summer.entries || 0} entries`;

  document.getElementById("periodSummary").innerHTML =
    `${formatNumber(period.minutes, 0)} min<br>${formatNumber(period.miles, 2)} mi<br>${period.entries || 0} entries`;

  document.getElementById("strengthSummary").innerHTML =
    `${summer.strengthSessions || 0} summer sessions<br>${period.strengthSessions || 0} in selected view`;

  const entries = response.entries || [];
  document.getElementById("entriesHeading").textContent =
    entries.length ? `Entries (${entries.length})` : "Entries";

  const list = document.getElementById("entriesList");
  if (!entries.length) {
    list.innerHTML = `<p class="details">No entries found for this view.</p>`;
    return;
  }

  list.innerHTML = entries.map(entry => `
    <article class="entry-card">
      <h3>${escapeHTML(formatDisplayDate(entry.date))}</h3>
      <p class="entry-main">${formatNumber(entry.timeRun, 0)} min · ${formatNumber(entry.distanceRun, 2)} mi</p>
      <p class="entry-detail">Effort: ${escapeHTML(entry.effort || "")}/10 · Felt: ${escapeHTML(entry.feel || "")}</p>
      <p class="entry-detail">Strength: ${escapeHTML(entry.strength || "No")}${entry.entryType === "Additional" ? " · Additional Entry" : ""}</p>
      ${entry.exercises ? `<p class="entry-detail">Exercises: ${escapeHTML(entry.exercises)}</p>` : ""}
      ${entry.notes ? `<p class="entry-notes">${escapeHTML(entry.notes)}</p>` : ""}
    </article>
  `).join("");
}

init();
