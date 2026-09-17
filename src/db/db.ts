import Dexie, { type EntityTable } from "dexie";
import type {
  UserProfile,
  WeightEntry,
  Food,
  Meal,
  NutritionEntry,
  WaterEntry,
  ExerciseEntry,
  SleepEntry,
  Medication,
  MedicationLog,
  SymptomEntry,
  Measurement,
  ProgressPhoto,
  DailyCheckin,
  Habit,
  HabitLog,
  ReminderSetting,
  AppSettings,
} from "@/types/models";

class FitJourneyDB extends Dexie {
  users!: EntityTable<UserProfile, "id">;
  weightEntries!: EntityTable<WeightEntry, "id">;
  foods!: EntityTable<Food, "id">;
  meals!: EntityTable<Meal, "id">;
  nutritionEntries!: EntityTable<NutritionEntry, "id">;
  waterEntries!: EntityTable<WaterEntry, "id">;
  exerciseEntries!: EntityTable<ExerciseEntry, "id">;
  sleepEntries!: EntityTable<SleepEntry, "id">;
  medications!: EntityTable<Medication, "id">;
  medicationLogs!: EntityTable<MedicationLog, "id">;
  symptomEntries!: EntityTable<SymptomEntry, "id">;
  measurements!: EntityTable<Measurement, "id">;
  progressPhotos!: EntityTable<ProgressPhoto, "id">;
  dailyCheckins!: EntityTable<DailyCheckin, "id">;
  habits!: EntityTable<Habit, "id">;
  habitLogs!: EntityTable<HabitLog, "id">;
  reminderSettings!: EntityTable<ReminderSetting, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("fitjourney");

    this.version(1).stores({
      users: "id, updatedAt",
      weightEntries: "id, date, [date+time]",
      foods: "id, name",
      meals: "id, name",
      nutritionEntries: "id, date, mealType, [date+mealType]",
      waterEntries: "id, date",
      exerciseEntries: "id, date, category",
      sleepEntries: "id, date",
      medications: "id, active",
      medicationLogs: "id, medicationId, date, [medicationId+date]",
      symptomEntries: "id, date, type",
      measurements: "id, date, type",
      progressPhotos: "id, date",
      dailyCheckins: "id, &date",
      habits: "id, key, archived",
      habitLogs: "id, habitId, date, [habitId+date]",
      reminderSettings: "id, type",
      appSettings: "id, key",
    });

    for (const table of this.tables) {
      const anyTable = table as unknown as {
        hook(event: "creating", handler: (pk: unknown, obj: Record<string, unknown>) => void): void;
        hook(event: "updating", handler: (mods: Record<string, unknown>) => Record<string, unknown>): void;
      };
      anyTable.hook("creating", (_pk, obj) => {
        const now = new Date().toISOString();
        if (!obj.createdAt) obj.createdAt = now;
        obj.updatedAt = now;
      });
      anyTable.hook("updating", (mods) => {
        if (!("updatedAt" in mods)) {
          return { ...mods, updatedAt: new Date().toISOString() };
        }
        return mods;
      });
    }
  }
}

export const db = new FitJourneyDB();

export async function resetAllData(): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}
