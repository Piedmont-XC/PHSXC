// PHSXC Workout Log v11
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrZU9YRCoi1giUkmyski0VrBzKpI1Tfrk--TYInwjK48yo7SCaT0I66mHbuW1Tc0Fp/exec";

const form = document.getElementById("workoutLogForm");
const statusEl = document.getElementById("formStatus");
const exerciseSection = document.getElementById("exerciseSection");

function localISODate(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
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
  return Array.from(document.querySelectorAll(".exercise-choice.selected"))
    .map(btn => btn.dataset.value);
}

function initForm() {
  const savedName = localStorage.getItem("phsxcAthleteName") || "";
  const savedGroup = localStorage.getItem("phsxcGroup") || "Sophomore";

  document.getElementById("athleteName").value = savedName;
  document.getElementById("logDate").value = getParam("date") || localISODate();

  const group = getParam("group") || savedGroup;
  setChoice(".group-choice", "groupValue", group);

  const planned = getParam("planned");
  if (planned) {
    document.getElementById("plannedWorkoutBox").hidden = false;
    document.getElementById("plannedWorkoutText").textContent = planned;
  }

  setChoice(".strength-choice", "strengthValue", "");
}

function attachChoiceHandlers() {
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
}

function validateForm() {
  const required = [
    ["athleteName", "Please enter your name."],
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

function submitViaJSONP(payload) {
  return new Promise((resolve, reject) => {
    const callback = `phsxcLogCallback_${Date.now()}`;
    const joinChar = GOOGLE_APPS_SCRIPT_URL.includes("?") ? "&" : "?";
    const params = new URLSearchParams({
      action: "log",
      callback,
      payload: JSON.stringify(payload),
      v: Date.now().toString()
    });

    const scriptUrl = `${GOOGLE_APPS_SCRIPT_URL}${joinChar}${params.toString()}`;
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
      if (response && response.ok) {
        resolve(response);
      } else {
        reject(new Error(response?.error || "Submission failed."));
      }
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Could not submit. Check connection and try again."));
    };

    script.src = scriptUrl;
    document.body.appendChild(script);
  });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!validateForm()) return;

  const name = document.getElementById("athleteName").value.trim();
  localStorage.setItem("phsxcAthleteName", name);

  const payload = {
    date: document.getElementById("logDate").value,
    name,
    group: document.getElementById("groupValue").value,
    timeRun: document.getElementById("timeRun").value,
    distanceRun: document.getElementById("distanceRun").value,
    effort: document.getElementById("effortValue").value,
    feel: document.getElementById("feelValue").value,
    strength: document.getElementById("strengthValue").value,
    exercises: getSelectedExercises(),
    notes: document.getElementById("notes").value.trim(),
    plannedWorkout: getParam("planned") || ""
  };

  statusEl.textContent = "Submitting…";
  statusEl.className = "form-status";

  const button = document.getElementById("submitLog");
  button.disabled = true;

  try {
    await submitViaJSONP(payload);
    statusEl.textContent = "Workout logged. Nice job.";
    statusEl.className = "form-status success";
    form.reset();
    document.getElementById("athleteName").value = name;
    document.getElementById("logDate").value = payload.date;
    setChoice(".group-choice", "groupValue", payload.group);
    setChoice(".effort-choice", "effortValue", "");
    setChoice(".feel-choice", "feelValue", "");
    setChoice(".strength-choice", "strengthValue", "");
    exerciseSection.hidden = true;
    document.querySelectorAll(".exercise-choice").forEach(btn => btn.classList.remove("selected"));
  } catch (err) {
    statusEl.textContent = err.message || "Submission failed. Please try again.";
    statusEl.className = "form-status error";
  } finally {
    button.disabled = false;
  }
});

initForm();
attachChoiceHandlers();
