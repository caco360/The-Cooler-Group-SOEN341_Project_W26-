import request from "supertest";
import app from "../backend/server/app.js";

describe("Recipe edit flow", () => {
  const agent = request.agent(app);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const username = `edit-recipe-${suffix}`;
  const password = "Dog123";

  let recipeId;

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

    const createRes = await agent.post("/recipes").send({
      title: `Original Recipe ${suffix}`,
      description: "Original description",
      prep_time: 20,
      ingredients: ["Salt"],
      calories: 350
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.ok).toBe(true);
    recipeId = createRes.body.recipe.id;
  });