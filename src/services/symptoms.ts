import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { SymptomEntry } from "@/types/models";

export type SymptomInput = Omit<SymptomEntry, "id" | "createdAt" | "updatedAt">;

export async function addSymptomEntry(input: SymptomInput): Promise<void> {
  const now = new Date().toISOString();
  await db.symptomEntries.add({ id: newId(), ...input, createdAt: now, updatedAt: now });
}

export async function deleteSymptomEntry(id: string): Promise<void> {
  await db.symptomEntries.delete(id);
}

export async function listSymptomEntries(): Promise<SymptomEntry[]> {
  return db.symptomEntries.orderBy("date").reverse().toArray();
}

export const SYMPTOM_LABELS: Record<SymptomEntry["type"], string> = {
  nausea: "Nausea",
  vomiting: "Vomiting",
  diarrhea: "Diarrhea",
  constipation: "Constipation",
  abdominal_discomfort: "Abdominal discomfort",
  heartburn: "Heartburn",
  reduced_appetite: "Reduced appetite",
  fatigue: "Fatigue",
  headache: "Headache",
  dizziness: "Dizziness",
  injection_site_reaction: "Injection-site reaction",
  other: "Other",
};

export const SEVERITY_LABELS: Record<SymptomEntry["severity"], string> = {
  0: "None",
  1: "Mild",
  2: "Moderate",
  3: "Severe",
};
