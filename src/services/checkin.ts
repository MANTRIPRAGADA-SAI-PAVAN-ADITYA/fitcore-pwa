import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { DailyCheckin } from "@/types/models";

export type CheckinInput = Omit<DailyCheckin, "id" | "createdAt" | "updatedAt">;

export async function saveCheckin(input: CheckinInput): Promise<void> {
  const existing = await db.dailyCheckins.where("date").equals(input.date).first();
  const now = new Date().toISOString();
  if (existing) {
    await db.dailyCheckins.update(existing.id, { ...input, updatedAt: now });
  } else {
    await db.dailyCheckins.add({ id: newId(), ...input, createdAt: now, updatedAt: now });
  }
}

export async function getCheckinForDate(date: string): Promise<DailyCheckin | undefined> {
  return db.dailyCheckins.where("date").equals(date).first();
}
