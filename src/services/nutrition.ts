import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { Food, Meal, MealFoodItem, MealType, NutritionEntry } from "@/types/models";

export type FoodInput = Pick<Food, "name" | "servingSize" | "calories" | "proteinG" | "carbsG" | "fatG" | "fiberG">;

export async function addFood(input: FoodInput): Promise<string> {
  const id = newId();
  const now = new Date().toISOString();
  await db.foods.add({ id, ...input, createdAt: now, updatedAt: now });
  return id;
}

export async function listFoods(): Promise<Food[]> {
  return db.foods.orderBy("name").toArray();
}

export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}

export type MealInput = { name: string; items: MealFoodItem[] };

export async function addMeal(input: MealInput): Promise<string> {
  const id = newId();
  const now = new Date().toISOString();
  await db.meals.add({ id, ...input, createdAt: now, updatedAt: now });
  return id;
}

export async function listMeals(): Promise<Meal[]> {
  return db.meals.orderBy("name").toArray();
}

export async function deleteMeal(id: string): Promise<void> {
  await db.meals.delete(id);
}

export interface LogFoodInput {
  date: string;
  time: string;
  mealType: MealType;
  foodId: string;
  servings: number;
}

function scale(value: number, servings: number): number {
  return Math.round(value * servings * 10) / 10;
}

export async function logFoodEntry(input: LogFoodInput): Promise<void> {
  const food = await db.foods.get(input.foodId);
  if (!food) throw new Error("Food not found");
  const now = new Date().toISOString();
  const entry: NutritionEntry = {
    id: newId(),
    date: input.date,
    time: input.time,
    mealType: input.mealType,
    foodId: input.foodId,
    description: `${food.name} × ${input.servings}`,
    servings: input.servings,
    calories: scale(food.calories, input.servings),
    proteinG: scale(food.proteinG, input.servings),
    carbsG: scale(food.carbsG, input.servings),
    fatG: scale(food.fatG, input.servings),
    fiberG: scale(food.fiberG, input.servings),
    createdAt: now,
    updatedAt: now,
  };
  await db.nutritionEntries.add(entry);
}

export interface LogMealInput {
  date: string;
  time: string;
  mealType: MealType;
  mealId: string;
}

export async function logMealEntry(input: LogMealInput): Promise<void> {
  const meal = await db.meals.get(input.mealId);
  if (!meal) throw new Error("Meal not found");
  const foods = await db.foods.bulkGet(meal.items.map((i) => i.foodId));

  const totals = meal.items.reduce(
    (acc, item, idx) => {
      const food = foods[idx];
      if (!food) return acc;
      return {
        calories: acc.calories + scale(food.calories, item.servings),
        proteinG: acc.proteinG + scale(food.proteinG, item.servings),
        carbsG: acc.carbsG + scale(food.carbsG, item.servings),
        fatG: acc.fatG + scale(food.fatG, item.servings),
        fiberG: acc.fiberG + scale(food.fiberG, item.servings),
      };
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );

  const now = new Date().toISOString();
  const entry: NutritionEntry = {
    id: newId(),
    date: input.date,
    time: input.time,
    mealType: input.mealType,
    mealId: input.mealId,
    description: meal.name,
    servings: 1,
    ...totals,
    createdAt: now,
    updatedAt: now,
  };
  await db.nutritionEntries.add(entry);
}

export interface QuickLogInput {
  date: string;
  time: string;
  mealType: MealType;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export async function quickLogNutrition(input: QuickLogInput): Promise<void> {
  const now = new Date().toISOString();
  await db.nutritionEntries.add({ id: newId(), servings: 1, ...input, createdAt: now, updatedAt: now });
}

export async function deleteNutritionEntry(id: string): Promise<void> {
  await db.nutritionEntries.delete(id);
}

export async function listNutritionEntriesForDate(date: string): Promise<NutritionEntry[]> {
  return db.nutritionEntries.where("date").equals(date).sortBy("time");
}
