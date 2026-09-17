import { db } from "@/db/db";
import { newId } from "@/utils/id";
import { currentStreak, formatISODate } from "@/utils/calculations";
import type { Habit, HabitKey } from "@/types/models";

export const DEFAULT_HABITS: { key: HabitKey; label: string }[] = [
  { key: "log_weight", label: "Log weight" },
  { key: "log_nutrition", label: "Log nutrition" },
  { key: "hit_protein_target", label: "Hit protein target" },
  { key: "drink_enough_water", label: "Drink enough water" },
  { key: "exercise", label: "Exercise" },
  { key: "sleep_target", label: "Sleep target" },
  { key: "medication_logged", label: "Medication logged" },
  { key: "daily_checkin", label: "Daily check-in" },
];

export async function ensureDefaultHabits(): Promise<void> {
  const existing = await db.habits.toArray();
  const existingKeys = new Set(existing.map((h) => h.key));
  const now = new Date().toISOString();

  const toCreate: Habit[] = DEFAULT_HABITS.filter((h) => !existingKeys.has(h.key)).map((h) => ({
    id: newId(),
    key: h.key,
    label: h.label,
    isCustom: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }));

  if (toCreate.length) await db.habits.bulkAdd(toCreate);
}

export async function addCustomHabit(label: string): Promise<void> {
  const now = new Date().toISOString();
  await db.habits.add({
    id: newId(),
    key: newId(),
    label,
    isCustom: true,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function archiveHabit(habitId: string): Promise<void> {
  await db.habits.update(habitId, { archived: true, updatedAt: new Date().toISOString() });
}

export async function setHabitCompletion(habitId: string, date: string, completed: boolean): Promise<void> {
  const existing = await db.habitLogs.where({ habitId, date }).first();
  const now = new Date().toISOString();
  if (existing) {
    await db.habitLogs.update(existing.id, { completed, updatedAt: now });
  } else {
    await db.habitLogs.add({
      id: newId(),
      habitId,
      date,
      completed,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function getHabitStreak(habitId: string, asOfDate = formatISODate(new Date())): Promise<number> {
  const logs = await db.habitLogs.where({ habitId }).and((l) => l.completed).toArray();
  return currentStreak(logs.map((l) => l.date), asOfDate);
}
