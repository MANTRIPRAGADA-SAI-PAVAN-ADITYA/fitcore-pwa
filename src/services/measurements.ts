import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { Measurement, MeasurementType } from "@/types/models";

export type MeasurementInput = Omit<Measurement, "id" | "createdAt" | "updatedAt">;

export async function addMeasurement(input: MeasurementInput): Promise<void> {
  const now = new Date().toISOString();
  await db.measurements.add({ id: newId(), ...input, createdAt: now, updatedAt: now });
}

export async function deleteMeasurement(id: string): Promise<void> {
  await db.measurements.delete(id);
}

export async function listMeasurements(): Promise<Measurement[]> {
  return db.measurements.orderBy("date").toArray();
}

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  waist: "Waist",
  chest: "Chest",
  hips: "Hips",
  neck: "Neck",
  arms: "Arms",
  thighs: "Thighs",
  body_fat_pct: "Body fat %",
  custom: "Custom",
};
