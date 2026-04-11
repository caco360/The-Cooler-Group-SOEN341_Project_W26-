document.addEventListener("DOMContentLoaded", init);

const USDA_SEARCH_MIN_LENGTH = 0;
const USDA_SEARCH_LIMIT = 1000;
let ingredientRowCounter = 0;

function setRecipeFormOpen(isOpen) {
  const toggleBtn = document.getElementById("toggleRecipeFormBtn");
  const panel = document.getElementById("recipeFormPanel");
  const section = document.querySelector(".add-recipes-section");

  if (!toggleBtn || !panel) return;

  panel.hidden = !isOpen;
  section?.classList.toggle("is-open", isOpen);
  toggleBtn.setAttribute("aria-expanded", String(isOpen));
  toggleBtn.textContent = isOpen ? "Hide Form" : "+ Add Recipe";

  if (isOpen) {
    document.getElementById("titleInput")?.focus();
  }
}

function init() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadRecipes);

  const toggleRecipeFormBtn = document.getElementById("toggleRecipeFormBtn");
  const recipeFormPanel = document.getElementById("recipeFormPanel");
  if (toggleRecipeFormBtn && recipeFormPanel) {
    toggleRecipeFormBtn.addEventListener("click", () => {
      setRecipeFormOpen(recipeFormPanel.hidden);
    });
  }

  const addRecipeBtn = document.getElementById("addRecipeBtn");
  if (addRecipeBtn) addRecipeBtn.addEventListener("click", addRecipe);

  const addIngredientBtn = document.getElementById("addIngredientBtn");
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener("click", () => addIngredientRow());
  }

  const searchEl = document.getElementById("recipeSearch");
  if (searchEl) {
    const debounce = (fn, wait = 200) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
      };
    };

    const onSearch = debounce(() => {
      const q = (searchEl.value || "").trim();
      renderRecipes(window._recipes || [], q);
    }, 200);

    searchEl.addEventListener("input", onSearch);
    searchEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        renderRecipes(window._recipes || [], (searchEl.value || "").trim());
      }
    });
  }

  const filterBtn = document.getElementById("filterBtn");
  const modal = document.getElementById("filterModal");
  const nameField = document.getElementById("filterName");
  const costMinField = document.getElementById("filterCostMin");
  const costMaxField = document.getElementById("filterCostMax");
  const timeMinField = document.getElementById("filterTimeMin");
  const timeMaxField = document.getElementById("filterTimeMax");
  const applyBtn = document.getElementById("applyFilterBtn");
  const cancelBtn = document.getElementById("cancelFilterBtn");

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  if (filterBtn && modal) {
    filterBtn.addEventListener("click", () => {
      const searchEl = document.getElementById("recipeSearch");
      if (nameField) nameField.value = (searchEl?.value || "").trim();
      if (costMinField) costMinField.value = "";
      if (costMaxField) costMaxField.value = "";
      if (timeMinField) timeMinField.value = "";
      if (timeMaxField) timeMaxField.value = "";
      modal.classList.add("open");
      if (nameField) nameField.focus();
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      const nameQ = (nameField?.value || "").trim();
      const min = costMinField?.value === "" ? null : costMinField?.value;
      const max = costMaxField?.value === "" ? null : costMaxField?.value;
      const tMin = timeMinField?.value === "" ? null : timeMinField?.value;
      const tMax = timeMaxField?.value === "" ? null : timeMaxField?.value;

      const mainSearch = document.getElementById("recipeSearch");
      if (mainSearch) mainSearch.value = nameQ;

      closeModal();
      renderRecipes(window._recipes || [], nameQ, min, max, false, tMin, tMax);
      filterBtn?.focus();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeModal();
      if (nameField) nameField.value = "";
      if (costMinField) costMinField.value = "";
      if (costMaxField) costMaxField.value = "";
      if (timeMinField) timeMinField.value = "";
      if (timeMaxField) timeMaxField.value = "";

      const mainSearch = document.getElementById("recipeSearch");
      if (mainSearch) mainSearch.value = "";

      renderRecipes(window._recipes || [], "", null, null);
      filterBtn?.focus();
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".ingredient-row")) {
      document.querySelectorAll(".ingredient-results.open").forEach((results) => {
        results.classList.remove("open");
        results.hidden = true;
      });
    }
  });

  addIngredientRow();
  loadRecipes();
  loadDietPreferences().then(renderDietOptions);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCalories(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toFixed(0)} kcal`;
}

async function loadRecipes() {
  const statusEl = document.getElementById("status");
  const grid = document.getElementById("recipesGrid");

  if (statusEl) {
    statusEl.classList.remove("error");
    statusEl.textContent = "Loading...";
  }
  if (grid) grid.innerHTML = "";

  const meRes = await fetch("/me");
  if (meRes.status === 401) {
    window.location.href = "/login/login.html";
    return;
  }

  try {
    const res = await fetch("/my-recipes");

    if (res.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      if (statusEl) {
        statusEl.classList.add("error");
        statusEl.textContent = "Could not load recipes.";
      }
      return;
    }

    const recipes = data.recipes || [];
    window._recipes = recipes;

    if (!recipes.length) {
      if (statusEl) statusEl.textContent = "No recipes saved yet.";
      if (grid) grid.innerHTML = "";
      return;
    }

    if (statusEl) statusEl.textContent = "";
    renderRecipes(recipes, "", null, null);
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.classList.add("error");
      statusEl.textContent = "Server error.";
    }
  }
}

function renderRecipes(
  recipes,
  query = "",
  costMin = null,
  costMax = null,
  useOr = false,
  timeMin = null,
  timeMax = null
) {
  const statusEl = document.getElementById("status");
  const grid = document.getElementById("recipesGrid");

  const q = (query || "").trim().toLowerCase();
  const nameFilterActive = Boolean(q);
  const costFilterActive = (costMin !== null && costMin !== "") || (costMax !== null && costMax !== "");
  const minN = costMin === null || costMin === "" ? null : Number(costMin);
  const maxN = costMax === null || costMax === "" ? null : Number(costMax);

  const filtered = recipes.filter((r) => {
    const nameMatch = nameFilterActive ? (r.title || "").toLowerCase().includes(q) : false;

    let costMatch = false;
    if (costFilterActive) {
      const val = r.cost ?? null;
      if (val !== null && val !== undefined && val !== "") {
        const num = Number(val);
        if (Number.isFinite(num)) {
          if (minN !== null && !Number.isNaN(minN) && num < minN) costMatch = false;
          else if (maxN !== null && !Number.isNaN(maxN) && num > maxN) costMatch = false;
          else costMatch = true;
        }
      }
    }

    const timeFilterActive = (timeMin !== null && timeMin !== "") || (timeMax !== null && timeMax !== "");
    let timeMatch = true;
    if (timeFilterActive) {
      const t = Number(r.prep_time);
      if (Number.isNaN(t)) {
        timeMatch = false;
      } else {
        const tMinN = timeMin === "" || timeMin === null ? null : Number(timeMin);
        const tMaxN = timeMax === "" || timeMax === null ? null : Number(timeMax);
        if (tMinN !== null && t < tMinN) timeMatch = false;
        if (tMaxN !== null && t > tMaxN) timeMatch = false;
      }
    }

    return (
      (useOr ? (nameFilterActive && nameMatch) || (costFilterActive && costMatch) : (!nameFilterActive || nameMatch) && (!costFilterActive || costMatch)) &&
      timeMatch
    );
  });

  if (!filtered.length) {
    if (statusEl) {
      statusEl.textContent = recipes.length ? "No recipes match your search." : "No recipes saved yet.";
    }
    if (grid) grid.innerHTML = "";
    return;
  }

  if (statusEl) statusEl.textContent = "";

  if (grid) {
    grid.innerHTML = filtered
      .map((r) => {
        const title = escapeHtml(r.title || "Untitled");
        const desc = r.description ? escapeHtml(r.description) : "";
        const prep = r.prep_time === null || r.prep_time === undefined || r.prep_time === "" ? "-" : `${escapeHtml(r.prep_time)} min`;
        const cost = r.cost === null || r.cost === undefined ? "-" : `$${escapeHtml(r.cost)}`;
        const calories = formatCalories(r.total_calories ?? r.calories);
        const diet = r.diet_name || "No dietary pref";
        const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
        const ingHtml = ingredients.length
          ? ingredients.map((i) => `<span class="ingredient-pill">${escapeHtml(i)}</span>`).join("")
          : `<span class="muted">No ingredients listed</span>`;

        return `
          <article class="recipe-card" data-id="${r.id}">
            <div class="recipe-top">
              <div class="title-wrap">
                <h3 class="recipe-title">${title}</h3>
                <span class="prep-badge">${prep}</span>
                <span class="prep-badge">${cost}</span>
                <span class="prep-badge">${calories}</span>
                <span class="prep-badge">${diet}</span>
              </div>
              <div class="card-actions">
                <button class="btn-secondary" type="button" data-action="edit" data-id="${r.id}">Edit</button>
                <button class="btn-danger" type="button" data-action="delete" data-id="${r.id}">Delete</button>
              </div>
            </div>
            <p class="recipe-desc ${desc ? "" : "muted"}">
              ${desc || "No description"}
            </p>
            <div class="ingredients-block">
              <div class="ingredients-label">Ingredients</div>
              <div class="ingredients-pills">${ingHtml}</div>
            </div>
          </article>
        `;
      })
      .join("");

    grid.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", () => deleteRecipe(btn.dataset.id));
    });

    grid.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
      btn.addEventListener("click", () => startEdit(btn.dataset.id));
    });
  }
}

async function addRecipe() {
  const msg = document.getElementById("createMsg");
  const title = document.getElementById("titleInput")?.value.trim();
  const description = document.getElementById("descInput")?.value.trim();
  const prepTimeValue = document.getElementById("prepInput")?.value;
  const costValue = document.getElementById("costInput")?.value;
  const dietValue = document.getElementById("dietSelect")?.value;

  if (!title) {
    if (msg) {
      msg.classList.add("error");
      msg.textContent = "Title required";
    }
    return;
  }

  const ingredientPayload = collectIngredientRows();
  if (!ingredientPayload.ok) {
    if (msg) {
      msg.classList.add("error");
      msg.textContent = ingredientPayload.message;
    }
    return;
  }

  try {
    const res = await fetch("/recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        description,
        prep_time: prepTimeValue === "" ? null : Number(prepTimeValue),
        cost: costValue === "" ? null : Number(costValue),
        diet_id: dietValue === "" ? null : Number(dietValue),
        ingredientRows: ingredientPayload.rows
      })
    });

    const data = await res.json();

    if (!data.ok) {
      if (msg) {
        msg.classList.add("error");
        msg.textContent = data.message || "Failed";
      }
      return;
    }

    if (msg) {
      msg.classList.remove("error");
      msg.textContent = data.recipe?.total_calories != null
        ? `Added. Total calories: ${formatCalories(data.recipe.total_calories)}`
        : "Added!";
    }

    resetRecipeForm();
    setRecipeFormOpen(false);
    loadRecipes();
  } catch (err) {
    console.error(err);
    if (msg) {
      msg.classList.add("error");
      msg.textContent = "Server error";
    }
  }
}

async function deleteRecipe(recipeId) {
  const ok = confirm("Delete this recipe?");
  if (!ok) return;

  try {
    const res = await fetch(`/recipes/${recipeId}`, { method: "DELETE" });

    if (res.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "Delete failed.");
      return;
    }

    window._recipes = (window._recipes || []).filter((r) => String(r.id) !== String(recipeId));

    const q = (document.getElementById("recipeSearch")?.value || "").trim();
    renderRecipes(window._recipes, q);
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}

function startEdit(recipeId) {
  const card = document.querySelector(`.recipe-card[data-id="${recipeId}"]`);
  const recipe = (window._recipes || []).find((r) => r.id == recipeId);
  if (!card || !recipe) return;

  const titleEl = card.querySelector(".recipe-title");
  const descEl = card.querySelector(".recipe-desc");
  const badges = card.querySelectorAll(".prep-badge");
  const prepEl = badges[0];

  if (titleEl) {
    titleEl.outerHTML = `<input class="edit-title" value="${escapeHtml(recipe.title || "")}" />`;
  }

  if (descEl) {
    descEl.outerHTML = `<textarea class="edit-desc" rows="2">${escapeHtml(recipe.description || "")}</textarea>`;
  }

  if (prepEl) {
    prepEl.outerHTML = `
      <span class="prep-badge">
        <input class="edit-prep" type="number" min="0" value="${recipe.prep_time ?? ""}" style="width:70px"> min
      </span>
    `;
  }

  const actions = card.querySelector(".card-actions");
  if (actions && !actions.querySelector('[data-action="save"]')) {
    actions.insertAdjacentHTML(
      "afterbegin",
      `<button class="btn-secondary" type="button" data-action="save" data-id="${recipeId}">Save</button>`
    );
    actions.querySelector('[data-action="edit"]')?.remove();
    actions.querySelector('[data-action="save"]')?.addEventListener("click", () => saveRecipe(card));
  }
}

async function saveRecipe(card) {
  const id = card.dataset.id;
  const title = card.querySelector(".edit-title")?.value.trim();
  const description = card.querySelector(".edit-desc")?.value.trim();
  const prepValue = card.querySelector(".edit-prep")?.value;

  if (!title) {
    alert("Title is required.");
    return;
  }

  const payload = {
    title,
    description,
    prep_time: prepValue === "" ? null : Number(prepValue)
  };

  try {
    const res = await fetch(`/recipes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "Update failed.");
      return;
    }

    loadRecipes();
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}

