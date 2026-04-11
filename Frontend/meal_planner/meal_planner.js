document.addEventListener("DOMContentLoaded", init);

const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

let currentWeekStart = "";
let userRecipes = [];
let plannerMeals = [];
let calorieGoal = null;

function getMealCalories(meal) {
  return (
    toFiniteNumber(meal?.Recipes?.total_calories) ??
    toFiniteNumber(meal?.Recipes?.calories) ??
    0
  );
}

function init() {
  setupCurrentWeek();
  bindWeekButtons();
  bindSlots();
  bindModal();
  loadRecipesForDropdown();
  loadCalorieGoal();
  loadPlannerMeals();
}

function setupCurrentWeek() {
  const today = new Date();
  const monday = getMonday(today);
  currentWeekStart = formatDate(monday);
  updateWeekLabel(monday);
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function bindWeekButtons() {
  const prevBtn = document.getElementById("prevWeekBtn");
  const nextBtn = document.getElementById("nextWeekBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const d = parseLocalDate(currentWeekStart);
      d.setDate(d.getDate() - 7);
      currentWeekStart = formatDate(d);
      updateWeekLabel(d);
      loadPlannerMeals();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const d = parseLocalDate(currentWeekStart);
      d.setDate(d.getDate() + 7);
      currentWeekStart = formatDate(d);
      updateWeekLabel(d);
      loadPlannerMeals();
    });
  }
}

function bindSlots() {
  const slots = document.querySelectorAll(".meal-slot");

  slots.forEach(slot => {
    slot.classList.add("empty");

    slot.addEventListener("click", () => {
      const day = slot.dataset.day;
      const mealType = slot.dataset.meal;

      openMealModal(day, mealType);
    });
  });
}

function bindModal() {
  const closeBtn = document.getElementById("closeModalBtn");
  const modal = document.getElementById("mealModal");
  const form = document.getElementById("mealForm");
  const removeBtn = document.getElementById("removeMealBtn");

if (removeBtn) {
  removeBtn.addEventListener("click", removeMealFromPlanner);
}

  if (closeBtn) {
    closeBtn.addEventListener("click", closeMealModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeMealModal();
      }
    });
  }

  if (form) {
    form.addEventListener("submit", saveMealToPlanner);
  }
}

function openMealModal(day, mealType) {
  const modal = document.getElementById("mealModal");
  const modalMealType = document.getElementById("mealTypeSelect");
  const modalDay = document.getElementById("selectedDay");
  const recipeSelect = document.getElementById("recipeSelect");

  if (!modal) return;

  if (modalDay) modalDay.value = day;
  if (modalMealType) modalMealType.value = mealType;
  if (recipeSelect) recipeSelect.value = "";

  modal.classList.remove("hidden");
}

function closeMealModal() {
  const modal = document.getElementById("mealModal");
  if (modal) modal.classList.add("hidden");
}

async function loadRecipesForDropdown() {
  try {
    const res = await fetch("/my-recipes");

    if (res.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      console.error("Could not load recipes");
      return;
    }

    userRecipes = data.recipes || [];
    renderRecipeOptions(userRecipes);

  } catch (err) {
    console.error("Recipe dropdown load error:", err);
  }
}

async function loadCalorieGoal() {
  try {
    const res = await fetch("/profile-data");

    if (res.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      console.error("Could not load calorie goal");
      calorieGoal = null;
      renderDailyCalorieSummaries();
      return;
    }

    calorieGoal = toFiniteNumber(data.biometrics?.calorie_goal);
    renderDailyCalorieSummaries();

  } catch (err) {
    console.error("Calorie goal load error:", err);
    calorieGoal = null;
    renderDailyCalorieSummaries();
  }
}

function renderRecipeOptions(recipes) {
  const select = document.getElementById("recipeSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Select a recipe</option>`;

  recipes.forEach(recipe => {
    const option = document.createElement("option");
    option.value = recipe.id;
    option.textContent = recipe.title;
    select.appendChild(option);
  });
}

async function saveMealToPlanner(e) {
  e.preventDefault();

  const recipeId = document.getElementById("recipeSelect")?.value;
  const mealType = document.getElementById("mealTypeSelect")?.value;
  const day = document.getElementById("selectedDay")?.value;

  if (!recipeId || !mealType || !day) {
    alert("Please select all fields.");
    return;
  }

  try {
    const res = await fetch("/meal-planner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipe_id: Number(recipeId),
        week_start_date: currentWeekStart,
        day_of_week: day,
        meal_type: mealType
      })
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "Failed to save meal.");
      return;
    }

    closeMealModal();
    loadPlannerMeals();

  } catch (err) {
    console.error("Save meal error:", err);
    alert("Server error.");
  }
}

