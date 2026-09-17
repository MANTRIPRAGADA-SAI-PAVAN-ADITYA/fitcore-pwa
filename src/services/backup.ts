import { db, resetAllData } from "@/db/db";
import { blobToDataURL, dataURLToBlob } from "@/utils/blob";

const BACKUP_VERSION = 1;

export interface BackupFile {
  app: "fitjourney";
  version: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

const TABLE_NAMES = [
  "users",
  "weightEntries",
  "foods",
  "meals",
  "nutritionEntries",
  "waterEntries",
  "exerciseEntries",
  "sleepEntries",
  "medications",
  "medicationLogs",
  "symptomEntries",
  "measurements",
  "progressPhotos",
  "dailyCheckins",
  "habits",
  "habitLogs",
  "reminderSettings",
  "appSettings",
] as const;

export async function exportBackup(): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {};

  for (const name of TABLE_NAMES) {
    const rows = await db.table(name).toArray();
    if (name === "progressPhotos") {
      data[name] = await Promise.all(
        rows.map(async (row: { blob: Blob } & Record<string, unknown>) => ({
          ...row,
          blob: undefined,
          blobDataUrl: await blobToDataURL(row.blob),
        })),
      );
    } else {
      data[name] = rows;
    }
  }

  return { app: "fitjourney", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

export function validateBackup(json: unknown): json is BackupFile {
  if (typeof json !== "object" || json === null) return false;
  const candidate = json as Partial<BackupFile>;
  if (candidate.app !== "fitjourney") return false;
  if (typeof candidate.version !== "number") return false;
  if (typeof candidate.data !== "object" || candidate.data === null) return false;
  return true;
}

/** Caller is responsible for confirming with the user before calling this — it overwrites existing data. */
export async function importBackup(backup: BackupFile): Promise<void> {
  if (!validateBackup(backup)) {
    throw new Error("This file doesn't look like a valid FitJourney backup.");
  }

  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));

    for (const name of TABLE_NAMES) {
      const rows = backup.data[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      if (name === "progressPhotos") {
        const restored = await Promise.all(
          rows.map(async (row) => {
            const r = row as Record<string, unknown>;
            const { blobDataUrl, ...rest } = r;
            return { ...rest, blob: await dataURLToBlob(blobDataUrl as string) };
          }),
        );
        await db.table(name).bulkPut(restored);
      } else {
        await db.table(name).bulkPut(rows);
      }
    }
  });
}

export async function deleteAllData(): Promise<void> {
  await resetAllData();
}
