import { beforeEach, describe, expect, it } from "vitest";
import { db, resetAllData } from "@/db/db";
import { DEFAULT_HABITS, ensureDefaultHabits, getHabitStreak, setHabitCompletion } from "./habits";

beforeEach(async () => {
  await resetAllData();
});

describe("ensureDefaultHabits", () => {
  it("seeds all default habits exactly once", async () => {
    await ensureDefaultHabits();
    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(DEFAULT_HABITS.length);

    // Calling it again must not create duplicates.
    await ensureDefaultHabits();
    expect(await db.habits.count()).toBe(DEFAULT_HABITS.length);
  });
});

describe("setHabitCompletion / getHabitStreak", () => {
  it("computes a streak with no gaps", async () => {
    await ensureDefaultHabits();
    const habit = (await db.habits.toArray())[0];

    await setHabitCompletion(habit.id, "2024-01-08", true);
    await setHabitCompletion(habit.id, "2024-01-09", true);
    await setHabitCompletion(habit.id, "2024-01-10", true);

    expect(await getHabitStreak(habit.id, "2024-01-10")).toBe(3);
  });

  it("does not punish a missed day beyond resetting the count", async () => {
    await ensureDefaultHabits();
    const habit = (await db.habits.toArray())[0];

    await setHabitCompletion(habit.id, "2024-01-01", true);
    // gap on 2024-01-02..09
    await setHabitCompletion(habit.id, "2024-01-10", true);

    expect(await getHabitStreak(habit.id, "2024-01-10")).toBe(1);
  });

  it("returns zero for a habit with no logs", async () => {
    await ensureDefaultHabits();
    const habit = (await db.habits.toArray())[0];
    expect(await getHabitStreak(habit.id, "2024-01-10")).toBe(0);
  });

  it("toggling completion off is reflected immediately", async () => {
    await ensureDefaultHabits();
    const habit = (await db.habits.toArray())[0];

    await setHabitCompletion(habit.id, "2024-01-10", true);
    expect(await getHabitStreak(habit.id, "2024-01-10")).toBe(1);

    await setHabitCompletion(habit.id, "2024-01-10", false);
    expect(await getHabitStreak(habit.id, "2024-01-10")).toBe(0);
  });
});
