import request from "supertest";
import app from "../Backend/Server/app.js";

describe("Meal Planner flow", () => {
  const WEEK = `2026-03-${Math.floor(Math.random() * 20 + 1)}`;

  const agent = request.agent(app);
  let recipeId;

  beforeAll(async () => {
    const res = await agent.post("/login").send({
      username: "Carl",
      password: "Dog123"
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("Create recipe for planner", async () => {
    const res = await agent.post("/recipes").send({
      title: `Planner Test ${Date.now()}`,
      description: "Meal planner test recipe",
      prep_time: 10,
      ingredients: ["Test"],
      cost: 5
    });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);

    recipeId = res.body.recipe.id;
    expect(recipeId).toBeDefined();
  });

  test("Add recipe to meal planner", async () => {
    const res = await agent.post("/meal-planner").send({
      recipe_id: recipeId,
      week_start_date: WEEK,
      day_of_week: "monday",
      meal_type: "lunch"
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meal.recipe_id).toBe(recipeId);
  });

  test("Verify meal planner entry exists", async () => {
    const res = await agent
      .get("/meal-planner")
      .query({ week_start_date: WEEK });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const meals = res.body.meals;

    const found = meals.find(
  m => Number(m.recipe_id) === Number(recipeId)
);

    expect(found).toBeDefined();
    expect(found.day_of_week).toBe("monday");
    expect(found.meal_type).toBe("lunch");
  });

});