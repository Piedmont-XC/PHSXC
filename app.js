// PHSXC Summer Training App v18
// Google Sheet is loaded through a Google Apps Script web app bridge.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrZU9YRCoi1giUkmyski0VrBzKpI1Tfrk--TYInwjK48yo7SCaT0I66mHbuW1Tc0Fp/exec";

const FALLBACK_WORKOUTS = [
  { Date: "2026-06-01", Sophomore: "30 min easy + mobility", Junior: "35 min easy + mobility", Senior: "40–45 min easy + mobility", Notes: "Start relaxed. This is not a fitness test." },
  { Date: "2026-06-02", Sophomore: "30 min easy + Open Gym A", Junior: "35–40 min easy + Open Gym A", Senior: "40–45 min easy + Open Gym A", Notes: "Keep the run conversational. Lift with perfect form." },
  { Date: "2026-06-03", Sophomore: "40 min brisk walk", Junior: "45–50 min brisk walk", Senior: "45 min easy", Notes: "Sophomores and juniors: purposeful walk, tall posture, quick arms." },
  { Date: "2026-06-04", Sophomore: "30–35 min easy + 4 relaxed strides", Junior: "40 min easy + 4 relaxed strides", Senior: "AM 35 min easy / PM 20 min easy", Notes: "Strides are smooth and fast-relaxed, not sprinting." },
  { Date: "2026-06-05", Sophomore: "25–30 min easy + Open Gym B", Junior: "35 min easy + Open Gym B", Senior: "40 min easy + Open Gym B", Notes: "No max lifting. Stop sets before form breaks." },
  { Date: "2026-06-06", Sophomore: "40–45 min easy", Junior: "50–55 min easy", Senior: "60 min easy", Notes: "Easy long aerobic day. Finish feeling controlled." },
  { Date: "2026-06-07", Sophomore: "Off or 20–30 min walk", Junior: "Off or 20–30 min walk", Senior: "Off or 25–30 min walk", Notes: "Recovery is training." }
];

let workouts = FALLBACK_WORKOUTS;
let selectedGroup = localStorage.getItem("phsxcGroup") || "Sophomore";
let dataSourceLabel = GOOGLE_APPS_SCRIPT_URL ? "Google Sheet loading…" : "sample data";
let loadDiagnostic = "";

const datePicker = document.getElementById("datePicker");
const weekdayLabel = document.getElementById("weekdayLabel");
const todayLabel = document.getElementById("todayLabel");
const groupTitle = document.getElementById("groupTitle");
const workoutBody = document.getElementById("workoutBody");

function localISODate(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function parseISODateAsLocal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso) {
  if (!iso) return "";
  const date = parseISODateAsLocal(iso);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}


