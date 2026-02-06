console.log("profile.js loaded ✅");

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveBtn").addEventListener("click", save);

  document
    .getElementById("addAllergyBtn")
    .addEventListener("click", addAllergy);

  document
    .getElementById("addDietBtn")
    .addEventListener("click", addDiet);
  load();

});

async function load() {

  // Check login
  const meRes = await fetch("/me");

  if (meRes.status === 401) {
    window.location.href = "/login/login.html";
    return;
  }

  const me = await meRes.json();

  document.getElementById("welcome").textContent =
    "Welcome, " + me.user.username;

  // Load profile data
  const r = await fetch("/profile-data");
  const data = await r.json();

  if (!data.ok) {
    console.error("Profile data error:", data);
    return;
  }

  buildCheckboxes(
    "allergiesBox",
    data.allergies,
    data.selectedAllergyIds
  );

  buildCheckboxes(
    "dietsBox",
    data.diets,
    data.selectedDietIds
  );
}


// Build checkbox lists
function buildCheckboxes(containerId, options, selectedIds) {

  const box = document.getElementById(containerId);
  box.innerHTML = "";

  const selectedSet = new Set(selectedIds.map(Number));

  for (const opt of options) {

    const label = document.createElement("label");
    label.style.display = "block";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = opt.id;

    if (selectedSet.has(opt.id)) {
      cb.checked = true;
    }

    label.appendChild(cb);
    label.append(" " + opt.name);

    box.appendChild(label);
  }
}


// Get checked values
function getCheckedIds(containerId) {

  const box = document.getElementById(containerId);

  return Array
    .from(box.querySelectorAll("input:checked"))
    .map(cb => Number(cb.value));
}


// Save data
async function save() {

  const msg = document.getElementById("msg");

  const allergyIds = getCheckedIds("allergiesBox");
  const dietIds = getCheckedIds("dietsBox");

  const payload = {
    allergyIds,
    dietIds
  };

  const r = await fetch("/profile-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await r.json();

  msg.textContent = data.ok ? "Saved ✅" : "Error ❌";
}


async function addAllergy() {

  const input = document.getElementById("newAllergy");
  const name = input.value.trim();

  if (!name) return;

  const res = await fetch("/api/add-option", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "allergy",
      name
    })
  });

  const data = await res.json();

  if (!data.ok) {
    alert(data.message || "Failed to add allergy");
    return;
  }

  input.value = "";

  // Reload list
  load();
}


// =======================
// Add New Diet
// =======================

async function addDiet() {

  const input = document.getElementById("newDiet");
  const name = input.value.trim();

  if (!name) return;

  const res = await fetch("/api/add-option", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "diet",
      name
    })
  });

  const data = await res.json();

  if (!data.ok) {
    alert(data.message || "Failed to add diet");
    return;
  }

  input.value = "";

  // Reload list
  load();
}