async function loadDietPreferences() {
  try {
    const res = await fetch("/profile-data");
    const data = await res.json();

    if (!data.ok) {
      throw new Error("Failed to fetch diets");
    }

    return data.diets || [];
  } catch (err) {
    console.error("Error loading diets:", err);
    return [];
  }
}

function renderDietOptions(diets) {
  const select = document.getElementById("dietSelect");

  if (!select) return;

  select.innerHTML = `<option value="">No diet</option>`;

  diets.forEach((d) => {
    const option = document.createElement("option");
    option.value = d.id;
    option.textContent = d.name;
    select.appendChild(option);
  });
}

function addIngredientRow(initial = {}) {
  const container = document.getElementById("ingredientRows");
  if (!container) return;

  ingredientRowCounter += 1;
  const row = document.createElement("div");
  row.className = "ingredient-row";
  row.dataset.rowId = String(ingredientRowCounter);

  row.innerHTML = `
    <div class="ingredient-search-wrap">
      <input
        type="search"
        class="ingredient-search"
        placeholder="Search USDA food"
        autocomplete="off"
        value="${escapeHtml(initial.foodName || "")}" />
      <div class="ingredient-results" hidden></div>
      <div class="ingredient-selected"></div>
    </div>
    <input
      type="number"
      class="ingredient-amount"
      min="0"
      step="0.1"
      placeholder="g"
      value="${escapeHtml(initial.quantity_g ?? "")}" />
    <button type="button" class="ingredient-remove">Remove</button>
  `;

  const searchInput = row.querySelector(".ingredient-search");
  const results = row.querySelector(".ingredient-results");
  const selected = row.querySelector(".ingredient-selected");
  const amountInput = row.querySelector(".ingredient-amount");
  const removeBtn = row.querySelector(".ingredient-remove");

  const hydrateSelection = () => {
    const fdcId = initial.usda_food_id ?? initial.fdc_id;
    const foodName = initial.foodName || initial.ingredient_name_snapshot || initial.description || "";
    const caloriesPer100g = initial.calories_per_100g ?? initial.caloriesPer100g;

    if (fdcId) {
      row.dataset.fdcId = String(fdcId);
      row.dataset.foodName = foodName;
      row.dataset.caloriesPer100g = String(caloriesPer100g ?? "");
      if (selected) {
        selected.textContent = `Selected: ${foodName}${Number.isFinite(Number(caloriesPer100g)) ? ` (${formatCalories(caloriesPer100g)} per 100g)` : ""}`;
      }
    }
  };

  hydrateSelection();

  const clearSelection = () => {
    delete row.dataset.fdcId;
    delete row.dataset.foodName;
    delete row.dataset.caloriesPer100g;
    if (selected) selected.textContent = "";
  };

  const closeResults = () => {
    if (results) {
      results.classList.remove("open");
      results.hidden = true;
      results.innerHTML = "";
    }
  };

  const renderResults = (foods) => {
    if (!results) return;
    results.innerHTML = "";

    if (!foods.length) {
      const empty = document.createElement("div");
      empty.className = "ingredient-empty";
      empty.textContent = "No USDA foods found.";
      results.appendChild(empty);
      results.hidden = false;
      results.classList.add("open");
      return;
    }

    foods.forEach((food) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ingredient-result-btn";
      button.innerHTML = `
        <div class="ingredient-result-title"></div>
        <div class="ingredient-result-subtitle"></div>
      `;
      button.querySelector(".ingredient-result-title").textContent = food.description;
      button.querySelector(".ingredient-result-subtitle").textContent = `ID ${food.fdc_id} - ${formatCalories(food.calories_per_100g)} per 100g`;
      button.addEventListener("click", () => {
        row.dataset.fdcId = String(food.fdc_id);
        row.dataset.foodName = food.description;
        row.dataset.caloriesPer100g = String(food.calories_per_100g);
        if (searchInput) searchInput.value = food.description;
        if (selected) {
          selected.textContent = `Selected: ${food.description} (${formatCalories(food.calories_per_100g)} per 100g)`;
        }
        closeResults();
        amountInput?.focus();
      });
      results.appendChild(button);
    });

    results.hidden = false;
    results.classList.add("open");
  };

  const searchFoods = async (query) => {
    if (!results) return;

    const trimmed = query.trim();
    if (trimmed.length < USDA_SEARCH_MIN_LENGTH) {
      closeResults();
      return;
    }

    row.dataset.searchToken = String(Number(row.dataset.searchToken || "0") + 1);
    const token = row.dataset.searchToken;

    try {
      const response = await fetch(`/api/usda-foods/search?q=${encodeURIComponent(trimmed)}&limit=${USDA_SEARCH_LIMIT}`);
      const data = await response.json();

      if (row.dataset.searchToken !== token) return;

      if (!data.ok) {
        renderResults([]);
        return;
      }

      renderResults(data.foods || []);
    } catch (err) {
      console.error("USDA search error:", err);
      if (row.dataset.searchToken === token) {
        renderResults([]);
      }
    }
  };

  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener("focus", () => {
      if ((searchInput.value || "").trim().length >= USDA_SEARCH_MIN_LENGTH) {
        searchFoods(searchInput.value || "");
      }
    });

    searchInput.addEventListener("input", () => {
      if (row.dataset.fdcId && (searchInput.value || "").trim() !== row.dataset.foodName) {
        clearSelection();
      }

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchFoods(searchInput.value || ""), 250);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
      }
    });
  }

  if (amountInput) {
    amountInput.addEventListener("input", () => {
      amountInput.dataset.dirty = "true";
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      const rows = container.querySelectorAll(".ingredient-row");
      if (rows.length <= 1) {
        clearIngredientRow(row);
        return;
      }
      row.remove();
    });
  }

  if (!initial.usda_food_id && !initial.fdc_id) {
    clearSelection();
  }

  container.appendChild(row);
  return row;
}

