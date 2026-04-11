import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import supabase from "./supabaseClient.js";
import session from "express-session";


const app = express();
app.use(express.json());

const USDA_CALORIE_NUTRIENT_ID = 1008;
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

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));


// ---------- Serve your frontend ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../../Frontend"))); 


// Serve the main homepage at root -> Frontend/Home/index.html
app.get("/", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../Frontend/Home/index.html"));
});


app.get("/health", (req, res) =>{
  res.status(200).json({ok:true});
});

//Login endpoint . checks password and username
app.post("/login", async (req, res) => {

  const username = req.body.username.trim();
  const password = req.body.password.trim();

  if (!username || !password) {
    return res.status(400).json({
      ok: false,
      message: "Missing username or password"
    });
  }

  const { data: user, error } = await supabase
    .from("User")
    .select("id, username, password")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }

  if (!user) {
    return res.status(404).json({
      ok: false,
      message: "Invalid username"
    });
  }

  if (user.password === password) {

    req.session.userId = user.id;
    req.session.username = user.username;

    return res.status(200).json({ ok: true, redirectTo: "/profile/profile.html" });

  }

  return res.status(401).json({
    ok: false,
    message: "Wrong password"
  });
});

app.post("/register", async (req, res) => {
  let { username, password, confirmPassword } = req.body;

  username = username.trim();
  password = password.trim();
  confirmPassword = confirmPassword.trim();

  if (!username || !password || !confirmPassword) {
    return res.status(400).json({
      ok: false,
      message: "All fields are required"
    });
  }

  // Check passwords match 
  if (password !== confirmPassword) {
    return res.status(400).json({
      ok: false,
      message: "Passwords do not match"
    });
  }

  // Check if username exists
  const { data: existingUser, error: e1 } = await supabase
    .from("User")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (e1) {
    console.error(e1);
    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }

  if (existingUser) {
    return res.status(409).json({
      ok: false,
      message: "Username already exists"
    });
  }

  // Create user
  const { error: e2 } = await supabase
    .from("User")
    .insert([
      { username, password }
    ]);

  if (e2) {
  console.error("REGISTER ERROR:", e2);

  return res.status(500).json({
    ok: false,
    message: e2.message
  });
}


  return res.json({
    ok: true,
    message: "Account created"
  });

});

app.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }
  return res.json({
    ok: true,
    user: { id: req.session.userId, username: req.session.username }
  });
});

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPositiveNumber(value) {
  const num = toFiniteNumber(value);
  return num !== null && num > 0 ? num : null;
}

function toPositiveInteger(value) {
  const num = toPositiveNumber(value);
  return num !== null ? Math.trunc(num) : null;
}

function normalizeSex(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "male" || normalized === "female") {
    return normalized;
  }

  return null;
}

function normalizeGoal(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const legacyGoalMap = {
    weightLoss: "normal_weight_loss",
    weightGain: "normal_weight_gain",
    recomp: "maintain",
    bulking: "high_weight_gain",
    cutting: "normal_weight_loss",
    rehab: "maintain",
    fasting: "extreme_weight_loss",
    maintenance: "maintain",
    tracking: "maintain",
    balance: "maintain"
  };

  if (goalAdjustments[normalized] !== undefined) {
    return normalized;
  }

  return legacyGoalMap[normalized] || null;
}

function normalizeActivityLevel(value) {
  const normalized = String(value || "").trim();

  if (activityMultipliers[normalized]) {
    return normalized;
  }

  return null;
}

