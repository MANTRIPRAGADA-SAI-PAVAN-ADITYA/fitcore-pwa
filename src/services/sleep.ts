import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { SleepEntry } from "@/types/models";

export type SleepInput = Omit<SleepEntry, "id" | "createdAt" | "updatedAt" | "durationMin">;

function computeDurationMin(bedtime: string, wakeTime: string): number {
  const start = new Date(bedtime).getTime();
  const end = new Date(wakeTime).getTime();
  const diffMin = Math.round((end - start) / 60000);
  return diffMin > 0 ? diffMin : diffMin + 24 * 60; // handle overnight wrap
}

export async function addSleepEntry(input: SleepInput): Promise<void> {
  const now = new Date().toISOString();
  await db.sleepEntries.add({
    id: newId(),
    ...input,
    durationMin: computeDurationMin(input.bedtime, input.wakeTime),
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteSleepEntry(id: string): Promise<void> {
  await db.sleepEntries.delete(id);
}

export async function listSleepEntriesBetween(startDate: string, endDate: string): Promise<SleepEntry[]> {
  return db.sleepEntries.where("date").between(startDate, endDate, true, true).toArray();
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
