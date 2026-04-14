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