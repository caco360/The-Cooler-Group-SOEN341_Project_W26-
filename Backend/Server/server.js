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

app.get("/profile-data", async (req,res)=>{
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  const [
    {data: allergies, error: e1},
    {data : diets, error: e2},
    {data: userAllergies, error: e3},
    {data: userDiets, error: e4}
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
      .eq("user_id", userId)
  ]);

  if (e1 || e2 || e3 || e4) {
    console.error(e1 || e2 || e3 || e4);
    return res.status(500).json({ ok: false, message: "Server error" });
  }

  return res.json({
    ok: true,
    allergies,
    diets,
    selectedAllergyIds: userAllergies.map(a => a.allergy_id),
    selectedDietIds: userDiets.map(d => d.diet_preference_id)
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

