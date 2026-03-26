console.log("profile.js loaded");

document.addEventListener("DOMContentLoaded", init);


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


  const payload = {
    allergyIds: getCheckedIds("allergiesBox"),
    dietIds: getCheckedIds("dietsBox")
  };


  try {

    const res = await fetch("/profile-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    msg.textContent = data.ok ? "Saved " : "Error ";

  }
  catch {
    msg.textContent = "Server error ";
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
   BMI Calculation Logic
=============================== */
document.addEventListener("DOMContentLoaded", () => {
  const calculateBtn = document.getElementById("calculateBMIBtn");
  const ageInput = document.getElementById("ageInput");
  const weightInput = document.getElementById("weightInput");
  const heightInput = document.getElementById("heightInput");
  const bmiResult = document.getElementById("bmiResult");

  calculateBtn.addEventListener("click", () => {
    const age = parseInt(ageInput.value, 10) // age number value is in base 10
    const weight = parseFloat(weightInput.value);
    const height = parseFloat(heightInput.value);

    // Triggers pop-up if user is under 20 years old
    if (age < 20) {
      alert("Warning: Standard BMI calculations might not be an accurate way to assess body weight health for users under 20 years old. Please consult a medical professional for more adequate dieting advice.");
    }

    // Basic validation
    if (weight > 0 && height > 0) {
      const bmi = weight / Math.pow(height, 2);
      
      // Rounding to 2 decimals
      bmiResult.value = bmi.toFixed(2); 
    } else {
      bmiResult.value = "Invalid input";
    }
  });
});