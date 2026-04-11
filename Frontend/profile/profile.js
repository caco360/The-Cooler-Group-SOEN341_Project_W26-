console.log("profile.js loaded");

document.addEventListener("DOMContentLoaded", init);

const activityMultipliers = {
  no_exercise: 1.2,
  light_1_2_days: 1.375,
  moderate_3_5_days: 1.55,
  intense_6_7_days: 1.725,
  very_intense_job: 1.9
};

const goalAdjustments = {
  high_weight_gain: 1000,
  normal_weight_gain: 500,
  maintain: 0,
  normal_weight_loss: -500,
  extreme_weight_loss: -1000
};


/* ======================
   INIT
====================== */

function init() {

  document
    .getElementById("saveBtn")
    .addEventListener("click", saveProfile);

  document
    .getElementById("deleteBtn")
    .addEventListener("click", handleDeleteAccount);

  document
    .getElementById("addAllergyBtn")
    .addEventListener("click", addAllergy);

  document
    .getElementById("addDietBtn")
    .addEventListener("click", addDiet);

  document
    .getElementById("calculateBMIBtn")
    .addEventListener("click", () => calculateHealthTargets(true));

  loadProfile();
}


/* ======================
   LOAD DATA
====================== */

async function loadProfile() {

  try {

    // Check login
    const meRes = await fetch("/me");

    if (meRes.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }

    const me = await meRes.json();

    document.getElementById("welcome").textContent =
      `Welcome, ${me.user.username}`;


    // Load profile data
    const res = await fetch("/profile-data");
    const data = await res.json();

    if (!data.ok) {
      console.error("Profile error:", data);
      return;
    }

    buildOptions(
      "allergiesBox",
      data.allergies,
      data.selectedAllergyIds
    );

    buildOptions(
      "dietsBox",
      data.diets,
      data.selectedDietIds
    );
    document.getElementById("ageInput").value = data.biometrics?.age ?? "";
    document.getElementById("sexSelect").value = data.biometrics?.sex ?? "";
    document.getElementById("goalSelect").value = data.biometrics?.goal ?? "";
    document.getElementById("activityLevelSelect").value = data.biometrics?.activity_level ?? "";
    document.getElementById("weightInput").value = data.biometrics?.weight ?? "";
    document.getElementById("heightInput").value = data.biometrics?.height ?? "";
    document.getElementById("bmiResult").value = data.biometrics?.bmi ?? "";
    document.getElementById("calorieGoalResult").value = data.biometrics?.calorie_goal ?? "";
  }
  catch (err) {
    console.error("Load failed:", err);
  }
}


/* ======================
   BUILD CHECKBOXES
====================== */

function buildOptions(containerId, options, selectedIds) {

  const box = document.getElementById(containerId);
  box.innerHTML = "";

  const selected = new Set(selectedIds.map(Number));

  options.forEach(opt => {

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = opt.id;

    if (selected.has(opt.id)) {
      checkbox.checked = true;
    }

    const span = document.createElement("span");
    span.textContent = opt.name;

    label.appendChild(checkbox);
    label.appendChild(span);

    box.appendChild(label);
  });
}




/* ======================
   GET CHECKED IDS
====================== */

function getCheckedIds(containerId) {

  const box = document.getElementById(containerId);

  return [...box.querySelectorAll("input:checked")]
    .map(cb => Number(cb.value));
}


/* ======================
   SAVE PROFILE
====================== */

async function saveProfile() {

  const msg = document.getElementById("msg");
  const btn = document.getElementById("saveBtn");

  msg.textContent = "Saving...";
  btn.disabled = true;

  calculateHealthTargets(false);

  const payload = {
  allergyIds: getCheckedIds("allergiesBox"),
  dietIds: getCheckedIds("dietsBox"),
  biometrics: {
    age: document.getElementById("ageInput").value,
    sex: document.getElementById("sexSelect").value,
    goal: document.getElementById("goalSelect").value,
    activityLevel: document.getElementById("activityLevelSelect").value,
    weight: document.getElementById("weightInput").value,
    height: document.getElementById("heightInput").value
  }
};


  try {

    const res = await fetch("/profile-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.ok && data.biometrics) {
      document.getElementById("bmiResult").value = data.biometrics.bmi ?? "";
      document.getElementById("calorieGoalResult").value = data.biometrics.calorie_goal ?? "";
    }

    msg.textContent = data.ok ? "Saved" : "Error";

  }
  catch {
    msg.textContent = "Server error";
  }


  btn.disabled = false;
}


