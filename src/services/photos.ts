import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { ProgressPhoto } from "@/types/models";

export async function addProgressPhoto(date: string, blob: Blob, note?: string): Promise<void> {
  const now = new Date().toISOString();
  await db.progressPhotos.add({ id: newId(), date, blob, note, createdAt: now, updatedAt: now });
}

export async function deleteProgressPhoto(id: string): Promise<void> {
  await db.progressPhotos.delete(id);
}

export async function listProgressPhotos(): Promise<ProgressPhoto[]> {
  return db.progressPhotos.orderBy("date").reverse().toArray();
}
