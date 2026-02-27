import request from "supertest";
import app from "../Backend/Server/app.js";

describe("Recipe create and delete flow", () => {

  const agent = request.agent(app);
  let createdRecipeId;

  beforeAll(async () => {
    const res = await agent
      .post("/login")
      .send({
        username: "Carl",
        password: "Dog123"
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("Create recipe", async () => {
    const res = await agent
      .post("/recipes")
      .send({
        title: `Jest Test ${Date.now()}`,
        description: "Created by integration test",
        prep_time: 15,
        ingredients: ["Salt", "Pepper"]
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.recipe).toBeDefined();

    createdRecipeId = res.body.recipe.id;
    expect(createdRecipeId).toBeDefined();
  });

  test("Delete created recipe", async () => {
    const res = await agent
      .delete(`/recipes/${createdRecipeId}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("Ensure recipe is actually deleted", async () => {
    const res = await agent.get("/my-recipes");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const ids = res.body.recipes.map(r => r.id);
    expect(ids).not.toContain(createdRecipeId);
  });

});