function calculateBiometricsMetrics({ age, sex, weight, height, activityLevel, goal }) {
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

function normalizeUsdaSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenizeUsdaSearch(query) {
  return [...new Set(
    normalizeUsdaSearchText(query)
      .split(/\s+/)
      .filter(token => token.length >= 2)
  )];
}

function scoreUsdaFoodMatch(description, rawQuery, tokens) {
  const normalizedDescription = normalizeUsdaSearchText(description);
  const normalizedQuery = normalizeUsdaSearchText(rawQuery);

  if (!normalizedDescription) {
    return 0;
  }

  let score = 0;

  if (normalizedQuery) {
    if (normalizedDescription === normalizedQuery) score += 1000;
    if (normalizedDescription.startsWith(normalizedQuery)) score += 600;
    if (normalizedDescription.includes(normalizedQuery)) score += 300;
  }

  let allTokensMatch = tokens.length > 0;
  let previousIndex = -1;

  tokens.forEach((token) => {
    const tokenIndex = normalizedDescription.indexOf(token);

    if (tokenIndex === -1) {
      allTokensMatch = false;
      return;
    }

    score += 80;

    if (normalizedDescription.startsWith(token) || normalizedDescription.includes(` ${token}`)) {
      score += 25;
    }

    if (previousIndex !== -1 && tokenIndex > previousIndex) {
      score += 20;
    }

    previousIndex = tokenIndex;
  });

  if (allTokensMatch) {
    score += 250;
  }

  score += Math.max(0, 80 - normalizedDescription.length / 4);

  return score;
}

async function getUsdaFoodLookupByIds(fdcIds) {
  const uniqueIds = [...new Set(
    fdcIds
      .map(id => Number(id))
      .filter(id => Number.isFinite(id))
  )];

  if (!uniqueIds.length) {
    return {
      foodMap: new Map(),
      calorieMap: new Map()
    };
  }

  const [foodsResult, caloriesResult] = await Promise.all([
    supabase
      .from("usda_foods")
      .select("fdc_id, description")
      .in("fdc_id", uniqueIds),

    supabase
      .from("usda_food_nutrients_1008")
      .select("fdc_id, amount")
      .eq("nutrient_id", USDA_CALORIE_NUTRIENT_ID)
      .in("fdc_id", uniqueIds)
  ]);

  if (foodsResult.error) {
    throw foodsResult.error;
  }

  if (caloriesResult.error) {
    throw caloriesResult.error;
  }

  return {
    foodMap: new Map((foodsResult.data || []).map(food => [Number(food.fdc_id), food])),
    calorieMap: new Map((caloriesResult.data || []).map(row => [Number(row.fdc_id), Number(row.amount)]))
  };
}

// ===============================
// Get Logged-In User Recipes
// ===============================
app.get("/my-recipes", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      ok: false,
      message: "Not logged in"
    });
  }

  const { data: recipes, error: recipesError } = await supabase
    .from("Recipes")
    .select("id, title, description, prep_time, ingredients, cost, diet_id, total_calories")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (recipesError) {
    console.error("recipesError:", recipesError);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  const dietIds = [...new Set(
    (recipes || [])
      .map(r => r.diet_id)
      .filter(id => id != null)
  )];

  let dietMap = {};

  if (dietIds.length) {
    const { data: diets, error: dietsError } = await supabase
      .from("diet_preferences")
      .select("id, name")
      .in("id", dietIds);

    if (dietsError) {
      console.error("dietsError:", dietsError);
      return res.status(500).json({ ok: false, message: "Server error" });
    }

    dietMap = Object.fromEntries(diets.map(d => [d.id, d.name]));
  }

  const recipesWithDiet = (recipes || []).map(r => ({
    ...r,
    calories: r.total_calories ?? null,
    diet_name: r.diet_id ? (dietMap[r.diet_id] || null) : null
  }));

  return res.json({
    ok: true,
    recipes: recipesWithDiet
  });
});

