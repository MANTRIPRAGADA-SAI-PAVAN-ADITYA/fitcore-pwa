import { db } from "@/db/db";
import type { AppSettings, NutritionTargets, EmergencyContact } from "@/types/models";

const SETTINGS_ID = "app_settings";

const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2000,
  proteinG: 120,
  carbsG: 200,
  fatG: 65,
  fiberG: 28,
  waterMl: 2500,
};

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.appSettings.get(SETTINGS_ID);
  if (existing) return existing;

  const now = new Date().toISOString();
  const seeded: AppSettings = {
    id: SETTINGS_ID,
    key: "app_settings",
    nutritionTargets: DEFAULT_TARGETS,
    emergencyContact: {},
    theme: "system",
    lowCaloriePromptDismissed: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.appSettings.put(seeded);
  return seeded;
}

export async function updateNutritionTargets(targets: Partial<NutritionTargets>): Promise<void> {
  const current = await getSettings();
  await db.appSettings.update(SETTINGS_ID, {
    nutritionTargets: { ...current.nutritionTargets, ...targets },
    updatedAt: new Date().toISOString(),
  });
}

export async function updateEmergencyContact(contact: Partial<EmergencyContact>): Promise<void> {
  const current = await getSettings();
  await db.appSettings.update(SETTINGS_ID, {
    emergencyContact: { ...current.emergencyContact, ...contact },
    updatedAt: new Date().toISOString(),
  });
}

export async function dismissLowCaloriePrompt(): Promise<void> {
  await db.appSettings.update(SETTINGS_ID, {
    lowCaloriePromptDismissed: true,
    updatedAt: new Date().toISOString(),
  });
}
