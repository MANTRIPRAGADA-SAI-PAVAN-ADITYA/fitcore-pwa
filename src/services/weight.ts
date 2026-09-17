import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { WeightEntry } from "@/types/models";

export type WeightEntryInput = Pick<WeightEntry, "date" | "time" | "weightKg" | "note">;

export async function addWeightEntry(input: WeightEntryInput): Promise<void> {
  const now = new Date().toISOString();
  await db.weightEntries.add({
    id: newId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  // Keep the profile's currentWeightKg in sync with the latest reading so
  // the dashboard and other pages don't need to re-derive it every render.
  const latest = await getLatestEntry();
  if (latest) {
    await db.users.update("me", { currentWeightKg: latest.weightKg, updatedAt: now }).catch(() => {
      // Profile may not exist yet during onboarding — safe to ignore.
    });
  }
}

export async function updateWeightEntry(id: string, patch: Partial<WeightEntryInput>): Promise<void> {
  await db.weightEntries.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteWeightEntry(id: string): Promise<void> {
  await db.weightEntries.delete(id);
}

export async function listWeightEntries(): Promise<WeightEntry[]> {
  return db.weightEntries.orderBy("date").toArray();
}

export async function getLatestEntry(): Promise<WeightEntry | undefined> {
  const all = await db.weightEntries.orderBy("[date+time]").toArray();
  return all.length ? all[all.length - 1] : undefined;
}