function formatWeekday(iso) {
  if (!iso) return "";
  const date = parseISODateAsLocal(iso);
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function normalizeHeader(header) {
  return String(header || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return localISODate(value);

  const raw = String(value || "").trim();
  if (!raw) return "";

  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }

  m = raw.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (m) {
    const y = Number(m[1]);
    const month = Number(m[2]) + 1;
    const day = Number(m[3]);
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return localISODate(parsed);

  return raw;
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

function findWorkout(iso) {
  return workouts.find(row => normalizeDate(row.Date) === iso);
}

function chooseInitialDate() {
  // Always use the device's real current date.
  // If there is no workout for that date, render() will show "No workout found"
  // instead of jumping back to the first day of the summer plan.
  return localISODate();
}



function updateMyLogLink() {
  const link = document.getElementById("showMyLogLink");
  if (!link) return;

  const params = new URLSearchParams({
    group: selectedGroup
  });

  link.href = `my-log.html?${params.toString()}`;
}

function updateLogLink(iso, row) {
  const link = document.getElementById("logWorkoutLink");
  if (!link) return;

  const plannedWorkout = row ? (row[selectedGroup] || "") : "";
  const params = new URLSearchParams({
    date: iso || chooseInitialDate(),
    group: selectedGroup,
    planned: plannedWorkout
  });

  link.href = `log.html?${params.toString()}`;
}

function render() {
  if (!datePicker || !todayLabel || !groupTitle || !workoutBody) return;

  const iso = datePicker.value || chooseInitialDate();
  datePicker.value = iso;

  const row = findWorkout(iso);
  updateLogLink(iso, row);
  updateMyLogLink();
  groupTitle.textContent = selectedGroup;
  todayLabel.textContent = formatDate(iso);
  if (weekdayLabel) weekdayLabel.textContent = formatWeekday(iso);

  document.querySelectorAll(".group-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.group === selectedGroup);
  });

  if (!row) {
    workoutBody.innerHTML = `
      <p class="main">No workout found for ${escapeHTML(formatDate(iso))}.</p>
      <p class="details">Check the Google Sheet to make sure there is a workout row for this date.</p>
    `;
    return;
  }

  const workout = row[selectedGroup] || "No workout entered for this group.";
  const notes = row.Notes || row["Coach Notes"] || "";

  workoutBody.innerHTML = `
    <p class="main">${escapeHTML(workout)}</p>
    <p class="details">${escapeHTML(notes)}</p>
  `;
}

function shiftDay(days) {
  const current = parseISODateAsLocal(datePicker.value || chooseInitialDate());
  current.setDate(current.getDate() + days);
  datePicker.value = localISODate(current);
  render();
}

function normalizeWorkoutRow(row) {
  const normalized = {
    Date: row.Date || row.date || "",
    Sophomore: row.Sophomore || row.Sophomores || row.sophomore || "",
    Junior: row.Junior || row.Juniors || row.junior || "",
    Senior: row.Senior || row.Seniors || row.senior || "",
    Notes: row.Notes || row["Coach Notes"] || row.Note || row.notes || ""
  };

  // Preserve extra useful fields for future use.
  Object.keys(row).forEach(key => {
    if (!(key in normalized)) normalized[key] = row[key];
  });

  normalized.Date = normalizeDate(normalized.Date);
  return normalized;
}

function loadAppsScriptViaJSONP(url) {
  return new Promise((resolve, reject) => {
    const callback = `phsxcCallback_${Date.now()}`;
    const joinChar = url.includes("?") ? "&" : "?";
    const scriptUrl = `${url}${joinChar}callback=${encodeURIComponent(callback)}&v=${Date.now()}`;

    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Apps Script timed out. URL tried: " + scriptUrl));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callback] = function(response) {
      try {
        if (response && response.error) {
          throw new Error(response.error);
        }

        const rows = Array.isArray(response) ? response : response.rows;
        if (!Array.isArray(rows)) {
          throw new Error("Apps Script did not return an array of workout rows.");
        }

        const parsed = rows
          .map(normalizeWorkoutRow)
          .filter(row => row.Date || row.Sophomore || row.Junior || row.Senior);

        cleanup();
        resolve(parsed);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Apps Script JSONP script failed to load. URL tried: " + scriptUrl));
    };

    script.src = scriptUrl;
    document.body.appendChild(script);
  });
}

async function loadSheetData() {
  if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.includes("...")) {
    dataSourceLabel = "sample data — Apps Script URL not connected yet";
    workouts = FALLBACK_WORKOUTS;
    return;
  }

  try {
    const parsed = await loadAppsScriptViaJSONP(GOOGLE_APPS_SCRIPT_URL);

    if (!parsed.length) throw new Error("Apps Script returned no workout rows");
    if (!parsed[0].Date) throw new Error("Apps Script rows are missing Date values");

    workouts = parsed;
    dataSourceLabel = "Google Sheet via Apps Script";
    loadDiagnostic = `Loaded ${parsed.length} rows.`;
  } catch (err) {
    console.error("Apps Script load failed:", err);
    loadDiagnostic = err.message || String(err);
    dataSourceLabel = "sample data — Apps Script could not be loaded";
    workouts = FALLBACK_WORKOUTS;
  }
}

function wireEvents() {
  document.querySelectorAll(".group-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedGroup = btn.dataset.group;
      localStorage.setItem("phsxcGroup", selectedGroup);
      render();
    });
  });

  document.getElementById("prevDay")?.addEventListener("click", () => shiftDay(-1));
  document.getElementById("nextDay")?.addEventListener("click", () => shiftDay(1));
  document.getElementById("todayBtn")?.addEventListener("click", () => {
    datePicker.value = chooseInitialDate();
    render();
  });

  datePicker?.addEventListener("change", render);

  document.querySelectorAll(".accordion").forEach(button => {
    button.addEventListener("click", () => {
      button.nextElementSibling.classList.toggle("open");
    });
  });
}

async function init() {
  wireEvents();
  await loadSheetData();
  datePicker.value = chooseInitialDate();
  render();

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      registrations.forEach(registration => registration.unregister());
      const keys = await caches.keys();
      keys.forEach(key => caches.delete(key));
    } catch (err) {
      console.warn("Cache cleanup skipped.", err);
    }
  }
}

init();
