// PHSXC Workout Log v19
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrZU9YRCoi1giUkmyski0VrBzKpI1Tfrk--TYInwjK48yo7SCaT0I66mHbuW1Tc0Fp/exec";

const form = document.getElementById("workoutLogForm");
const statusEl = document.getElementById("formStatus");
const exerciseSection = document.getElementById("exerciseSection");
const duplicateCard = document.getElementById("duplicateCard");
const confirmationCard = document.getElementById("confirmationCard");
let pendingPayload = null;

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

function setChoice(groupSelector, hiddenInputId, value) {
  const hidden = document.getElementById(hiddenInputId);
  if (!hidden) return;
  hidden.value = value || "";
  document.querySelectorAll(groupSelector).forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.value === value);
  });
}

function getSelectedExercises() {
  return Array.from(document.querySelectorAll(".exercise-choice.selected")).map(btn => btn.dataset.value);
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

function initForm() {
  document.getElementById("firstName").value = localStorage.getItem("phsxcFirstName") || "";
  document.getElementById("lastInitial").value = localStorage.getItem("phsxcLastInitial") || "";
  document.getElementById("logDate").value = getParam("date") || localISODate();
  setChoice(".group-choice", "groupValue", getParam("group") || localStorage.getItem("phsxcGroup") || "Sophomore");

  const planned = getParam("planned");
  if (planned) {
    document.getElementById("plannedWorkoutBox").hidden = false;
    document.getElementById("plannedWorkoutText").textContent = planned;
  }

  setChoice(".strength-choice", "strengthValue", "");
}

function attachChoiceHandlers() {
  document.getElementById("lastInitial")?.addEventListener("input", event => {
    event.target.value = cleanLastInitial(event.target.value);
  });

  document.querySelectorAll(".group-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      setChoice(".group-choice", "groupValue", btn.dataset.value);
      localStorage.setItem("phsxcGroup", btn.dataset.value);
    });
  });

  document.querySelectorAll(".effort-choice").forEach(btn => {
    btn.addEventListener("click", () => setChoice(".effort-choice", "effortValue", btn.dataset.value));
  });

  document.querySelectorAll(".feel-choice").forEach(btn => {
    btn.addEventListener("click", () => setChoice(".feel-choice", "feelValue", btn.dataset.value));
  });

  document.querySelectorAll(".strength-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      setChoice(".strength-choice", "strengthValue", btn.dataset.value);
      exerciseSection.hidden = btn.dataset.value !== "Yes";
      if (btn.dataset.value !== "Yes") {
        document.querySelectorAll(".exercise-choice").forEach(ex => ex.classList.remove("selected"));
      }
    });
  });

  document.querySelectorAll(".exercise-choice").forEach(btn => {
    btn.addEventListener("click", () => btn.classList.toggle("selected"));
  });

  document.getElementById("addAnotherEntryBtn")?.addEventListener("click", async () => {
    if (!pendingPayload) return;
    duplicateCard.hidden = true;
    await submitPayload({ ...pendingPayload, duplicateMode: "add" });
  });

  document.getElementById("cancelDuplicateBtn")?.addEventListener("click", () => {
    pendingPayload = null;
    duplicateCard.hidden = true;
    form.hidden = false;
    statusEl.textContent = "Submission cancelled. No new entry was added.";
    statusEl.className = "form-status";
  });

  document.getElementById("logAnotherBtn")?.addEventListener("click", () => {
    confirmationCard.hidden = true;
    form.hidden = false;
    statusEl.textContent = "";
  updateShowMyLogAfterSubmit(payload);
  });
}

function validateForm() {
  const firstName = cleanFirstName(document.getElementById("firstName").value);
  const lastInitial = cleanLastInitial(document.getElementById("lastInitial").value);

  if (!firstName) {
    statusEl.textContent = "Please enter your first name.";
    statusEl.className = "form-status error";
    document.getElementById("firstName").focus();
    return false;
  }

  if (!lastInitial) {
    statusEl.textContent = "Please enter your last initial.";
    statusEl.className = "form-status error";
    document.getElementById("lastInitial").focus();
    return false;
  }

  const required = [
    ["logDate", "Please choose a date."],
    ["groupValue", "Please choose your group."],
    ["timeRun", "Please enter time run."],
    ["distanceRun", "Please enter distance run."],
    ["effortValue", "Please choose perceived effort."],
    ["feelValue", "Please choose how you felt."],
    ["strengthValue", "Please choose whether you did strength training."]
  ];

  for (const [id, msg] of required) {
    const el = document.getElementById(id);
    if (!el || !String(el.value).trim()) {
      statusEl.textContent = msg;
      statusEl.className = "form-status error";
      el?.focus?.();
      return false;
    }
  }
  return true;
}

