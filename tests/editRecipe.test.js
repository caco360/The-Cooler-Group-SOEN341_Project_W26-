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
  afterAll(async () => {
    if (recipeId) {
      await agent.delete(`/recipes/${recipeId}`);
    }

    await agent.delete("/api/delete-account");
  });

  test("editing a recipe updates USDA ingredients, grams, and total calories", async () => {
    const eggSearchRes = await agent
      .get("/api/usda-foods/search")
      .query({ q: "egg", limit: 1 });

    const riceSearchRes = await agent
      .get("/api/usda-foods/search")
      .query({ q: "rice", limit: 1 });

    expect(eggSearchRes.status).toBe(200);
    expect(riceSearchRes.status).toBe(200);
    expect(eggSearchRes.body.ok).toBe(true);
    expect(riceSearchRes.body.ok).toBe(true);
    expect(eggSearchRes.body.foods.length).toBeGreaterThan(0);
    expect(riceSearchRes.body.foods.length).toBeGreaterThan(0);

    const egg = eggSearchRes.body.foods[0];
    const rice = riceSearchRes.body.foods[0];

    const expectedCalories = Number(
      (((150 / 100) * egg.calories_per_100g) + ((80 / 100) * rice.calories_per_100g)).toFixed(2)
    );

    const updateRes = await agent.put(`/recipes/${recipeId}`).send({
      title: "Updated Recipe Title",
      description: "Updated description",
      prep_time: 12,
      ingredientRows: [
        {
          usda_food_id: egg.fdc_id,
          ingredient_name_snapshot: egg.description,
          quantity_g: 150,
          sort_order: 1
        },
        {
          usda_food_id: rice.fdc_id,
          ingredient_name_snapshot: rice.description,
          quantity_g: 80,
          sort_order: 2
        }
      ]
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.ok).toBe(true);

    const recipesRes = await agent.get("/my-recipes");

    expect(recipesRes.status).toBe(200);
    expect(recipesRes.body.ok).toBe(true);

    const updatedRecipe = recipesRes.body.recipes.find(
      (recipe) => Number(recipe.id) === Number(recipeId)
    );

    expect(updatedRecipe).toBeDefined();
    expect(updatedRecipe.title).toBe("Updated Recipe Title");
    expect(updatedRecipe.description).toBe("Updated description");
    expect(updatedRecipe.prep_time).toBe(12);
    expect(updatedRecipe.ingredients).toEqual([egg.description, rice.description]);
    expect(updatedRecipe.ingredient_rows).toHaveLength(2);
    expect(updatedRecipe.ingredient_rows[0].ingredient_name_snapshot).toBe(egg.description);
    expect(updatedRecipe.ingredient_rows[0].quantity_g).toBe(150);
    expect(updatedRecipe.ingredient_rows[1].ingredient_name_snapshot).toBe(rice.description);
    expect(updatedRecipe.ingredient_rows[1].quantity_g).toBe(80);
    expect(updatedRecipe.total_calories).toBeCloseTo(expectedCalories, 2);
  });

  test("editing rejects a blank title", async () => {
    const updateRes = await agent.put(`/recipes/${recipeId}`).send({
      title: "   "
    });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body.ok).toBe(false);
    expect(updateRes.body.message).toMatch(/title is required/i);
  });
});