function updateWeekLabel(dateObj) {
  const label = document.getElementById("weekLabel");
  if (!label) return;

  const formatted = dateObj.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  label.textContent = `Week of ${formatted}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function loadPlannerMeals() {
  try {
    const res = await fetch(`/meal-planner?week_start_date=${currentWeekStart}`);

    if (res.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      console.error("Could not load planner meals");
      return;
    }

    plannerMeals = data.meals || [];
    clearPlannerGrid();
    renderPlannerMeals(plannerMeals);
    renderDailyCalorieSummaries();

  } catch (err) {
    console.error("Planner load error:", err);
  }
}

function clearPlannerGrid() {
  const slots = document.querySelectorAll(".meal-slot");

  slots.forEach(slot => {
    slot.innerHTML = "";
    slot.classList.add("empty");
    slot.removeAttribute("data-planner-id");
  });
}

function renderPlannerMeals(meals) {
  meals.forEach(meal => {
    const day = meal.day_of_week;
    const mealType = meal.meal_type;

    const slot = document.querySelector(
      `.meal-slot[data-day="${day}"][data-meal="${mealType}"]`
    );

    if (!slot) return;

    const recipe = meal.Recipes;
    const title = recipe?.title || "Untitled recipe";
    const totalCalories = getMealCalories(meal);
    const caloriesMarkup = totalCalories !== null
      ? `<small>${formatCalories(totalCalories)} kcal</small>`
      : "";

    slot.classList.remove("empty");
    slot.setAttribute("data-planner-id", meal.id);
    slot.innerHTML = `
      <div class="meal-card">
        ${title}
        ${caloriesMarkup}
      </div>
    `;
  });
}

function renderDailyCalorieSummaries() {
  WEEK_DAYS.forEach(day => {
    const summaryCell = document.querySelector(`[data-day-summary="${day}"]`);

    if (!summaryCell) return;

    const dayTotal = plannerMeals
      .filter(meal => meal.day_of_week === day)
      .reduce((sum, meal) => sum + getMealCalories(meal), 0);

    const hasGoal = Number.isFinite(calorieGoal) && calorieGoal > 0;
    const progressPercent = hasGoal
      ? Math.min((dayTotal / calorieGoal) * 100, 100)
      : 0;

    const summaryText = hasGoal
      ? `${formatCalories(dayTotal)} / ${formatCalories(calorieGoal)} kcal`
      : `${formatCalories(dayTotal)} kcal tracked`;

    const note = hasGoal
      ? getCalorieGoalNote(dayTotal, calorieGoal)
      : "Set your calorie goal in Profile to track progress.";

    summaryCell.classList.toggle("empty", !hasGoal && dayTotal === 0);
    summaryCell.innerHTML = `
      <div class="calorie-summary-header">
        <span class="calorie-summary-label">${formatDayLabel(day)}</span>
        <span class="calorie-summary-text">${summaryText}</span>
      </div>
      <div class="calorie-progress" aria-hidden="true">
        <div class="calorie-progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
      <div class="calorie-summary-note">${note}</div>
    `;
  });
}

function getCalorieGoalNote(total, goal) {
  if (total === 0) {
    return "No meals added yet.";
  }

  const difference = Math.round(goal - total);

  if (difference > 0) {
    return `${difference} kcal remaining`;
  }

  if (difference === 0) {
    return "Goal reached";
  }

  return `${Math.abs(difference)} kcal over goal`;
}

function formatDayLabel(day) {
  return day.slice(0, 3).toUpperCase();
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCalories(value) {
  const amount = Number(value) || 0;
  return Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);
}

async function removeMealFromPlanner() {
  const mealType = document.getElementById("mealTypeSelect")?.value;
  const day = document.getElementById("selectedDay")?.value;

  if (!mealType || !day) return;

  try {
    const res = await fetch("/meal-planner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipe_id: null, // 👈 triggers delete
        week_start_date: currentWeekStart,
        day_of_week: day,
        meal_type: mealType
      })
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "Failed to remove meal.");
      return;
    }

    closeMealModal();
    loadPlannerMeals();

  } catch (err) {
    console.error("Remove meal error:", err);
    alert("Server error.");
  }
}
