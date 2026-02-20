import request from "supertest";
import app from "../Backend/Server/app.js";

describe("POST /login", () => {

  test("login works with valid credentials", async () => {
    const res = await request(app)
      .post("/login")
      .send({
        username: "Carl",
        password: "Dog123"
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("login fails with wrong password", async () => {
    const res = await request(app)
      .post("/login")
      .send({
        username: "testuser",
        password: "wrong"
      });

    expect(res.status).toBe(401);
  });

});