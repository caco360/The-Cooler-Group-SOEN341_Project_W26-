document.addEventListener("DOMContentLoaded", init);

function init() {
  // --- Refresh ---
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadRecipes);

  // --- Add Recipe (File 2 feature) ---
  const addRecipeBtn = document.getElementById("addRecipeBtn");
  if (addRecipeBtn) addRecipeBtn.addEventListener("click", addRecipe);

  // --- Search ---
  const searchEl = document.getElementById("recipeSearch");
  if (searchEl) {
    function debounce(fn, wait = 200) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    }

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

  // --- Filter Modal ---
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
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  loadRecipes();
  loadDietPreferences().then(renderDietOptions);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadRecipes() {
  const statusEl = document.getElementById("status");
  const grid = document.getElementById("recipesGrid");

  statusEl.classList.remove("error");
  statusEl.textContent = "Loading...";
  grid.innerHTML = "";

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
      statusEl.classList.add("error");
      statusEl.textContent = "Could not load recipes.";
      return;
    }

    const recipes = data.recipes || [];
    window._recipes = recipes;

    if (!recipes.length) {
      statusEl.textContent = "No recipes saved yet.";
      grid.innerHTML = "";
      return;
    }

    statusEl.textContent = "";
    console.log(recipes);
    renderRecipes(recipes, "", null, null);

  } catch (err) {
    console.error(err);
    statusEl.classList.add("error");
    statusEl.textContent = "Server error.";
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

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
  const minN = (costMin === null || costMin === "") ? null : Number(costMin);
  const maxN = (costMax === null || costMax === "") ? null : Number(costMax);

  const filtered = recipes.filter(r => {
    const nameMatch = nameFilterActive
      ? (r.title || "").toLowerCase().includes(q)
      : false;

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
        const tMinN = (timeMin === "" || timeMin === null) ? null : Number(timeMin);
        const tMaxN = (timeMax === "" || timeMax === null) ? null : Number(timeMax);
        if (tMinN !== null && t < tMinN) timeMatch = false;
        if (tMaxN !== null && t > tMaxN) timeMatch = false;
      }
    }

    return (
      useOr
        ? (nameFilterActive && nameMatch) || (costFilterActive && costMatch)
        : (!nameFilterActive || nameMatch) && (!costFilterActive || costMatch)
    ) && timeMatch;
  });

  if (!filtered.length) {
    statusEl.textContent = recipes.length ? "No recipes match your search." : "No recipes saved yet.";
    grid.innerHTML = "";
    return;
  }

  statusEl.textContent = "";

  grid.innerHTML = filtered.map(r => {
    const title = escapeHtml(r.title || "Untitled");
    const desc = r.description ? escapeHtml(r.description) : "";
    const prep = (r.prep_time === null || r.prep_time === undefined || r.prep_time === "")
      ? "—"
      : `${escapeHtml(r.prep_time)} min`;
    const cost = (r.cost === null || r.cost === undefined) ? "—" : `$${escapeHtml(r.cost)}`;
    const calories = (r.calories === null || r.calories === undefined) ? "—" : `${escapeHtml(r.calories)} cal`;
    const diet = r.diet_name || "No dietary pref";
    const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
    const ingHtml = ingredients.length
      ? ingredients.map(i => `<span class="ingredient-pill">${escapeHtml(i)}</span>`).join("")
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
  }).join("");

  grid.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener("click", () => deleteRecipe(btn.dataset.id));
  });

  grid.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });
}

// ---------------------------------------------------------------------------
// Add Recipe (from File 2)
// ---------------------------------------------------------------------------

