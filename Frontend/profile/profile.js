console.log("profile.js loaded ✅");

document.addEventListener("DOMContentLoaded", init);


/* ======================
   INIT
====================== */

function init() {

  document
    .getElementById("saveBtn")
    .addEventListener("click", saveProfile);

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

    msg.textContent = data.ok ? "Saved ✅" : "Error ❌";

  }
  catch {
    msg.textContent = "Server error ❌";
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