/* ======================
   ADD ALLERGY
====================== */

async function addAllergy() {

  const input = document.getElementById("newAllergy");

  const name = input.value.trim();

  if (!name) return;


  await addOption("allergy", name);

  input.value = "";

  loadProfile();
}


/* ======================
   ADD DIET
====================== */

async function addDiet() {

  const input = document.getElementById("newDiet");

  const name = input.value.trim();

  if (!name) return;


  await addOption("diet", name);

  input.value = "";

  loadProfile();
}


/* ======================
   SHARED ADD OPTION
====================== */

async function addOption(type, name) {

  try {

    const res = await fetch("/api/add-option", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name })
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "Failed to add");
    }

  }
  catch {
    alert("Server error");
  }
}

/* ======================
   SIGN OUT BUTTON LOGIC
====================== */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/logout", { method: "POST" });
      const data = await response.json();

      if (data.ok) {
        window.location.href = "/login/login.html"; 
      }
    } catch (error) {
      console.error("Server Error", error);
    }
  });
}

/* ============================
   DELETE ACCOUNT BUTTON LOGIC
=============================== */

async function handleDeleteAccount() {
  // Basic confirmation
  const firstConfirm = confirm("Are you sure you want to delete your account? This action is permanent.");
  if (!firstConfirm) return;

  // Typed confirmation
  const finalCheck = prompt("To confirm, please type 'DELETE' in all caps below:");
  
  if (finalCheck !== "DELETE") {
    alert("Incorrect text entered. Deletion cancelled.");
    return;
  }

  try {
    const response = await fetch("/api/delete-account", { method: "DELETE" });
    const data = await response.json();

    if (data.ok) {
      alert("Your account and data have been permanently removed.");
      // Redirect
      window.location.href = "/login/register.html"; 
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error("Delete request failed:", err);
    alert("Network error. Could not delete account.");
  }
}

/* ============================
   BMI + CALORIE CALCULATION
=============================== */

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculateProfileMetrics({ age, sex, weight, height, activityLevel, goal }) {
  let bmi = null;
  let calorieGoal = null;

  if (weight && height) {
    bmi = Number((weight / Math.pow(height, 2)).toFixed(2));
  }

  if (
    age &&
    weight &&
    height &&
    sex &&
    activityLevel &&
    goal &&
    activityMultipliers[activityLevel] &&
    goalAdjustments[goal] !== undefined
  ) {
    const heightCm = height * 100;
    const sexOffset = sex === "male" ? 5 : -161;
    const bmr = (10 * weight) + (6.25 * heightCm) - (5 * age) + sexOffset;
    const maintenanceCalories = bmr * activityMultipliers[activityLevel];

    calorieGoal = Math.round(
      maintenanceCalories + goalAdjustments[goal]
    );
  }

  return { bmi, calorieGoal };
}

function calculateHealthTargets(showAlerts) {
  const age = Math.trunc(toPositiveNumber(document.getElementById("ageInput").value) || 0);
  const sex = document.getElementById("sexSelect").value;
  const goal = document.getElementById("goalSelect").value;
  const activityLevel = document.getElementById("activityLevelSelect").value;
  const weight = toPositiveNumber(document.getElementById("weightInput").value);
  const height = toPositiveNumber(document.getElementById("heightInput").value);
  const bmiResult = document.getElementById("bmiResult");
  const calorieGoalResult = document.getElementById("calorieGoalResult");

  if (showAlerts && age > 0 && age < 20) {
    alert("Warning: Standard BMI and calorie calculations might not be fully accurate for users under 20 years old. Please consult a medical professional for more adequate dieting advice.");
  }

  const metrics = calculateProfileMetrics({
    age,
    sex,
    weight,
    height,
    activityLevel,
    goal
  });

  bmiResult.value = metrics.bmi ?? "";

  if (metrics.calorieGoal !== null) {
    calorieGoalResult.value = metrics.calorieGoal;
  } else if (showAlerts && metrics.bmi !== null) {
    calorieGoalResult.value = "Complete all fields";
  } else {
    calorieGoalResult.value = "";
  }
}
