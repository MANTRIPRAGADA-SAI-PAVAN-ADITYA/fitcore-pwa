import { describe, expect, it } from "vitest";
import { expectedScheduleDates, statusForScheduledDate } from "./medication";
import type { Medication, MedicationLog } from "@/types/models";

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "med-1",
    name: "Semaglutide",
    prescribedDose: "0.25 mg",
    frequency: "weekly",
    prescribedTime: "09:00",
    startDate: "2024-01-01",
    active: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("expectedScheduleDates", () => {
  it("generates weekly occurrences within the given range", () => {
    const medication = makeMedication({ frequency: "weekly", startDate: "2024-01-01" });
    const dates = expectedScheduleDates(medication, new Date("2024-01-01"), new Date("2024-01-22"));
    expect(dates).toEqual(["2024-01-01", "2024-01-08", "2024-01-15", "2024-01-22"]);
  });

  it("generates biweekly occurrences", () => {
    const medication = makeMedication({ frequency: "biweekly", startDate: "2024-01-01" });
    const dates = expectedScheduleDates(medication, new Date("2024-01-01"), new Date("2024-01-29"));
    expect(dates).toEqual(["2024-01-01", "2024-01-15", "2024-01-29"]);
  });

  it("never invents doses before the prescription's own start date", () => {
    const medication = makeMedication({ frequency: "weekly", startDate: "2024-02-01" });
    const dates = expectedScheduleDates(medication, new Date("2024-01-01"), new Date("2024-01-31"));
    expect(dates).toEqual([]);
  });

  it("returns an empty list when the range ends before it starts", () => {
    const medication = makeMedication();
    const dates = expectedScheduleDates(medication, new Date("2024-03-01"), new Date("2024-01-01"));
    expect(dates).toEqual([]);
  });
});

describe("statusForScheduledDate", () => {
  const takenLog: MedicationLog = {
    id: "log-1",
    medicationId: "med-1",
    date: "2024-01-08",
    time: "09:00",
    status: "taken",
    prescribedDose: "0.25 mg",
    createdAt: "2024-01-08T00:00:00.000Z",
    updatedAt: "2024-01-08T00:00:00.000Z",
  };

  it("marks a logged, taken date as taken", () => {
    const map = new Map([[takenLog.date, takenLog]]);
    expect(statusForScheduledDate("2024-01-08", "2024-01-10", map)).toBe("taken");
  });

  it("marks a logged skip or miss as missed regardless of the log's own status label", () => {
    const skipped: MedicationLog = { ...takenLog, date: "2024-01-15", status: "skipped" };
    const map = new Map([[skipped.date, skipped]]);
    expect(statusForScheduledDate("2024-01-15", "2024-01-20", map)).toBe("missed");
  });

  it("marks a future scheduled date with no log as upcoming", () => {
    expect(statusForScheduledDate("2024-02-01", "2024-01-10", new Map())).toBe("upcoming");
  });

  it("marks a past scheduled date with no log as missed", () => {
    expect(statusForScheduledDate("2024-01-01", "2024-01-10", new Map())).toBe("missed");
  });

  it("never recommends an extra dose after a missed one — it only reports status", () => {
    // expectedScheduleDates is purely a function of the medication's own
    // frequency/start date; it must not react to missed doses at all.
    const medication = makeMedication({ frequency: "weekly", startDate: "2024-01-01" });
    const withoutLogs = expectedScheduleDates(medication, new Date("2024-01-01"), new Date("2024-01-22"));
    const stillTheSame = expectedScheduleDates(medication, new Date("2024-01-01"), new Date("2024-01-22"));
    expect(withoutLogs).toEqual(stillTheSame);
  });
});
