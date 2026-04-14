import request from "supertest";
import app from "../backend/server/app.js";

describe("Meal planner daily calories vs goal", () => {
  const agent = request.agent(app);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const username = `planner-goal-${suffix}`;
  const password = "Dog123";
  const weekStartDate = "2026-04-06";

  let breakfastRecipeId;
  let lunchRecipeId;

  beforeAll(async () => {
    const registerRes = await agent.post("/register").send({
      username,
      password,
      confirmPassword: password
    });

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.ok).toBe(true);

    const loginRes = await agent.post("/login").send({
      username,
      password
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.ok).toBe(true);

    const profileRes = await agent.post("/profile-data").send({
      allergyIds: [],
      dietIds: [],
      biometrics: {
        age: 25,
        sex: "male",
        goal: "maintain",
        activityLevel: "moderate_3_5_days",
        weight: 70,
        height: 1.75
      }
    });

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.ok).toBe(true);

    const breakfastRecipeRes = await agent.post("/recipes").send({
      title: `Breakfast ${suffix}`,
      description: "Planner calorie goal breakfast",
      prep_time: 10,
      ingredients: ["Eggs"],
      calories: 600
    });

    expect(breakfastRecipeRes.status).toBe(201);
    expect(breakfastRecipeRes.body.ok).toBe(true);
    breakfastRecipeId = breakfastRecipeRes.body.recipe.id;
      const lunchRecipeRes = await agent.post("/recipes").send({
      title: `Lunch ${suffix}`,
      description: "Planner calorie goal lunch",
      prep_time: 15,
      ingredients: ["Rice"],
      calories: 900
    });

    expect(lunchRecipeRes.status).toBe(201);
    expect(lunchRecipeRes.body.ok).toBe(true);
    lunchRecipeId = lunchRecipeRes.body.recipe.id;
  });

  afterAll(async () => {
    await agent.post("/meal-planner").send({
      recipe_id: null,
      week_start_date: weekStartDate,
      day_of_week: "monday",
      meal_type: "breakfast"
    });

    await agent.post("/meal-planner").send({
      recipe_id: null,
      week_start_date: weekStartDate,
      day_of_week: "monday",
      meal_type: "lunch"
    });

    if (breakfastRecipeId) {
      await agent.delete(`/recipes/${breakfastRecipeId}`);
    }

    if (lunchRecipeId) {
      await agent.delete(`/recipes/${lunchRecipeId}`);
    }

    await agent.delete("/api/delete-account");
  });

  test("recipes added to one day can be totaled against the saved calorie goal", async () => {
    const addBreakfastRes = await agent.post("/meal-planner").send({
      recipe_id: breakfastRecipeId,
      week_start_date: weekStartDate,
      day_of_week: "monday",
      meal_type: "breakfast"
    });

    expect(addBreakfastRes.status).toBe(200);
    expect(addBreakfastRes.body.ok).toBe(true);

    const addLunchRes = await agent.post("/meal-planner").send({
      recipe_id: lunchRecipeId,
      week_start_date: weekStartDate,
      day_of_week: "monday",
      meal_type: "lunch"
    });

    expect(addLunchRes.status).toBe(200);
    expect(addLunchRes.body.ok).toBe(true);

    const plannerRes = await agent
      .get("/meal-planner")
      .query({ week_start_date: weekStartDate });

    expect(plannerRes.status).toBe(200);
    expect(plannerRes.body.ok).toBe(true);

    const mondayMeals = plannerRes.body.meals.filter(
      (meal) => meal.day_of_week === "monday"
    );

    const mondayCalories = mondayMeals.reduce(
      (sum, meal) => sum + Number(meal.recipes?.total_calories || 0),
      0
    );

    expect(mondayMeals).toHaveLength(2);
    expect(mondayCalories).toBe(1500);

    const profileRes = await agent.get("/profile-data");

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.ok).toBe(true);
    expect(profileRes.body.biometrics.calorie_goal).toBe(2594);
    expect(profileRes.body.biometrics.bmi).toBe(22.86);

    const remainingCalories = profileRes.body.biometrics.calorie_goal - mondayCalories;

    expect(remainingCalories).toBe(1094);
  });
});