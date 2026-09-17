import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { ExerciseEntry } from "@/types/models";

export type ExerciseInput = Omit<ExerciseEntry, "id" | "createdAt" | "updatedAt">;

export async function addExerciseEntry(input: ExerciseInput): Promise<void> {
  const now = new Date().toISOString();
  await db.exerciseEntries.add({ id: newId(), ...input, createdAt: now, updatedAt: now });
}

export async function deleteExerciseEntry(id: string): Promise<void> {
  await db.exerciseEntries.delete(id);
}

export async function listExerciseEntriesForDate(date: string): Promise<ExerciseEntry[]> {
  return db.exerciseEntries.where("date").equals(date).sortBy("time");
}

export async function listExerciseEntriesBetween(startDate: string, endDate: string): Promise<ExerciseEntry[]> {
  return db.exerciseEntries.where("date").between(startDate, endDate, true, true).toArray();
}
