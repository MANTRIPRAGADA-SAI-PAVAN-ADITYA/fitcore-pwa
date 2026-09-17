import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { addWeightEntry } from "./weight";
import { exportBackup, importBackup, validateBackup, deleteAllData } from "./backup";

beforeEach(async () => {
  await deleteAllData();
});

describe("validateBackup", () => {
  it("accepts a well-formed backup shell", () => {
    expect(validateBackup({ app: "fitjourney", version: 1, exportedAt: "now", data: {} })).toBe(true);
  });

  it("rejects a file from a different app", () => {
    expect(validateBackup({ app: "some-other-app", version: 1, data: {} })).toBe(false);
  });

  it("rejects missing or wrong-typed fields", () => {
    expect(validateBackup(null)).toBe(false);
    expect(validateBackup(undefined)).toBe(false);
    expect(validateBackup("not an object")).toBe(false);
    expect(validateBackup({ app: "fitjourney", version: "1", data: {} })).toBe(false);
    expect(validateBackup({ app: "fitjourney", version: 1, data: null })).toBe(false);
  });
});

describe("export / import roundtrip", () => {
  it("preserves entries through an export and re-import", async () => {
    await addWeightEntry({ date: "2024-01-01", time: "08:00", weightKg: 90.4, note: "before breakfast" });
    await addWeightEntry({ date: "2024-01-02", time: "08:00", weightKg: 90.1 });

    const backup = await exportBackup();
    expect(backup.app).toBe("fitjourney");
    expect(backup.data.weightEntries).toHaveLength(2);

    await deleteAllData();
    expect(await db.weightEntries.count()).toBe(0);

    await importBackup(backup);
    const restored = await db.weightEntries.orderBy("date").toArray();
    expect(restored).toHaveLength(2);
    expect(restored[0].weightKg).toBe(90.4);
    expect(restored[0].note).toBe("before breakfast");
  });

  it("throws on a corrupt/invalid backup file instead of silently wiping data", async () => {
    await addWeightEntry({ date: "2024-01-01", time: "08:00", weightKg: 80 });

    // @ts-expect-error intentionally malformed for the test
    await expect(importBackup({ app: "nope" })).rejects.toThrow();

    // Existing data must survive a rejected import.
    expect(await db.weightEntries.count()).toBe(1);
  });

  it("replaces rather than merges on import, resolving conflicts deterministically", async () => {
    await addWeightEntry({ date: "2024-01-01", time: "08:00", weightKg: 100 });
    const backupWithOnlyOneEntry = await exportBackup();

    await addWeightEntry({ date: "2024-01-02", time: "08:00", weightKg: 99 });
    expect(await db.weightEntries.count()).toBe(2);

    await importBackup(backupWithOnlyOneEntry);
    const remaining = await db.weightEntries.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].weightKg).toBe(100);
  });
});

describe("deleteAllData", () => {
  it("clears every table", async () => {
    await addWeightEntry({ date: "2024-01-01", time: "08:00", weightKg: 80 });
    await deleteAllData();
    expect(await db.weightEntries.count()).toBe(0);
  });
});
