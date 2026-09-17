import { beforeEach, describe, expect, it } from "vitest";
import { resetAllData } from "@/db/db";
import { sumNutrition } from "@/utils/calculations";
import { addFood, listNutritionEntriesForDate, logFoodEntry, quickLogNutrition } from "./nutrition";

beforeEach(async () => {
  await resetAllData();
});

describe("logFoodEntry", () => {
  it("scales macros by the number of servings logged", async () => {
    const foodId = await addFood({
      name: "Grilled chicken",
      servingSize: "100 g",
      calories: 165,
      proteinG: 31,
      carbsG: 0,
      fatG: 3.6,
      fiberG: 0,
    });

    await logFoodEntry({ date: "2024-01-01", time: "12:00", mealType: "lunch", foodId, servings: 2 });

    const entries = await listNutritionEntriesForDate("2024-01-01");
    expect(entries).toHaveLength(1);
    expect(entries[0].calories).toBe(330);
    expect(entries[0].proteinG).toBe(62);
  });

  it("throws rather than silently logging a deleted/unknown food", async () => {
    await expect(
      logFoodEntry({ date: "2024-01-01", time: "12:00", mealType: "lunch", foodId: "missing-id", servings: 1 }),
    ).rejects.toThrow();
  });
});

describe("daily totals", () => {
  it("sums quick-added entries across meals for a day", async () => {
    await quickLogNutrition({
      date: "2024-01-01",
      time: "08:00",
      mealType: "breakfast",
      description: "Oats",
      calories: 300,
      proteinG: 10,
      carbsG: 50,
      fatG: 5,
      fiberG: 6,
    });
    await quickLogNutrition({
      date: "2024-01-01",
      time: "13:00",
      mealType: "lunch",
      description: "Salad",
      calories: 400,
      proteinG: 25,
      carbsG: 30,
      fatG: 15,
      fiberG: 8,
    });
    // A different day must not bleed into today's totals.
    await quickLogNutrition({
      date: "2024-01-02",
      time: "08:00",
      mealType: "breakfast",
      description: "Toast",
      calories: 200,
      proteinG: 5,
      carbsG: 30,
      fatG: 4,
      fiberG: 2,
    });

    const todayEntries = await listNutritionEntriesForDate("2024-01-01");
    expect(sumNutrition(todayEntries)).toEqual({ calories: 700, proteinG: 35, carbsG: 80, fatG: 20, fiberG: 14 });
  });

  it("returns zero totals for a day with nothing logged", async () => {
    const entries = await listNutritionEntriesForDate("2099-01-01");
    expect(sumNutrition(entries)).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });
  });
});
