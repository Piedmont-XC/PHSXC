// PHSXC Summer Training App
// To connect to Google Sheets later:
// 1) Publish the Master Plan sheet as CSV
// 2) Paste the CSV URL below
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUg51aK138hdtFP3yhbhM28d9Rhp2XKqjtDp9jpX-DCoH6XjIkANfpnP01BDHI6w/pub?gid=19411364&single=true&output=csv";

// Fallback sample data so the site works immediately.
// Replace or connect to Google Sheets for the full summer plan.
const fallbackWorkouts = [
  {
    Date: "2026-06-01",
    Sophomore: "30 min easy + mobility",
    Junior: "35 min easy + mobility",
    Senior: "40–45 min easy + mobility",
    Notes: "Start relaxed. This is not a fitness test."
  },
  {
    Date: "2026-06-02",
    Sophomore: "30 min easy + Open Gym A",
    Junior: "35–40 min easy + Open Gym A",
    Senior: "40–45 min easy + Open Gym A",
    Notes: "Keep the run conversational. Lift with perfect form."
  },
  {
    Date: "2026-06-03",
    Sophomore: "40 min brisk walk",
    Junior: "45–50 min brisk walk",
    Senior: "45 min easy",
    Notes: "Sophomores and juniors: purposeful walk, tall posture, quick arms."
  },
  {
    Date: "2026-06-04",
    Sophomore: "30–35 min easy + 4 relaxed strides",
    Junior: "40 min easy + 4 relaxed strides",
    Senior: "AM 35 min easy / PM 20 min easy",
    Notes: "Strides are smooth and fast-relaxed, not sprinting."
  },
  {
    Date: "2026-06-05",
    Sophomore: "25–30 min easy + Open Gym B",
    Junior: "35 min easy + Open Gym B",
    Senior: "40 min easy + Open Gym B",
    Notes: "No max lifting. Stop sets before form breaks."
  },
  {
    Date: "2026-06-06",
    Sophomore: "40–45 min easy",
    Junior: "50–55 min easy",
    Senior: "60 min easy",
    Notes: "Easy long aerobic day. Finish feeling controlled."
  },
  {
    Date: "2026-06-07",
    Sophomore: "Off or 20–30 min walk",
    Junior: "Off or 20–30 min walk",
    Senior: "Off or 25–30 min walk",
    Notes: "Recovery is training."
  }
];

let workouts = fallbackWorkouts;
let selectedGroup = localStorage.getItem("phsxcGroup") || "Sophomore";

const datePicker = document.getElementById("datePicker");
const todayLabel = document.getElementById("todayLabel");
const groupTitle = document.getElementById("groupTitle");
const workoutBody = document.getElementById("workoutBody");

function localISODate(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function findWorkout(iso) {
  return workouts.find(row => row.Date === iso);
}

function render() {
  const iso = datePicker.value || localISODate();
  const row = findWorkout(iso);

  groupTitle.textContent = selectedGroup;
  todayLabel.textContent = formatDate(iso);

  document.querySelectorAll(".group-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.group === selectedGroup);
  });

  if (!row) {
    workoutBody.innerHTML = `
      <p class="main">No workout found for this date.</p>
      <p class="details">Check the date or update the Google Sheet data.</p>
    `;
    return;
  }

  const workout = row[selectedGroup] || "No workout entered.";
  const notes = row.Notes || "";

  workoutBody.innerHTML = `
    <p class="main">${escapeHTML(workout)}</p>
    <p class="details">${escapeHTML(notes)}</p>
  `;
}

function shiftDay(days) {
  const current = datePicker.value ? new Date(datePicker.value + "T00:00:00") : new Date();
  current.setDate(current.getDate() + days);
  datePicker.value = localISODate(current);
  render();
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function parseCSV(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (value || current.length) {
        current.push(value);
        rows.push(current);
        current = [];
        value = "";
      }
      if (char === "\r" && next === "\n") i++;
    } else {
      value += char;
    }
  }

  if (value || current.length) {
    current.push(value);
    rows.push(current);
  }

  const headers = rows.shift();
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (row[i] || "").trim());
    return obj;
  });
}

async function loadSheetData() {
  if (!GOOGLE_SHEET_CSV_URL) return;

  try {
    const res = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!res.ok) throw new Error("CSV fetch failed");
    const text = await res.text();
    const parsed = parseCSV(text);
    if (parsed.length) workouts = parsed;
  } catch (err) {
    console.warn("Using fallback data because Google Sheet could not be loaded.", err);
  }
}

document.querySelectorAll(".group-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedGroup = btn.dataset.group;
    localStorage.setItem("phsxcGroup", selectedGroup);
    render();
  });
});

document.getElementById("prevDay").addEventListener("click", () => shiftDay(-1));
document.getElementById("nextDay").addEventListener("click", () => shiftDay(1));
document.getElementById("todayBtn").addEventListener("click", () => {
  datePicker.value = localISODate();
  render();
});
datePicker.addEventListener("change", render);

document.querySelectorAll(".accordion").forEach(button => {
  button.addEventListener("click", () => {
    button.nextElementSibling.classList.toggle("open");
  });
});

);
}

datePicker.value = localISODate(new Date("2026-06-01T12:00:00"));
loadSheetData().then(render);


// Temporarily unregister old service workers so GitHub updates display immediately.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}
