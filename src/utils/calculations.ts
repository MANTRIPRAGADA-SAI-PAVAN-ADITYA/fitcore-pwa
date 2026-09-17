// Pure, framework-free calculation helpers. Kept side-effect free so they
// can be unit tested in isolation from IndexedDB/Dexie and the UI layer.

import { addDays, differenceInCalendarDays, isAfter, isBefore, parseISO } from "date-fns";

export interface DatedValue {
  date: string; // ISO date yyyy-MM-dd
  value: number;
}

/** BMI in kg/m^2. Informational only — never presented as a diagnosis. */
export function calcBMI(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Below typical range";
  if (bmi < 25) return "Typical range";
  if (bmi < 30) return "Above typical range";
  return "Well above typical range";
}

/** Simple, non-weighted change between two values. Positive = increase. */
export function changeBetween(from: number, to: number): number {
  return to - from;
}

export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return ((to - from) / from) * 100;
}

/**
 * Percentage of the starting-to-target distance covered.
 * Handles loss and gain goals alike. Clamped to [0, 100] for display,
 * but callers can inspect the unclamped value if needed.
 */
export function progressPercent(
  startWeightKg: number,
  currentWeightKg: number,
  targetWeightKg: number,
): number {
  const totalDelta = targetWeightKg - startWeightKg;
  if (totalDelta === 0) return 100;
  const achieved = currentWeightKg - startWeightKg;
  const pct = (achieved / totalDelta) * 100;
  return Math.max(0, Math.min(100, pct));
}

/** Sorts a list of {date, value} ascending by date. Does not mutate input. */
export function sortByDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Rolling average over a trailing window of calendar days, computed for
 * each day that has at least one underlying value. When a day has multiple
 * entries, they are averaged first (e.g. multiple weigh-ins per day) so a
 * heavier-logged day doesn't skew the trend.
 */
export function rollingAverage(entries: DatedValue[], windowDays: number): DatedValue[] {
  if (entries.length === 0) return [];
  const byDay = averageByDay(entries);
  const days = sortByDateAsc(byDay);

  return days.map((day, idx) => {
    const windowStart = addDays(parseISO(day.date), -(windowDays - 1));
    const windowValues = days
      .slice(0, idx + 1)
      .filter((d) => !isBefore(parseISO(d.date), windowStart));
    const avg = windowValues.reduce((sum, d) => sum + d.value, 0) / windowValues.length;
    return { date: day.date, value: avg };
  });
}

/** Collapses multiple same-day values into a single daily average. */
export function averageByDay(entries: DatedValue[]): DatedValue[] {
  const groups = new Map<string, number[]>();
  for (const e of entries) {
    const list = groups.get(e.date) ?? [];
    list.push(e.value);
    groups.set(e.date, list);
  }
  return Array.from(groups.entries()).map(([date, values]) => ({
    date,
    value: values.reduce((a, b) => a + b, 0) / values.length,
  }));
}

/** Most recent daily value on or before `asOfDate` (defaults to latest). */
export function latestOnOrBefore(entries: DatedValue[], asOfDate?: string): DatedValue | null {
  const sorted = sortByDateAsc(entries);
  const filtered = asOfDate ? sorted.filter((e) => e.date <= asOfDate) : sorted;
  return filtered.length ? filtered[filtered.length - 1] : null;
}

/** Value N calendar days before the given date (nearest entry on/before). */
export function valueDaysAgo(entries: DatedValue[], fromDate: string, daysAgo: number): number | null {
  const target = addDays(parseISO(fromDate), -daysAgo);
  const sorted = sortByDateAsc(entries).filter((e) => !isAfter(parseISO(e.date), target));
  return sorted.length ? sorted[sorted.length - 1].value : null;
}

/**
 * Estimated weekly rate of change from historical data only, using a simple
 * least-squares linear regression over daily-averaged values. Returns null
 * when there isn't enough spread of dates to estimate a trend.
 */
export function estimatedWeeklyRate(entries: DatedValue[]): number | null {
  const daily = sortByDateAsc(averageByDay(entries));
  if (daily.length < 2) return null;

  const t0 = parseISO(daily[0].date).getTime();
  const points = daily.map((d) => ({
    x: (parseISO(d.date).getTime() - t0) / (1000 * 60 * 60 * 24), // days since first entry
    y: d.value,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null; // all entries on the same day

  const slopePerDay = (n * sumXY - sumX * sumY) / denominator;
  return slopePerDay * 7;
}

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export function sumNutrition(
  entries: Array<Pick<NutritionTotals, "calories" | "proteinG" | "carbsG" | "fatG" | "fiberG">>,
): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (totals, e) => ({
      calories: totals.calories + e.calories,
      proteinG: totals.proteinG + e.proteinG,
      carbsG: totals.carbsG + e.carbsG,
      fatG: totals.fatG + e.fatG,
      fiberG: totals.fiberG + e.fiberG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

/**
 * Consecutive-day streak ending at `asOfDate` for a set of dates on which a
 * habit/action was completed. A gap of one or more days resets the streak;
 * missing today does not retroactively erase yesterday's count when
 * `asOfDate` is still "today" and hasn't been logged yet — callers decide
 * whether to include today by including/excluding it from `completedDates`.
 */
export function currentStreak(completedDates: string[], asOfDate: string): number {
  const set = new Set(completedDates);
  let streak = 0;
  let cursor = asOfDate;
  while (set.has(cursor)) {
    streak += 1;
    cursor = formatISODate(addDays(parseISO(cursor), -1));
  }
  return streak;
}

export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(startDate: string, endDate: string): number {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate));
}

/** Flags an unusually low calorie target so the UI can show a gentle nudge. */
export function isCalorieTargetVeryLow(calorieTarget: number, sex: "female" | "male" | "intersex" | "prefer_not_to_say"): boolean {
  const floor = sex === "male" ? 1500 : 1200;
  return calorieTarget > 0 && calorieTarget < floor;
}