app.get("/api/usda-foods/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
  const tokens = tokenizeUsdaSearch(query);

  if (query.length < 2 || !tokens.length) {
    return res.json({ ok: true, foods: [] });
  }

  const fetchSearchResults = async (candidateLimit, matchAllTokens = true) => {
    let searchBuilder = supabase
      .from("usda_foods")
      .select("fdc_id, description");

    if (matchAllTokens) {
      tokens.forEach((token) => {
        searchBuilder = searchBuilder.ilike("description", `%${token}%`);
      });
    } else {
      const tokenFilters = tokens.map(token => `description.ilike.%${token}%`);
      searchBuilder = searchBuilder.or(tokenFilters.join(","));
    }

    const { data: candidates, error: foodError } = await searchBuilder.limit(candidateLimit);

    if (foodError) {
      throw foodError;
    }

    const candidateIds = [...new Set(
      (candidates || [])
        .map(food => Number(food.fdc_id))
        .filter(id => Number.isFinite(id))
    )];

    if (!candidateIds.length) {
      return [];
    }

    const { calorieMap } = await getUsdaFoodLookupByIds(candidateIds);

    return (candidates || [])
      .map((food) => {
        const fdcId = Number(food.fdc_id);
        const calories = calorieMap.get(fdcId);

        if (!Number.isFinite(fdcId) || !Number.isFinite(calories)) {
          return null;
        }

        return {
          fdc_id: fdcId,
          description: food.description || "",
          calories_per_100g: calories,
          _score: scoreUsdaFoodMatch(food.description || "", query, tokens)
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        b._score - a._score ||
        a.description.localeCompare(b.description) ||
        a.fdc_id - b.fdc_id
      );
  };

  const candidateLimit = Math.min(Math.max(limit * 40, 180), 400);

  let result;
  try {
    result = await fetchSearchResults(candidateLimit, true);

    if (result.length < limit) {
      const fallback = await fetchSearchResults(500, false);
      const seenIds = new Set(result.map(food => food.fdc_id));

      result = result.concat(
        fallback.filter(food => !seenIds.has(food.fdc_id))
      );
    }
  } catch (foodError) {
    console.error("USDA SEARCH ERROR:", foodError);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  result = result
    .slice(0, limit)
    .map(({ _score, ...food }) => food);

  return res.json({ ok: true, foods: result });
});

// ===============================
// Delete a recipe (only if owned by user)
// ===============================
app.delete("/recipes/:id", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  const recipeId = Number(req.params.id);

  if (!Number.isFinite(recipeId)) {
    return res.status(400).json({ ok: false, message: "Invalid recipe id" });
  }

  const { error } = await supabase
    .from("Recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", userId); // prevents deleting another user's recipe

  if (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  return res.json({ ok: true });
});
// ===============================
// Update a recipe (only if owned by user)
// ===============================
app.put("/recipes/:id", async (req, res) => {

  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  const recipeId = Number(req.params.id);

  if (!Number.isFinite(recipeId)) {
    return res.status(400).json({ ok: false, message: "Invalid recipe id" });
  }

  const {
    title,
    description,
    prep_time,
    ingredients,
    cost,
    diet_id,
    total_calories
  } = req.body;

  const updates = {};

  if (title !== undefined) {
    const cleanTitle = String(title).trim();
    if (!cleanTitle) {
      return res.status(400).json({ ok: false, message: "Title is required" });
    }
    updates.title = cleanTitle;
  }

  if (description !== undefined) {
    updates.description = String(description).trim();
  }

  if (prep_time !== undefined) {
    const time = toFiniteNumber(prep_time);
    if (time !== null && time < 0) {
      return res.status(400).json({ ok: false, message: "Invalid prep time" });
    }
    updates.prep_time = time;
  }

  if (ingredients !== undefined) {
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ ok: false, message: "Ingredients must be an array" });
    }
    updates.ingredients = ingredients.map(item => String(item).trim()).filter(Boolean);
  }

  if (cost !== undefined) {
    const cleanCost = toFiniteNumber(cost);
    if (cleanCost !== null && cleanCost < 0) {
      return res.status(400).json({ ok: false, message: "Invalid cost" });
    }
    updates.cost = cleanCost;
  }

  if (diet_id !== undefined) {
    updates.diet_id = toFiniteNumber(diet_id);
  }

  if (total_calories !== undefined) {
    const cleanCalories = toFiniteNumber(total_calories);
    if (cleanCalories !== null && cleanCalories < 0) {
      return res.status(400).json({ ok: false, message: "Invalid calories" });
    }
    updates.total_calories = cleanCalories;
  }

  const { error } = await supabase
    .from("Recipes")
    .update(updates)
    .eq("id", recipeId)
    .eq("user_id", userId);   // very important: ownership check

  if (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  return res.json({ ok: true });
});