function clearIngredientRow(row) {
  const searchInput = row.querySelector(".ingredient-search");
  const amountInput = row.querySelector(".ingredient-amount");
  const selected = row.querySelector(".ingredient-selected");
  const results = row.querySelector(".ingredient-results");

  if (searchInput) searchInput.value = "";
  if (amountInput) amountInput.value = "";
  if (selected) selected.textContent = "";
  if (results) {
    results.innerHTML = "";
    results.hidden = true;
    results.classList.remove("open");
  }

  delete row.dataset.fdcId;
  delete row.dataset.foodName;
  delete row.dataset.caloriesPer100g;
}

function collectIngredientRows() {
  const rows = document.querySelectorAll("#ingredientRows .ingredient-row");
  const payload = [];

  for (const [index, row] of Array.from(rows).entries()) {
    const foodId = row.dataset.fdcId;
    const foodName = row.dataset.foodName || "";
    const amountInput = row.querySelector(".ingredient-amount");
    const searchInput = row.querySelector(".ingredient-search");
    const searchText = searchInput ? searchInput.value.trim() : "";
    const quantity = amountInput ? Number(amountInput.value) : null;
    const hasFood = Boolean(foodId);
    const hasQuantity = Number.isFinite(quantity) && quantity > 0;

    if (!hasFood && !hasQuantity && !foodName && !searchText && (!amountInput || amountInput.value === "")) {
      continue;
    }

    if (!hasFood) {
      return { ok: false, message: "Please choose a USDA food for each ingredient row." };
    }

    if (!hasQuantity) {
      return { ok: false, message: "Please enter a gram amount for each ingredient row." };
    }

    payload.push({
      usda_food_id: Number(foodId),
      ingredient_name_snapshot: foodName,
      quantity_g: quantity,
      sort_order: index + 1
    });
  }

  if (!payload.length) {
    return { ok: false, message: "Add at least one ingredient row." };
  }

  return { ok: true, rows: payload };
}

function resetRecipeForm() {
  const titleInput = document.getElementById("titleInput");
  const descInput = document.getElementById("descInput");
  const prepInput = document.getElementById("prepInput");
  const costInput = document.getElementById("costInput");
  const dietSelect = document.getElementById("dietSelect");
  const ingredientRows = document.getElementById("ingredientRows");
  const createMsg = document.getElementById("createMsg");

  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";
  if (prepInput) prepInput.value = "";
  if (costInput) costInput.value = "";
  if (dietSelect) dietSelect.value = "";
  if (createMsg) {
    createMsg.textContent = "";
    createMsg.classList.remove("error");
  }

  if (ingredientRows) {
    ingredientRows.innerHTML = "";
  }

  addIngredientRow();
}
