import {
  calculateBiometricsMetrics,
  normalizeGoal,
  normalizeSex,
  normalizeActivityLevel
} from "../backend/server/app.js";

describe("biometrics calorie goal helpers", () => {

  test("calculates bmi and maintenance calories from valid biometrics", () => {
    const result = calculateBiometricsMetrics({
      age: 25,
      sex: "male",
      weight: 70,
      height: 1.75,
      activityLevel: "moderate_3_5_days",
      goal: "maintain"
    });

    expect(result.bmi).toBe(22.86);
    expect(result.calorieGoal).toBe(2594);
  });

  test("applies goal adjustments to maintenance calories", () => {
    const maintain = calculateBiometricsMetrics({
      age: 30,
      sex: "female",
      weight: 60,
      height: 1.65,
      activityLevel: "light_1_2_days",
      goal: "maintain"
    });

    const lose = calculateBiometricsMetrics({
      age: 30,
      sex: "female",
      weight: 60,
      height: 1.65,
      activityLevel: "light_1_2_days",
      goal: "normal_weight_loss"
    });

    const gain = calculateBiometricsMetrics({
      age: 30,
      sex: "female",
      weight: 60,
      height: 1.65,
      activityLevel: "light_1_2_days",
      goal: "high_weight_gain"
    });

    expect(lose.calorieGoal).toBe(maintain.calorieGoal - 500);
    expect(gain.calorieGoal).toBe(maintain.calorieGoal + 1000);
  });

  test("returns null calorie goal when required calorie inputs are missing", () => {
    const result = calculateBiometricsMetrics({
      age: 22,
      sex: null,
      weight: 75,
      height: 1.8,
      activityLevel: "moderate_3_5_days",
      goal: "maintain"
    });

    expect(result.bmi).toBe(23.15);
    expect(result.calorieGoal).toBeNull();
  });

  test("maps legacy goals and validates new choice fields", () => {
    expect(normalizeGoal("bulking")).toBe("high_weight_gain");
    expect(normalizeGoal("weightLoss")).toBe("normal_weight_loss");
    expect(normalizeSex("Female")).toBe("female");
    expect(normalizeActivityLevel("moderate_3_5_days")).toBe("moderate_3_5_days");
    expect(normalizeActivityLevel("random")).toBeNull();
  });

});