app.post("/recipes", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  let {
    title,
    description = "",
    prep_time = null,
    ingredients = [],
    ingredientRows = [],
    cost = null,
    diet_id = null,
    calories = null
  } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ ok: false, message: "Title is required" });
  }
  title = title.trim();
  description = typeof description === "string" ? description.trim() : "";

  const cleanPrepTime = toFiniteNumber(prep_time);
  if (cleanPrepTime !== null && cleanPrepTime < 0) {
    return res.status(400).json({ ok: false, message: "Invalid prep time" });
  }
  prep_time = cleanPrepTime;

  const cleanCost = toFiniteNumber(cost);
  if (cleanCost !== null && cleanCost < 0) {
    return res.status(400).json({ ok: false, message: "Invalid cost" });
  }
  cost = cleanCost;

  const cleanDietId = toFiniteNumber(diet_id);
  diet_id = cleanDietId;

  const rawStructuredRows = Array.isArray(ingredientRows) ? ingredientRows : [];
  const legacyIngredients = Array.isArray(ingredients) ? ingredients : [];
  let structuredRows = [];
  let totalCalories = toFiniteNumber(calories);

  if (rawStructuredRows.length) {
    const normalizedRows = rawStructuredRows.map((row, index) => {
      const usdaFoodId = toFiniteNumber(row?.usda_food_id);
      const quantityG = toFiniteNumber(row?.quantity_g);
      const sortOrder = toFiniteNumber(row?.sort_order) ?? index + 1;
      const ingredientNameSnapshot = String(
        row?.ingredient_name_snapshot || row?.food_name || row?.description || ""
      ).trim();

      if (!usdaFoodId) {
        throw new Error("Each ingredient must include a USDA food id");
      }

      if (!quantityG || quantityG <= 0) {
        throw new Error("Each ingredient must include a quantity in grams");
      }

      return {
        usda_food_id: usdaFoodId,
        quantity_g: quantityG,
        sort_order: sortOrder,
        ingredient_name_snapshot: ingredientNameSnapshot
      };
    });

    try {
      const { foodMap, calorieMap } = await getUsdaFoodLookupByIds(
        normalizedRows.map(row => row.usda_food_id)
      );

      structuredRows = normalizedRows.map(row => {
        const food = foodMap.get(row.usda_food_id);
        const caloriesPer100g = calorieMap.get(row.usda_food_id);

        if (!food) {
          throw new Error("One or more selected USDA foods could not be found");
        }

        if (!Number.isFinite(caloriesPer100g)) {
          throw new Error(`Calories are missing for ${food.description}`);
        }

        const calculatedCalories = Number(((row.quantity_g / 100) * caloriesPer100g).toFixed(2));

        return {
          recipe_id: null,
          usda_food_id: row.usda_food_id,
          ingredient_name_snapshot: row.ingredient_name_snapshot || food.description,
          quantity_g: row.quantity_g,
          calculated_calories: calculatedCalories,
          sort_order: row.sort_order,
          calories_per_100g: caloriesPer100g
        };
      });

      totalCalories = structuredRows.reduce((sum, row) => sum + Number(row.calculated_calories || 0), 0);
      totalCalories = Number(totalCalories.toFixed(2));

      ingredients = structuredRows.map(row => row.ingredient_name_snapshot);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ ok: false, message: error.message });
      }
      console.error(error);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  } else {
    ingredients = legacyIngredients.map(x => String(x).trim()).filter(Boolean);

    if (!Number.isFinite(totalCalories)) {
      totalCalories = null;
    }
  }

  try {
    const { data: recipe, error: insertError } = await supabase
      .from("Recipes")
      .insert([{
        user_id: userId,
        title,
        description,
        prep_time,
        ingredients,
        cost,
        diet_id,
        total_calories: totalCalories
      }])
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({
        ok: false,
        message: "Insert failed"
      });
    }

    if (structuredRows.length) {
      const ingredientInsertRows = structuredRows.map(row => ({
        recipe_id: recipe.id,
        usda_food_id: row.usda_food_id,
        ingredient_name_snapshot: row.ingredient_name_snapshot,
        quantity_g: row.quantity_g,
        calculated_calories: row.calculated_calories,
        sort_order: row.sort_order
      }));

      const { error: ingredientError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientInsertRows);

      if (ingredientError) {
        console.error(ingredientError);
        await supabase.from("Recipes").delete().eq("id", recipe.id);
        return res.status(500).json({
          ok: false,
          message: "Could not save recipe ingredients"
        });
      }
    }

    return res.status(201).json({
      ok: true,
      recipe: {
        ...recipe,
        total_calories: recipe.total_calories ?? totalCalories ?? null
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }

});


