// PHSXC Summer Team Board v29
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrZU9YRCoi1giUkmyski0VrBzKpI1Tfrk--TYInwjK48yo7SCaT0I66mHbuW1Tc0Fp/exec";

const statusEl = document.getElementById("leaderboardStatus");
const resultsEl = document.getElementById("leaderboardResults");
const listEl = document.getElementById("leaderboardList");

let currentSort = "minutes";
let boardData = [];

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

function loadViaJSONP() {
  return new Promise((resolve, reject) => {
    const callback = `phsxcLeaderboardCallback_${Date.now()}`;
    const params = new URLSearchParams({
      action: "getLeaderboard",
      callback,
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
      else reject(new Error(response?.error || "Could not load the team board."));
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Could not load the team board. Check connection and try again."));
    };

    script.src = scriptUrl;
    document.body.appendChild(script);
  });
}

function sortBoard(data) {
  const keyMap = {
    minutes: "minutes",
    miles: "miles",
    gymDays: "gymDays",
    loggedDays: "loggedDays"
  };
  const key = keyMap[currentSort] || "minutes";

  return [...data].sort((a, b) => {
    const primary = Number(b[key] || 0) - Number(a[key] || 0);
    if (primary !== 0) return primary;
    return String(a.displayName || "").localeCompare(String(b.displayName || ""));
  });
}

function renderBoard(response) {
  boardData = response.runners || [];
  const sorted = sortBoard(boardData);
  const team = response.teamTotals || {};

  resultsEl.hidden = false;
  document.getElementById("leaderboardSubtitle").textContent =
    `Showing ${sorted.length} runner${sorted.length === 1 ? "" : "s"} with submitted workout logs.`;

  document.getElementById("teamRunnersSummary").innerHTML = `${sorted.length}`;
  document.getElementById("teamMinutesSummary").innerHTML = `${formatNumber(team.minutes, 0)} min`;
  document.getElementById("teamMilesSummary").innerHTML = `${formatNumber(team.miles, 2)} mi`;

  if (!sorted.length) {
    listEl.innerHTML = `<p class="details">No workout logs have been submitted yet.</p>`;
    return;
  }

  listEl.innerHTML = sorted.map((runner, index) => `
    <article class="leaderboard-row-card">
      <div class="rank-badge">${index + 1}</div>
      <div class="leaderboard-runner">
        <h3>${escapeHTML(runner.displayName || "Runner")}</h3>
        <p>${runner.entries || 0} entries · ${runner.loggedDays || 0} logged days</p>
      </div>
      <div class="leaderboard-stats">
        <div><strong>${formatNumber(runner.minutes, 0)}</strong><span>min</span></div>
        <div><strong>${formatNumber(runner.miles, 2)}</strong><span>mi</span></div>
        <div><strong>${runner.gymDays || 0}</strong><span>gym days</span></div>
      </div>
    </article>
  `).join("");
}

async function loadBoard() {
  statusEl.textContent = "Loading team board…";
  statusEl.className = "form-status";
  resultsEl.hidden = true;

  try {
    const response = await loadViaJSONP();
    renderBoard(response);
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = err.message || "Could not load the team board.";
    statusEl.className = "form-status error";
  }
}

function wireSortButtons() {
  document.querySelectorAll(".sort-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      currentSort = btn.dataset.sort;
      document.querySelectorAll(".sort-choice").forEach(b => b.classList.toggle("selected", b === btn));
      if (boardData.length) renderBoard({ ok: true, runners: boardData, teamTotals: calculateTeamTotals(boardData) });
    });
  });
}

function calculateTeamTotals(runners) {
  return runners.reduce((totals, runner) => {
    totals.minutes += Number(runner.minutes || 0);
    totals.miles += Number(runner.miles || 0);
    totals.entries += Number(runner.entries || 0);
    totals.gymDays += Number(runner.gymDays || 0);
    return totals;
  }, { minutes: 0, miles: 0, entries: 0, gymDays: 0 });
}

document.getElementById("refreshBoardBtn").addEventListener("click", loadBoard);
wireSortButtons();
loadBoard();
