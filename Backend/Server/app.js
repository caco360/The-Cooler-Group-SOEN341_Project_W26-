import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import supabase from "./supabaseClient.js";
import session from "express-session";


const app = express();
app.use(express.json());

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
    .select("id, title, description, prep_time, ingredients, cost, diet_id")
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
    diet_name: r.diet_id ? (dietMap[r.diet_id] || null) : null
  }));

  return res.json({
    ok: true,
    recipes: recipesWithDiet
  });
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

  const { title, description, prep_time, ingredients } = req.body;

  const { error } = await supabase
    .from("Recipes")
    .update({
      title,
      description,
      prep_time,
      ingredients
    })
    .eq("id", recipeId)
    .eq("user_id", userId);   // very important: ownership check

  if (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  return res.json({ ok: true });
});


app.post("/recipes", async (req, res) => {
  const userId=req.session.userId;
  if(!userId){
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  let{title,description="",prep_time=null,ingredients=[],cost=null,diet_id=null}=req.body;

  if(!title|| typeof title !== "string" || !title.trim()){
    return res.status(400).json({ok:false,message:"Title is required"})
  }
title = title.trim();
description = typeof description === "string" ? description.trim() : "";

if(prep_time!=null){
  const time = Number(prep_time); //cast to integer
  if(!Number.isFinite(time) || time<0){
    return res.status(400).json({ok:false,message:"Invalid prep time"})
  }
  prep_time=time;
}

if(cost!=null){
  const temp_cost = Number(cost); //cast to integer
  if(!Number.isFinite(temp_cost) || temp_cost<0){
    return res.status(400).json({ok:false,message:"Invalid cost"})
  }
  cost=temp_cost;
}
 if (!Array.isArray(ingredients)) {
    return res.status(400).json({
      ok: false,
      message: "Ingredients must be an array"
    });
  }
ingredients = ingredients.map(x => String(x).trim());

try{
  const{data,err} = await supabase.from("Recipes").insert([{
    user_id:userId,
    title,
    description,
    prep_time,
    ingredients,
    cost,
    diet_id
  }])
  .select().single();
  if (err) {
      console.error(err);
      return res.status(500).json({
        ok: false,
        message: "Insert failed"
      });
    }

    return res.status(201).json({
      ok: true,
      recipe: data
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
      .select("age, goal, weight, height, bmi")
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
    biometrics: biometrics || {
      age: "",
      goal: "",
      weight: "",
      height: "",
      bmi: ""
    }
  });

});

app.post("/profile-data", async (req, res) => {

  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  const { allergyIds = [], dietIds = [] } = req.body;

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

  return res.json({ ok: true });
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

  const { week_start_date } = req.query;

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
        cost
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

app.post("/meal-planner", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  let { recipe_id, week_start_date, day_of_week, meal_type } = req.body;

  if (!recipe_id || !week_start_date || !day_of_week || !meal_type) {
    return res.status(400).json({
      ok: false,
      message: "recipe_id, week_start_date, day_of_week, and meal_type are required"
    });
  }

  recipe_id = Number(recipe_id);
  day_of_week = String(day_of_week).trim().toLowerCase();
  meal_type = String(meal_type).trim().toLowerCase();

  const validDays = [
    "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday", "sunday"
  ];

  const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];

  if (!Number.isFinite(recipe_id)) {
    return res.status(400).json({
      ok: false,
      message: "Invalid recipe_id"
    });
  }

  if (!validDays.includes(day_of_week)) {
    return res.status(400).json({
      ok: false,
      message: "Invalid day_of_week"
    });
  }

  if (!validMealTypes.includes(meal_type)) {
    return res.status(400).json({
      ok: false,
      message: "Invalid meal_type"
    });
  }

  // Optional but smart: make sure recipe belongs to logged-in user
  const { data: recipe, error: recipeError } = await supabase
    .from("Recipes")
    .select("id")
    .eq("id", recipe_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (recipeError) {
    console.error("RECIPE CHECK ERROR:", recipeError);
    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }

  if (!recipe) {
    return res.status(404).json({
      ok: false,
      message: "Recipe not found"
    });
  }

  const { data, error } = await supabase
    .from("meal_planner")
    .insert([{
      user_id: userId,
      recipe_id,
      week_start_date,
      day_of_week,
      meal_type
    }])
    .select()
    .single();

  if (error) {
    console.error("MEAL PLANNER INSERT ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.status(201).json({
    ok: true,
    meal: data
  });
});

export default app;