// ===============================
// Add Allergy or Diet Option
// ===============================
app.post("/api/add-option", async (req, res) => {

  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      ok: false,
      message: "Not logged in"
    });
  }

  let { type, name } = req.body;

  if (!type || !name) {
    return res.status(400).json({
      ok: false,
      message: "Missing type or name"
    });
  }

  type = type.trim().toLowerCase();
  name = name.trim();

  let table;

  if (type === "allergy") {
    table = "allergies";
  } else if (type === "diet") {
    table = "diet_preferences";
  } else {
    return res.status(400).json({
      ok: false,
      message: "Invalid type"
    });
  }

  try {

    // Check if already exists
    const { data: existing, error: e1 } = await supabase
      .from(table)
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (e1) {
      console.error(e1);
      return res.status(500).json({
        ok: false,
        message: "Server error"
      });
    }

    // If exists → return it
    if (existing) {
      return res.json({
        ok: true,
        id: existing.id,
        existed: true
      });
    }

    // Insert new
    const { data: inserted, error: e2 } = await supabase
      .from(table)
      .insert([{ name }])
      .select("id")
      .single();

    if (e2) {
      console.error(e2);
      return res.status(500).json({
        ok: false,
        message: "Insert failed"
      });
    }

    return res.json({
      ok: true,
      id: inserted.id,
      existed: false
    });

  } catch (err) {

    console.error("ADD OPTION ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }
});


app.get("/profile-data", async (req,res)=>{
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  const [
    {data: allergies, error: e1},
    {data : diets, error: e2},
    {data: userAllergies, error: e3},
    {data: userDiets, error: e4},
    { data: biometrics, error: e5 }
  ]= await Promise.all([
    supabase
      .from("allergies")
      .select("id, name")
      .order("name"),

    supabase
      .from("diet_preferences")
      .select("id, name")
      .order("name"),

    supabase
      .from("user_allergies")
      .select("allergy_id")
      .eq("user_id", userId),

    supabase
      .from("user_diet_preferences")
      .select("diet_preference_id")
      .eq("user_id", userId),

      supabase
      .from("Biometrics")
      .select("age, sex, goal, activity_level, weight, height, bmi, calorie_goal")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  if (e1 || e2 || e3 || e4 || e5) {
    console.error(e1 || e2 || e3 || e4 || e5);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  return res.json({
    ok: true,
    allergies,
    diets,
    selectedAllergyIds: userAllergies.map(a => a.allergy_id),
    selectedDietIds: userDiets.map(d => d.diet_preference_id),
    biometrics: biometrics ? {
      ...biometrics,
      sex: normalizeSex(biometrics.sex) || "",
      goal: normalizeGoal(biometrics.goal) || "",
      activity_level: normalizeActivityLevel(biometrics.activity_level) || "",
      bmi: biometrics.bmi ?? "",
      calorie_goal: biometrics.calorie_goal ?? ""
    } : {
      age: "",
      sex: "",
      goal: "",
      activity_level: "",
      weight: "",
      height: "",
      bmi: "",
      calorie_goal: ""
    }
  });

});

app.post("/profile-data", async (req, res) => {

  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  const { allergyIds = [], dietIds = [], biometrics = {} } = req.body;

  const age = toPositiveInteger(biometrics.age);
  const sex = normalizeSex(biometrics.sex);
  const goal = normalizeGoal(biometrics.goal);
  const activityLevel = normalizeActivityLevel(
    biometrics.activityLevel ?? biometrics.activity_level
  );
  const weight = toPositiveNumber(biometrics.weight);
  const height = toPositiveNumber(biometrics.height);
  const { bmi, calorieGoal } = calculateBiometricsMetrics({
    age,
    sex,
    weight,
    height,
    activityLevel,
    goal
  });
  // Remove old mappings
  const delA = await supabase
    .from("user_allergies")
    .delete()
    .eq("user_id", userId);

  const delD = await supabase
    .from("user_diet_preferences")
    .delete()
    .eq("user_id", userId);

  if (delA.error || delD.error) {
    console.error(delA.error || delD.error);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  // Insert new mappings
  const allergyRows = allergyIds.map(id => ({
    user_id: userId,
    allergy_id: id
  }));

  const dietRows = dietIds.map(id => ({
    user_id: userId,
    diet_preference_id: id
  }));

  if (allergyRows.length) {
    const insA = await supabase
      .from("user_allergies")
      .insert(allergyRows);

    if (insA.error) {
      console.error(insA.error);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  }

  if (dietRows.length) {
    const insD = await supabase
      .from("user_diet_preferences")
      .insert(dietRows);

    if (insD.error) {
      console.error(insD.error);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  }

  const bioUpsert = await supabase
    .from("Biometrics")
    .upsert(
      {
        user_id: userId,
        age,
        sex,
        goal,
        activity_level: activityLevel,
        weight,
        height,
        bmi,
        calorie_goal: calorieGoal
      },
      { onConflict: "user_id" }
    );

  if (bioUpsert.error) {
    console.error(bioUpsert.error);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
  return res.json({
    ok: true,
    biometrics: {
      age: age ?? "",
      sex: sex ?? "",
      goal: goal ?? "",
      activity_level: activityLevel ?? "",
      weight: weight ?? "",
      height: height ?? "",
      bmi: bmi ?? "",
      calorie_goal: calorieGoal ?? ""
    }
  });
});

// logout code
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ ok: false, message: "Server error" });
    }
    res.clearCookie("connect.sid"); 
    return res.json({ ok: true });
  });
});

