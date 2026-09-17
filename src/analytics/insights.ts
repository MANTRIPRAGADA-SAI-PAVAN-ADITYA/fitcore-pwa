// Rule-based analytics only — no LLM, no inference beyond the user's own
// logged history. Every insight here must describe what happened, never
// diagnose, and never suggest a medication change. See MedicationDisclaimer
// and the product safety rules for why this boundary matters.

import { subDays } from "date-fns";
import { formatISODate, sumNutrition, averageByDay } from "@/utils/calculations";
import type { ExerciseEntry, NutritionEntry, WeightEntry } from "@/types/models";

export interface Insight {
  id: string;
  text: string;
}

function withinLastDays(date: string, days: number, today: string): boolean {
  const cutoff = formatISODate(subDays(new Date(today), days));
  return date >= cutoff && date <= today;
}

export function weightTrendInsight(weightEntries: WeightEntry[], today: string, weeks = 4): Insight | null {
  const windowDays = weeks * 7;
  const recent = weightEntries.filter((e) => withinLastDays(e.date, windowDays, today));
  const daily = averageByDay(recent.map((e) => ({ date: e.date, value: e.weightKg })));
  if (daily.length < 2) return null;

  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const delta = last - first;
  if (Math.abs(delta) < 0.05) {
    return { id: "weight-trend", text: `Your average weight has stayed roughly steady over the last ${weeks} weeks.` };
  }
  const direction = delta < 0 ? "decreased" : "increased";
  return {
    id: "weight-trend",
    text: `Your average weight has ${direction} ${Math.abs(delta).toFixed(1)} kg over the last ${weeks} weeks.`,
  };
}

export function strengthFrequencyInsight(exerciseEntries: ExerciseEntry[], today: string, days = 14): Insight | null {
  const recent = exerciseEntries.filter((e) => withinLastDays(e.date, days, today));
  if (recent.length === 0) return null;
  const strengthDays = new Set(recent.filter((e) => e.category === "strength").map((e) => e.date)).size;
  if (strengthDays === 0) return null;
  return {
    id: "strength-frequency",
    text: `You logged strength training on ${strengthDays} of the last ${days} days.`,
  };
}

export function activeDaysInsight(exerciseEntries: ExerciseEntry[], today: string, days = 14): Insight | null {
  const recent = exerciseEntries.filter((e) => withinLastDays(e.date, days, today));
  const activeDays = new Set(recent.map((e) => e.date)).size;
  if (activeDays === 0) return null;
  return { id: "active-days", text: `You were active on ${activeDays} of the last ${days} days.` };
}

export function calorieVsWorkoutDayInsight(
  nutritionEntries: NutritionEntry[],
  exerciseEntries: ExerciseEntry[],
  today: string,
  days = 14,
): Insight | null {
  const recentNutrition = nutritionEntries.filter((e) => withinLastDays(e.date, days, today));
  const recentExercise = exerciseEntries.filter((e) => withinLastDays(e.date, days, today));
  const workoutDates = new Set(recentExercise.map((e) => e.date));

  const byDate = new Map<string, NutritionEntry[]>();
  for (const entry of recentNutrition) byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);

  const workoutDayTotals: number[] = [];
  const restDayTotals: number[] = [];
  for (const [date, entries] of byDate) {
    const totalCalories = sumNutrition(entries).calories;
    if (workoutDates.has(date)) workoutDayTotals.push(totalCalories);
    else restDayTotals.push(totalCalories);
  }

  if (workoutDayTotals.length < 2 || restDayTotals.length < 2) return null;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const workoutAvg = avg(workoutDayTotals);
  const restAvg = avg(restDayTotals);
  const diffPct = ((restAvg - workoutAvg) / Math.max(1, restAvg)) * 100;

  if (Math.abs(diffPct) < 5) return null;

  return {
    id: "calorie-workout-day",
    text:
      diffPct > 0
        ? `You tend to record lower calorie intake on workout days (${Math.round(workoutAvg)} vs ${Math.round(restAvg)} cal on rest days).`
        : `You tend to record higher calorie intake on workout days (${Math.round(workoutAvg)} vs ${Math.round(restAvg)} cal on rest days).`,
  };
}

export function proteinTargetInsight(
  nutritionEntries: NutritionEntry[],
  proteinTargetG: number,
  today: string,
  days = 14,
): Insight | null {
  const recent = nutritionEntries.filter((e) => withinLastDays(e.date, days, today));
  if (recent.length === 0) return null;

  const byDate = new Map<string, NutritionEntry[]>();
  for (const entry of recent) byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);

  let daysHit = 0;
  for (const entries of byDate.values()) {
    if (sumNutrition(entries).proteinG >= proteinTargetG) daysHit += 1;
  }

  const loggedDays = byDate.size;
  return {
    id: "protein-target",
    text: `Your protein target was reached on ${daysHit} of the last ${loggedDays} logged day${loggedDays === 1 ? "" : "s"}.`,
  };
}

export function generateInsights(input: {
  weightEntries: WeightEntry[];
  exerciseEntries: ExerciseEntry[];
  nutritionEntries: NutritionEntry[];
  proteinTargetG: number;
  today?: string;
}): Insight[] {
  const today = input.today ?? formatISODate(new Date());
  const insights = [
    weightTrendInsight(input.weightEntries, today),
    activeDaysInsight(input.exerciseEntries, today),
    strengthFrequencyInsight(input.exerciseEntries, today),
    calorieVsWorkoutDayInsight(input.nutritionEntries, input.exerciseEntries, today),
    proteinTargetInsight(input.nutritionEntries, input.proteinTargetG, today),
  ].filter((i): i is Insight => i !== null);

  return insights;
}