function buildPayload() {
  const firstName = cleanFirstName(document.getElementById("firstName").value);
  const lastInitial = cleanLastInitial(document.getElementById("lastInitial").value);
  const displayName = buildDisplayName(firstName, lastInitial);

  return {
    firstName,
    lastInitial,
    displayName,
    name: displayName,
    date: document.getElementById("logDate").value,
    group: document.getElementById("groupValue").value,
    timeRun: document.getElementById("timeRun").value,
    distanceRun: document.getElementById("distanceRun").value,
    effort: document.getElementById("effortValue").value,
    feel: document.getElementById("feelValue").value,
    strength: document.getElementById("strengthValue").value,
    exercises: getSelectedExercises(),
    notes: document.getElementById("notes").value.trim(),
    plannedWorkout: getParam("planned") || "",
    duplicateMode: "check"
  };
}

function submitViaJSONP(payload) {
  return new Promise((resolve, reject) => {
    const callback = `phsxcLogCallback_${Date.now()}`;
    const params = new URLSearchParams({
      action: "log",
      callback,
      payload: JSON.stringify(payload),
      v: Date.now().toString()
    });

    const scriptUrl = `${GOOGLE_APPS_SCRIPT_URL}${GOOGLE_APPS_SCRIPT_URL.includes("?") ? "&" : "?"}${params.toString()}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Submission timed out. Please try again."));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callback] = function(response) {
      cleanup();
      if (response && (response.ok || response.duplicate)) resolve(response);
      else reject(new Error(response?.error || "Submission failed."));
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Could not submit. Check connection and try again."));
    };

    script.src = scriptUrl;
    document.body.appendChild(script);
  });
}

function showDuplicatePrompt(response, payload) {
  pendingPayload = payload;
  form.hidden = true;
  confirmationCard.hidden = true;
  duplicateCard.hidden = false;

  const count = response.existingCount || 1;
  document.getElementById("duplicateMessage").textContent =
    `You already have ${count} workout log ${count === 1 ? "entry" : "entries"} for ${payload.date} as ${payload.displayName}. Do you want to add another entry?`;
}


function updateShowMyLogAfterSubmit(payload) {
  const link = document.getElementById("showMyLogAfterSubmit");
  if (!link || !payload) return;

  const params = new URLSearchParams({
    firstName: payload.firstName || "",
    lastInitial: payload.lastInitial || "",
    group: payload.group || "",
    mode: "thisWeek"
  });

  link.href = `my-log.html?${params.toString()}`;
}

function showConfirmation(response, payload) {
  const totals = response.totals || {};
  const today = response.today || payload;

  form.hidden = true;
  duplicateCard.hidden = true;
  confirmationCard.hidden = false;

  const entryText = response.entryType === "Additional" ? "another entry" : "your workout";
  document.getElementById("confirmationTitle").textContent = "Workout Logged";
  document.getElementById("confirmationMessage").textContent =
    `Nice job, ${payload.displayName}. You logged ${entryText} for ${payload.date}.`;

  document.getElementById("todaySummary").innerHTML =
    `${formatNumber(today.timeRun, 0)} min<br>${formatNumber(today.distanceRun, 2)} mi<br>Effort ${escapeHTML(today.effort || payload.effort)}/10`;

  document.getElementById("weekSummary").innerHTML =
    `${formatNumber(totals.weekMinutes, 0)} min<br>${formatNumber(totals.weekMiles, 2)} mi<br>${totals.weekEntries || 0} entries`;

  document.getElementById("summerSummary").innerHTML =
    `${formatNumber(totals.summerMinutes, 0)} min<br>${formatNumber(totals.summerMiles, 2)} mi<br>${totals.summerEntries || 0} entries`;

  statusEl.textContent = "";
}

async function submitPayload(payload) {
  const button = document.getElementById("submitLog");
  button.disabled = true;
  statusEl.textContent = "Submitting…";
  statusEl.className = "form-status";

  try {
    const response = await submitViaJSONP(payload);

    if (response.duplicate) {
      showDuplicatePrompt(response, payload);
      return;
    }

    showConfirmation(response, payload);
    localStorage.setItem("phsxcFirstName", payload.firstName);
    localStorage.setItem("phsxcLastInitial", payload.lastInitial);
    localStorage.setItem("phsxcGroup", payload.group);

  } catch (err) {
    form.hidden = false;
    duplicateCard.hidden = true;
    confirmationCard.hidden = true;
    statusEl.textContent = err.message || "Submission failed. Please try again.";
    statusEl.className = "form-status error";
  } finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!validateForm()) return;

  const payload = buildPayload();
  localStorage.setItem("phsxcFirstName", payload.firstName);
  localStorage.setItem("phsxcLastInitial", payload.lastInitial);

  await submitPayload(payload);
});

initForm();
attachChoiceHandlers();