// Delete Account
app.delete("/api/delete-account", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  try {
    // Erase user from Supabase 'User' table
    const { error } = await supabase
      .from("User")
      .delete()
      .eq("id", userId);

    if (error) throw error;

    // Destroy the session so the user is fully logged out
    req.session.destroy((err) => {
      if (err) console.error("Session cleanup error:", err);
      res.clearCookie("connect.sid");
      return res.json({ ok: true });
    });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error during deletion" });
  }
});

app.get("/test-diet", async (req, res) => {
  const { data, error } = await supabase
    .from("Recipes")
    .select(`
      id,
      title,
      diet_id,
      diet_preferences!Recipes_diet_id_fkey (
        id,
        name
      )
    `);



  res.json({ data, error });
});

//-----------------Meal planner----------------------
app.get("/meal-planner", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  let { week_start_date } = req.query;

  week_start_date = new Date(week_start_date)
  .toISOString()
  .split("T")[0];

  if (!week_start_date) {
    return res.status(400).json({
      ok: false,
      message: "week_start_date is required"
    });
  }

  const { data, error } = await supabase
    .from("meal_planner")
    .select(`
      id,
      week_start_date,
      day_of_week,
      meal_type,
      recipe_id,
      Recipes (
        id,
        title,
        description,
        prep_time,
        cost,
        total_calories
      )
    `)
    .eq("user_id", userId)
    .eq("week_start_date", week_start_date)
    .order("day_of_week", { ascending: true });

  if (error) {
    console.error("MEAL PLANNER GET ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }

  return res.json({
    ok: true,
    meals: data
  });
});


// app.post("/meal-planner", async (req, res) => {
//   const userId = req.session.userId;

//   if (!userId) {
//     return res.status(401).json({ ok: false, message: "Not logged in" });
//   }

//   let { recipe_id, week_start_date, day_of_week, meal_type } = req.body;

//   recipe_id = Number(recipe_id);

//   try {
//     // 1. Check if slot already exists
//     const { data: existing, error: findError } = await supabase
//       .from("meal_planner")
//       .select("id")
//       .eq("user_id", userId)
//       .eq("week_start_date", week_start_date)
//       .eq("day_of_week", day_of_week)
//       .eq("meal_type", meal_type)
//       .maybeSingle();

//     if (findError) {
//       console.error(findError);
//       return res.status(500).json({ ok: false, message: "Server error" });
//     }
//        // 2. Check duplicate recipe in same day
//     const { data: duplicate, error: dupError } = await supabase
//       .from("meal_planner")
//       .select("id")
//       .eq("user_id", userId)
//       .eq("week_start_date", week_start_date)
//       .eq("day_of_week", day_of_week)
//       .eq("recipe_id", recipe_id)
//       .maybeSingle();

//     if (dupError) {
//       console.error(dupError);
//       return res.status(500).json({ ok: false, message: "Server error" });
//     }

//     if (duplicate && (!existing || duplicate.id !== existing.id)) {
//       return res.status(400).json({
//         ok: false,
//         message: "This recipe is already used on that day"
//       });
//     }

//     let result;

//     if (existing) {
//       // 3. UPDATE existing slot
//       const { data, error } = await supabase
//         .from("meal_planner")
//         .update({ recipe_id })
//         .eq("id", existing.id)
//         .select()
//         .single();

//       if (error) throw error;

//       result = data;

//     } else {
//       // 4. INSERT new slot
//       const { data, error } = await supabase
//         .from("meal_planner")
//         .insert([{
//           user_id: userId,
//           recipe_id,
//           week_start_date,
//           day_of_week,
//           meal_type
//         }])
//         .select()
//         .single();

//       if (error) throw error;

//       result = data;
//     }

//     return res.json({ ok: true, meal: result });

//   } catch (err) {
//     console.error("MEAL UPSERT ERROR:", err);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });
app.post("/meal-planner", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  let { recipe_id, week_start_date, day_of_week, meal_type } = req.body;

  recipe_id = Number(recipe_id);

  week_start_date = new Date(week_start_date)
  .toISOString()
  .split("T")[0];
  if (!recipe_id) {
  const { error } = await supabase
    .from("meal_planner")
    .delete()
    .eq("user_id", userId)
    .eq("week_start_date", week_start_date)
    .eq("day_of_week", day_of_week)
    .eq("meal_type", meal_type);

  if (error) {
    console.error("DELETE SLOT ERROR:", error);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  return res.json({ ok: true, removed: true });
}

  if (!recipe_id || !week_start_date || !day_of_week || !meal_type) {
    return res.status(400).json({
      ok: false,
      message: "Missing required fields"
    });
  }

  try {
    // -------------------------------
    // 1. Prevent same recipe same day
    // -------------------------------
    const { data: duplicate, error: dupError } = await supabase
      .from("meal_planner")
      .select("id")
      .eq("user_id", userId)
      .eq("week_start_date", week_start_date)
      .eq("day_of_week", day_of_week)
      .eq("recipe_id", recipe_id)
      .maybeSingle();

    if (dupError) {
      console.error("DUPLICATE CHECK ERROR:", dupError);
      return res.status(500).json({ ok: false, message: "Server error" });
    }

    if (duplicate) {
      return res.status(400).json({
        ok: false,
        message: "This recipe is already used on that day"
      });
    }

    // -------------------------------
    // 2. UPSERT (insert or update slot)
    // -------------------------------
    const { data, error } = await supabase
      .from("meal_planner")
      .upsert(
        [{
          user_id: userId,
          recipe_id,
          week_start_date,
          day_of_week,
          meal_type
        }],
        {
          onConflict: "user_id,week_start_date,day_of_week,meal_type"
        }
      )
      .select()
      .single();

    if (error) {
      console.error("UPSERT ERROR:", error);
      return res.status(500).json({ ok: false, message: "Server error" });
    }

    return res.json({
      ok: true,
      meal: data
    });

  } catch (err) {
    console.error("MEAL UPSERT ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
export {
  activityMultipliers,
  goalAdjustments,
  normalizeActivityLevel,
  normalizeGoal,
  normalizeSex,
  calculateBiometricsMetrics
};

export default app;
