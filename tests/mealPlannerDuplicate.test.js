import request from "supertest";
import app from "../backend/server/app.js";

describe("Meal Planner duplicate behavior", () => {

  const agent = request.agent(app);
  let recipe1, recipe2;

  const WEEK = `2026-03-${Math.floor(Math.random() * 20 + 1)}`;

  beforeAll(async () => {
    // login (same pattern as your other tests)
    const res = await agent.post("/login").send({
      username: "Carl",
      password: "Dog123"
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // create two recipes
    const r1 = await agent.post("/recipes").send({
      title: `Recipe A ${Date.now()}`,
      prep_time: 10,
      ingredients: ["a"]
    });

    const r2 = await agent.post("/recipes").send({
      title: `Recipe B ${Date.now()}`,
      prep_time: 10,
      ingredients: ["b"]
    });

    recipe1 = r1.body.recipe.id;
    recipe2 = r2.body.recipe.id;
  });

  afterAll(async () => {
    await agent.post("/meal-planner").send({
      recipe_id: null,
      week_start_date: WEEK,
      day_of_week: "monday",
      meal_type: "lunch"
    });

    await agent.post("/meal-planner").send({
      recipe_id: null,
      week_start_date: WEEK,
      day_of_week: "tuesday",
      meal_type: "breakfast"
    });

    if (recipe1) {
      await agent.delete(`/recipes/${recipe1}`);
    }

    if (recipe2) {
      await agent.delete(`/recipes/${recipe2}`);
    }
  });

  // -------------------------------
  // ✅ TEST 1: SAME SLOT → UPDATE
  // -------------------------------
  test("should update same slot instead of duplicating", async () => {

    // First insert
    const res1 = await agent.post("/meal-planner").send({
      recipe_id: recipe1,
      week_start_date: WEEK,
      day_of_week: "monday",
      meal_type: "lunch"
    });

    expect(res1.status).toBe(200);
    expect(res1.body.ok).toBe(true);

    // Second insert SAME SLOT (different recipe)
    const res2 = await agent.post("/meal-planner").send({
      recipe_id: recipe2,
      week_start_date: WEEK,
      day_of_week: "monday",
      meal_type: "lunch"
    });

    expect(res2.status).toBe(200);
    expect(res2.body.ok).toBe(true);

    // Fetch planner
    const res3 = await agent
      .get("/meal-planner")
      .query({ week_start_date: WEEK });

    const meals = res3.body.meals;

    // Only ONE meal in that slot
    const mondayLunch = meals.filter(
      m => m.day_of_week === "monday" && m.meal_type === "lunch"
    );

    expect(mondayLunch.length).toBe(1);
    expect(mondayLunch[0].recipe_id).toBe(recipe2); // updated
  });

  // -----------------------------------------
  // ❌ TEST 2: SAME RECIPE SAME DAY → REJECT
  // -----------------------------------------
  test("should reject duplicate recipe in same day", async () => {

    // Insert breakfast
    const res1 = await agent.post("/meal-planner").send({
      recipe_id: recipe1,
      week_start_date: WEEK,
      day_of_week: "tuesday",
      meal_type: "breakfast"
    });

    expect(res1.status).toBe(200);
    expect(res1.body.ok).toBe(true);

    // Try SAME recipe, different slot (same day)
    const res2 = await agent.post("/meal-planner").send({
      recipe_id: recipe1,
      week_start_date: WEEK,
      day_of_week: "tuesday",
      meal_type: "dinner"
    });

    expect(res2.status).toBe(400);
    expect(res2.body.ok).toBe(false);
    expect(res2.body.message).toMatch(/already used/i);
  });

});
