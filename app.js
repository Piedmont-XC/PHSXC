// PHSXC Summer Training App v9
// Google Sheet loader with better Google Visualization JSONP URL format + visible diagnostics.
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUg51aK138hdtFP3yhbhM28d9Rhp2XKqjtDp9jpX-DCoH6XjIkANfpnP01BDHI6w/pub?gid=19411364&single=true&output=csv";

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
let dataSourceLabel = GOOGLE_SHEET_CSV_URL ? "Google Sheet loading…" : "sample data";
let loadDiagnostic = "";

const datePicker = document.getElementById("datePicker");
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

function findWorkout(iso) {
  return workouts.find(row => normalizeDate(row.Date) === iso);
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function render() {
  if (!datePicker || !todayLabel || !groupTitle || !workoutBody) return;

  const iso = datePicker.value || chooseInitialDate();
  datePicker.value = iso;

  const row = findWorkout(iso);
  groupTitle.textContent = selectedGroup;
  todayLabel.textContent = formatDate(iso);

  document.querySelectorAll(".group-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.group === selectedGroup);
  });

  if (!row) {
    const firstDate = workouts.length ? normalizeDate(workouts[0].Date) : "unknown";
    const lastDate = workouts.length ? normalizeDate(workouts[workouts.length - 1].Date) : "unknown";
    workoutBody.innerHTML = `
      <p class="main">No workout found for ${escapeHTML(formatDate(iso))}.</p>
      <p class="details">
        Data source: ${escapeHTML(dataSourceLabel)}.<br>
        Available workout dates: ${escapeHTML(firstDate)} through ${escapeHTML(lastDate)}.<br>
        ${loadDiagnostic ? `<br><strong>Diagnostic:</strong> ${escapeHTML(loadDiagnostic)}` : ""}
      </p>
    `;
    return;
  }

  const workout = row[selectedGroup] || "No workout entered for this group.";
  const notes = row.Notes || "";

  workoutBody.innerHTML = `
    <p class="main">${escapeHTML(workout)}</p>
    <p class="details">${escapeHTML(notes)}</p>
    <p class="data-source">Source: ${escapeHTML(dataSourceLabel)}</p>
    ${loadDiagnostic ? `<p class="data-source">Diagnostic: ${escapeHTML(loadDiagnostic)}</p>` : ""}
  `;
}

function chooseInitialDate() {
  const today = localISODate();
  const first = workouts.length ? normalizeDate(workouts[0].Date) : "2026-06-01";
  const last = workouts.length ? normalizeDate(workouts[workouts.length - 1].Date) : first;
  if (today >= first && today <= last) return today;
  return first;
}

function shiftDay(days) {
  const current = parseISODateAsLocal(datePicker.value || chooseInitialDate());
  current.setDate(current.getDate() + days);
  datePicker.value = localISODate(current);
  render();
}

function rowsToObjects(headers, rows) {
  return rows
    .filter(row => row.some(cell => String(cell || "").trim() !== ""))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const normalized = normalizeHeader(h);
        let key = h || `Column${i + 1}`;

        if (normalized === "date") key = "Date";
        if (normalized === "sophomore" || normalized === "sophomores") key = "Sophomore";
        if (normalized === "junior" || normalized === "juniors") key = "Junior";
        if (normalized === "senior" || normalized === "seniors") key = "Senior";
        if (normalized === "notes" || normalized === "coachnotes" || normalized === "note") key = "Notes";

        obj[key] = String(row[i] ?? "").trim();
      });
      obj.Date = normalizeDate(obj.Date);
      return obj;
    });
}

function getPublishedSheetParts(url) {
  const u = new URL(url);
  const gid = u.searchParams.get("gid") || "0";
  const match = u.href.match(/\/spreadsheets\/d\/e\/([^/]+)/);
  if (!match) throw new Error("Could not find published sheet id after /d/e/");
  const id = match[1];
  return { id, gid };
}

function loadGoogleSheetViaJSONP(url) {
  return new Promise((resolve, reject) => {
    let parts;
    try {
      parts = getPublishedSheetParts(url);
    } catch (err) {
      reject(err);
      return;
    }

    const callback = `phsxcSheetCallback_${Date.now()}`;
    const gvizUrl =
      `https://docs.google.com/spreadsheets/d/e/${parts.id}/gviz/tq` +
      `?gid=${encodeURIComponent(parts.gid)}` +
      `&headers=1` +
      `&tq=${encodeURIComponent("select *")}` +
      `&tqx=${encodeURIComponent(`out:json;responseHandler:${callback}`)}`;

    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheet JSONP timed out. URL tried: " + gvizUrl));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callback] = function(response) {
      try {
        if (response.status === "error") {
          throw new Error(response.errors?.map(e => e.detailed_message || e.message).join("; ") || "Google returned error");
        }

        const table = response.table;
        const headers = table.cols.map(col => col.label || col.id || "");
        const rows = table.rows.map(row =>
          row.c.map(cell => {
            if (!cell) return "";
            if (cell.f) return cell.f;
            if (cell.v === null || cell.v === undefined) return "";
            return String(cell.v);
          })
        );

        const parsed = rowsToObjects(headers, rows);
        cleanup();
        loadDiagnostic = `Loaded ${parsed.length} rows from Google Sheet.`;
        resolve(parsed);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Google Sheet JSONP script failed to load. URL tried: " + gvizUrl));
    };

    script.src = gvizUrl;
    document.body.appendChild(script);
  });
}

async function loadSheetData() {
  if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL.includes("...")) {
    dataSourceLabel = "sample data — Google Sheet URL not connected yet";
    workouts = FALLBACK_WORKOUTS;
    return;
  }

  try {
    const parsed = await loadGoogleSheetViaJSONP(GOOGLE_SHEET_CSV_URL);

    if (!parsed.length) throw new Error("Sheet returned no workout rows");
    if (!parsed[0].Date) throw new Error("Sheet missing Date column. Headers found may not be in row 1.");

    workouts = parsed;
    dataSourceLabel = "Google Sheet";
  } catch (err) {
    console.error("Google Sheet load failed:", err);
    loadDiagnostic = err.message || String(err);
    dataSourceLabel = "sample data — Google Sheet could not be loaded";
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
