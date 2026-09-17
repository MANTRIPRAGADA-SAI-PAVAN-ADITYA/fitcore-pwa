import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { WaterEntry } from "@/types/models";

export async function logWater(date: string, amountMl: number): Promise<void> {
  const now = new Date().toISOString();
  await db.waterEntries.add({
    id: newId(),
    date,
    time: new Date().toTimeString().slice(0, 5),
    amountMl,
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteWaterEntry(id: string): Promise<void> {
  await db.waterEntries.delete(id);
}

export async function listWaterEntriesForDate(date: string): Promise<WaterEntry[]> {
  return db.waterEntries.where("date").equals(date).sortBy("time");
}

export function totalWaterMl(entries: WaterEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amountMl, 0);
}
