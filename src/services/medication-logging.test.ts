import { beforeEach, describe, expect, it } from "vitest";
import { resetAllData } from "@/db/db";
import { addMedication, listMedicationLogs, listMedications, logMedicationEvent } from "./medication";

beforeEach(async () => {
  await resetAllData();
});

describe("medication logging", () => {
  it("records exactly what the user enters, without altering the prescribed dose", async () => {
    await addMedication({
      name: "Semaglutide",
      prescribedDose: "0.5 mg",
      frequency: "weekly",
      prescribedTime: "09:00",
      startDate: "2024-01-01",
    });

    const [medication] = await listMedications();
    await logMedicationEvent({
      medicationId: medication.id,
      date: "2024-01-08",
      time: "09:15",
      status: "taken",
      prescribedDose: medication.prescribedDose,
      actualDose: "0.5 mg",
      injectionSite: "Left thigh",
    });

    const logs = await listMedicationLogs(medication.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].prescribedDose).toBe("0.5 mg");
    expect(logs[0].actualDose).toBe("0.5 mg");
    expect(logs[0].status).toBe("taken");
  });

  it("records a missed dose as a plain status, not a recommendation to take an extra one", async () => {
    await addMedication({
      name: "Semaglutide",
      prescribedDose: "0.25 mg",
      frequency: "weekly",
      prescribedTime: "09:00",
      startDate: "2024-01-01",
    });
    const [medication] = await listMedications();

    await logMedicationEvent({
      medicationId: medication.id,
      date: "2024-01-08",
      time: "09:00",
      status: "missed",
      prescribedDose: medication.prescribedDose,
    });

    const logs = await listMedicationLogs(medication.id);
    expect(logs[0].status).toBe("missed");
    expect(logs[0].actualDose).toBeUndefined();
  });

  it("keeps logs for multiple doses independently addressable", async () => {
    await addMedication({
      name: "Semaglutide",
      prescribedDose: "0.25 mg",
      frequency: "weekly",
      prescribedTime: "09:00",
      startDate: "2024-01-01",
    });
    const [medication] = await listMedications();

    await logMedicationEvent({ medicationId: medication.id, date: "2024-01-01", time: "09:00", status: "taken", prescribedDose: "0.25 mg" });
    await logMedicationEvent({ medicationId: medication.id, date: "2024-01-08", time: "09:00", status: "skipped", prescribedDose: "0.25 mg" });

    const logs = await listMedicationLogs(medication.id);
    expect(logs.map((l) => l.status).sort()).toEqual(["skipped", "taken"]);
  });
});