async function addRecipe() {
  const msg = document.getElementById("createMsg");
  const title = document.getElementById("titleInput")?.value.trim();
  const description = document.getElementById("descInput")?.value.trim();
  const prep_time = document.getElementById("prepInput")?.value;
  const ingredientsRaw = document.getElementById("ingredientsInput")?.value;
  const cost = document.getElementById("costInput")?.value;
  const calories = document.getElementById("caloriesInput")?.value;
  const diet_id = document.getElementById("dietSelect").value;

  if (!title) {
    if (msg) msg.textContent = "Title required";
    return;
  }

  const ingredients = (ingredientsRaw || "")
    .split("\n")
    .map(i => i.trim())
    .filter(i => i.length > 0);

  try {
    const res = await fetch("/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        prep_time: prep_time ? Number(prep_time) : null,
        ingredients,
        cost: cost ? Number(cost) : null,
        calories: calories ? Number(calories) : null,
        diet_id: diet_id ? Number(diet_id) : null
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      if (msg) msg.textContent = data.message || "Failed";
      return;
    }

    if (msg) msg.textContent = "Added!";
    if (document.getElementById("titleInput")) document.getElementById("titleInput").value = "";
    if (document.getElementById("descInput")) document.getElementById("descInput").value = "";
    if (document.getElementById("prepInput")) document.getElementById("prepInput").value = "";
    if (document.getElementById("ingredientsInput")) document.getElementById("ingredientsInput").value = "";
    if (document.getElementById("costInput")) document.getElementById("costInput").value = "";
    if (document.getElementById("caloriesInput")) document.getElementById("caloriesInput").value = "";

    loadRecipes();

  } catch (err) {
    console.error(err);
    if (msg) msg.textContent = "Server error";
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

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

    window._recipes = (window._recipes || []).filter(r => String(r.id) !== String(recipeId));

    const q = (document.getElementById("recipeSearch")?.value || "").trim();
    renderRecipes(window._recipes, q);

  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}

// ---------------------------------------------------------------------------
// Edit in place (from File 1)
// ---------------------------------------------------------------------------

function startEdit(recipeId) {
  const card = document.querySelector(`.recipe-card[data-id="${recipeId}"]`);
  const recipe = (window._recipes || []).find(r => r.id == recipeId);
  if (!card || !recipe) return;

  const titleEl = card.querySelector(".recipe-title");
  const descEl  = card.querySelector(".recipe-desc");
  const badges = card.querySelectorAll(".prep-badge");
  const prepEl = badges[0];
  const costEl = badges[1];
  const caloriesEl = badges[2];

  titleEl.outerHTML =
    `<input class="edit-title" value="${escapeHtml(recipe.title || "")}">`;

  descEl.outerHTML =
    `<textarea class="edit-desc" rows="2">${escapeHtml(recipe.description || "")}</textarea>`;

  // Replace only the first prep-badge (prep time), leave cost badge alone
  prepEl.outerHTML =
    `<span class="prep-badge">
       <input class="edit-prep" type="number" value="${recipe.prep_time ?? ""}" style="width:60px"> min
     </span>`;
  caloriesEl.outerHTML =
  `<span class="prep-badge">
     <input class="edit-calories" type="number" value="${recipe.calories ?? ""}" style="width:70px"> cal
   </span>`;
  const ingBlock = card.querySelector(".ingredients-pills");
  const ingValue = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).join(", ");
  ingBlock.innerHTML =
    `<input class="edit-ingredients" value="${escapeHtml(ingValue)}">`;

  const actions = card.querySelector(".card-actions");
  actions.insertAdjacentHTML(
    "afterbegin",
    `<button class="btn-secondary" type="button" data-action="save" data-id="${recipeId}">Save</button>`
  );
  actions.querySelector('button[data-action="edit"]').remove();
  actions.querySelector('button[data-action="save"]').addEventListener("click", () => saveRecipe(card));
}
async function saveRecipe(card) {
  const id = card.dataset.id;

  const payload = {
    title: card.querySelector(".edit-title").value.trim(),
    description: card.querySelector(".edit-desc").value.trim(),
    prep_time: Number(card.querySelector(".edit-prep").value),
    ingredients: card.querySelector(".edit-ingredients")
      .value.split(",")
      .map(v => v.trim())
      .filter(Boolean),
  };
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

  if (!select) return; // safety

  select.innerHTML = `<option value="">No diet</option>`;

  diets.forEach(d => {
    const option = document.createElement("option");
    option.value = d.id;
    option.textContent = d.name;
    select.appendChild(option);
  });
}