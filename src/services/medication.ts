import { addDays, addWeeks, addMonths, isBefore, isEqual, startOfDay } from "date-fns";
import { db } from "@/db/db";
import { newId } from "@/utils/id";
import { formatISODate } from "@/utils/calculations";
import type { Medication, MedicationLog } from "@/types/models";

export type MedicationInput = Omit<Medication, "id" | "createdAt" | "updatedAt" | "active"> & {
  active?: boolean;
};

export async function addMedication(input: MedicationInput): Promise<void> {
  const now = new Date().toISOString();
  await db.medications.add({ id: newId(), active: true, ...input, createdAt: now, updatedAt: now });
}

export async function updateMedication(id: string, patch: Partial<MedicationInput>): Promise<void> {
  await db.medications.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deactivateMedication(id: string): Promise<void> {
  await db.medications.update(id, { active: false, updatedAt: new Date().toISOString() });
}

export async function listMedications(): Promise<Medication[]> {
  const all = await db.medications.toArray();
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export type MedicationLogInput = Omit<MedicationLog, "id" | "createdAt" | "updatedAt">;

export async function logMedicationEvent(input: MedicationLogInput): Promise<void> {
  const now = new Date().toISOString();
  await db.medicationLogs.add({ id: newId(), ...input, createdAt: now, updatedAt: now });
}

export async function deleteMedicationLog(id: string): Promise<void> {
  await db.medicationLogs.delete(id);
}

export async function listMedicationLogs(medicationId: string): Promise<MedicationLog[]> {
  return db.medicationLogs.where({ medicationId }).sortBy("date");
}

/**
 * Derives the *user's own prescribed schedule* into a list of expected dose
 * dates for calendar display only. This never suggests a dose, never
 * changes based on missed doses, and never extrapolates beyond what the
 * user entered as their prescription's frequency.
 */
export function expectedScheduleDates(medication: Medication, rangeStart: Date, rangeEnd: Date): string[] {
  const dates: string[] = [];
  let cursor = startOfDay(new Date(medication.startDate));
  const end = startOfDay(rangeEnd);

  const step = (d: Date): Date => {
    switch (medication.frequency) {
      case "weekly":
        return addWeeks(d, 1);
      case "biweekly":
        return addWeeks(d, 2);
      case "monthly":
        return addMonths(d, 1);
      case "custom":
      default:
        return addDays(d, 7); // custom schedules are logged manually; weekly is just a display fallback
    }
  };

  // Fast-forward cursor to the first occurrence on/after rangeStart without
  // silently skipping the anchor date itself.
  while (isBefore(cursor, startOfDay(rangeStart))) {
    cursor = step(cursor);
  }

  let guard = 0;
  while ((isBefore(cursor, end) || isEqual(cursor, end)) && guard < 500) {
    dates.push(formatISODate(cursor));
    cursor = step(cursor);
    guard += 1;
  }

  return dates;
}

export type CalendarDoseStatus = "taken" | "upcoming" | "missed" | "not_scheduled";

export function statusForScheduledDate(
  date: string,
  today: string,
  logsByDate: Map<string, MedicationLog>,
): CalendarDoseStatus {
  const log = logsByDate.get(date);
  if (log) return log.status === "taken" ? "taken" : "missed";
  if (date > today) return "upcoming";
  if (date === today) return "upcoming";
  return "missed";
}
