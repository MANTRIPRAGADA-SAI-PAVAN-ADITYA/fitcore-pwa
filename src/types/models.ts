// Core domain types for FitJourney. All entities are local-first records
// stored in IndexedDB (see src/db/db.ts). Every persisted record carries
// createdAt/updatedAt so history and sync (future) can reason about change.

export type ID = string;

export interface BaseRecord {
  id: ID;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type Sex = "female" | "male" | "intersex" | "prefer_not_to_say";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type DietaryPreference =
  | "none"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "halal"
  | "kosher"
  | "low_carb"
  | "gluten_free"
  | "other";

export type UnitSystem = "metric" | "imperial";

export interface UserProfile extends BaseRecord {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  startingWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  targetDate: string | null; // ISO date
  activityLevel: ActivityLevel;
  dietaryPreference: DietaryPreference;
  allergies: string[];
  exerciseFrequencyPerWeek: number;
  units: UnitSystem;
  onboardedAt: string | null;
}

export interface WeightEntry extends BaseRecord {
  date: string; // ISO date (yyyy-MM-dd)
  time: string; // HH:mm
  weightKg: number;
  note?: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Food extends BaseRecord {
  name: string;
  servingSize: string; // e.g. "1 cup", "100 g"
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface MealFoodItem {
  foodId: ID;
  servings: number;
}

export interface Meal extends BaseRecord {
  name: string; // e.g. "Overnight oats bowl"
  items: MealFoodItem[];
}

export interface NutritionEntry extends BaseRecord {
  date: string; // ISO date
  time: string; // HH:mm
  mealType: MealType;
  foodId?: ID;
  mealId?: ID;
  description: string; // resolved label at time of logging
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface WaterEntry extends BaseRecord {
  date: string; // ISO date
  time: string; // HH:mm
  amountMl: number;
}

export type ExerciseCategory =
  | "strength"
  | "walking"
  | "cycling"
  | "swimming"
  | "boxing"
  | "yoga"
  | "cardio"
  | "other";

export type ExerciseIntensity = "light" | "moderate" | "vigorous";

export interface ExerciseEntry extends BaseRecord {
  date: string;
  time: string;
  category: ExerciseCategory;
  customLabel?: string;
  durationMin: number;
  intensity: ExerciseIntensity;
  caloriesBurned?: number;
  steps?: number;
  distanceKm?: number;
  notes?: string;
}

export interface SleepEntry extends BaseRecord {
  date: string; // date the sleep is attributed to (wake date)
  bedtime: string; // ISO datetime
  wakeTime: string; // ISO datetime
  durationMin: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export type MedicationFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";

export interface Medication extends BaseRecord {
  name: string; // user-entered, defaults to "Semaglutide"
  prescribedDose: string; // free text, e.g. "0.25 mg" — user/doctor supplied
  frequency: MedicationFrequency;
  prescribedDayOfWeek?: number; // 0-6 for weekly/biweekly
  prescribedTime: string; // HH:mm
  startDate: string; // ISO date
  prescribingDoctor?: string;
  clinicContact?: string;
  active: boolean;
  notes?: string;
}

export type MedicationLogStatus = "taken" | "missed" | "skipped";

export interface InjectionSite {
  label: string; // e.g. "Left thigh"
}

export interface MedicationLog extends BaseRecord {
  medicationId: ID;
  date: string;
  time: string;
  status: MedicationLogStatus;
  prescribedDose: string;
  actualDose?: string;
  injectionSite?: string;
  notes?: string;
}

export type SymptomType =
  | "nausea"
  | "vomiting"
  | "diarrhea"
  | "constipation"
  | "abdominal_discomfort"
  | "heartburn"
  | "reduced_appetite"
  | "fatigue"
  | "headache"
  | "dizziness"
  | "injection_site_reaction"
  | "other";

export type SymptomSeverity = 0 | 1 | 2 | 3;

export interface SymptomEntry extends BaseRecord {
  date: string;
  time: string;
  type: SymptomType;
  customLabel?: string;
  severity: SymptomSeverity;
  durationMin?: number;
  notes?: string;
  medicationLogId?: ID; // optional link the user made themselves
}

export type MeasurementType =
  | "waist"
  | "chest"
  | "hips"
  | "neck"
  | "arms"
  | "thighs"
  | "body_fat_pct"
  | "custom";

export interface Measurement extends BaseRecord {
  date: string;
  type: MeasurementType;
  customLabel?: string;
  valueCm: number; // for body_fat_pct this stores the percentage value
  note?: string;
}

export interface ProgressPhoto extends BaseRecord {
  date: string;
  blob: Blob;
  note?: string;
}

export interface DailyCheckin extends BaseRecord {
  date: string; // one per day
  weightKg?: number;
  appetite?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  sleepHours?: number;
  waterLiters?: number;
  exerciseCompleted?: boolean;
  nutritionLogged?: boolean;
  medicationLogged?: boolean;
  hasSymptoms?: boolean;
  symptomNote?: string;
}

export type HabitKey =
  | "log_weight"
  | "log_nutrition"
  | "hit_protein_target"
  | "drink_enough_water"
  | "exercise"
  | "sleep_target"
  | "medication_logged"
  | "daily_checkin"
  | string; // allow custom habit keys

export interface Habit extends BaseRecord {
  key: HabitKey;
  label: string;
  isCustom: boolean;
  archived: boolean;
}

export interface HabitLog extends BaseRecord {
  habitId: ID;
  date: string;
  completed: boolean;
}

export type ReminderType =
  | "daily_checkin"
  | "weight"
  | "water"
  | "exercise"
  | "medication";

export interface ReminderSetting extends BaseRecord {
  type: ReminderType;
  enabled: boolean;
  time: string; // HH:mm
  daysOfWeek: number[]; // 0-6, empty = every day
  label: string;
  medicationId?: ID; // for medication reminders
  sound: boolean;
  vibrate: boolean;
}

export interface EmergencyContact {
  emergencyNumber?: string;
  doctorName?: string;
  doctorPhone?: string;
  clinicName?: string;
  clinicPhone?: string;
  hospitalName?: string;
  hospitalPhone?: string;
}

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
}

export interface AppSettings extends BaseRecord {
  key: "app_settings"; // singleton row
  nutritionTargets: NutritionTargets;
  emergencyContact: EmergencyContact;
  theme: "light" | "dark" | "system";
  lowCaloriePromptDismissed: boolean;
}
