document.addEventListener("DOMContentLoaded", init);

    function init() {
      document.getElementById("refreshBtn").addEventListener("click", loadRecipes);
      document.getElementById("addRecipeBtn").addEventListener("click", addRecipe);
      loadRecipes();
    }

    function escapeHtml(str) {
      return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    async function loadRecipes() {
      const statusEl = document.getElementById("status");
      const grid = document.getElementById("recipesGrid");

      statusEl.classList.remove("error");
      statusEl.textContent = "Loading...";
      grid.innerHTML = "";

      // Check session first (matches your profile.js behavior)
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

        if (recipes.length === 0) {
          statusEl.textContent = "No recipes saved yet.";
          return;
        }

        statusEl.textContent = "";

        grid.innerHTML = recipes.map(r => {
          const title = escapeHtml(r.title || "Untitled");
          const desc = r.description ? escapeHtml(r.description) : "";
          const prep = (r.prep_time === null || r.prep_time === undefined || r.prep_time === "")
            ? "—"
            : `${escapeHtml(r.prep_time)} min`;

          const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
          const cost = (r.cost === null || r.cost === undefined) ? "—" : `$${escapeHtml(r.cost)}`;
          const ingHtml = ingredients.length
            ? ingredients.map(i => `<span class="ingredient-pill">${escapeHtml(i)}</span>`).join("")
            : `<span class="muted">No ingredients listed</span>`;

          return `
            <article class="recipe-card" data-id="${r.id}">
              <div class="recipe-top">
                <div class="title-wrap">
                  <h3 class="recipe-title">${title}</h3>
                  <span class="prep-badge">${prep}</span>
                  <span class ="prep-badge">${cost}</span>
                </div>

                <div class="card-actions">
                  <button class="btn-danger" type="button" data-action="delete" data-id="${r.id}">
                    Delete
                  </button>
                </div>
              </div>

              <p class="recipe-desc ${desc ? "" : "muted"}">
                ${desc || "No description"}
              </p>

              <div class="ingredients-block">
                <div class="ingredients-label">Ingredients</div>
                <div class="ingredients-pills">
                  ${ingHtml}
                </div>
              </div>
            </article>
          `;
        }).join("");

        // Wire up delete buttons
        grid.querySelectorAll('button[data-action="delete"]').forEach(btn => {
          btn.addEventListener("click", () => deleteRecipe(btn.dataset.id));
        });

      } catch (err) {
        console.error(err);
        statusEl.classList.add("error");
        statusEl.textContent = "Server error.";
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

        // remove from DOM quickly
        const card = document.querySelector(`.recipe-card[data-id="${recipeId}"]`);
        if (card) card.remove();

        // if none left, show empty state
        const grid = document.getElementById("recipesGrid");
        const statusEl = document.getElementById("status");
        if (!grid.children.length) statusEl.textContent = "No recipes saved yet.";

      } catch (err) {
        console.error(err);
        alert("Server error.");
      }
    }

    async function addRecipe() {
        const msg = document.getElementById("createMsg");
        const title = document.getElementById("titleInput").value.trim();
        const description = document.getElementById("descInput").value.trim();
        const prep_time = document.getElementById("prepInput").value;
        const ingredientsRaw = document.getElementById("ingredientsInput").value;
        const cost = document.getElementById("costInput").value;

        if (!title) {
            msg.textContent = "Title required";
            return;
        }

        const ingredients = ingredientsRaw
            .split("\n")
            .map(i => i.trim())
            .filter(i => i.length > 0);
        
        try{
            const res = await fetch("/recipes",{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            title,
            description,
            prep_time: prep_time ? Number(prep_time) : null,
            ingredients,
            cost: cost ? Number(cost) : null,
            }) 
        });

        const data =await res.json();
        if(!data.ok){
            msg.textContent = data.message || "Failed";
            return;
        }

        msg.textContent = "Added!";
        document.getElementById("titleInput").value = "";
        document.getElementById("descInput").value = "";
        document.getElementById("prepInput").value = "";
        document.getElementById("ingredientsInput").value = "";
        document.getElementById("costInput").value = "";
        loadRecipes();

        }catch(err){
            console.error(err);
            msg.textContent = "Server error";     
        }
    }