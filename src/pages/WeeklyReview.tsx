import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { subDays } from "date-fns";
import { db } from "@/db/db";
import { PROFILE_ID } from "@/services/profile";
import { expectedScheduleDates } from "@/services/medication";
import { formatDuration } from "@/services/sleep";
import { averageByDay, changeBetween, formatISODate, sumNutrition } from "@/utils/calculations";
import { SYMPTOM_LABELS } from "@/services/symptoms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

function dateRange(daysAgo: number, today: Date): { start: string; end: string } {
  return { start: formatISODate(subDays(today, daysAgo)), end: formatISODate(today) };
}

export function WeeklyReview() {
  const today = new Date();
  const todayStr = formatISODate(today);
  const last7 = dateRange(6, today);
  const prev7 = dateRange(13, subDays(today, 7));

  const profile = useLiveQuery(() => db.users.get(PROFILE_ID), []);
  const weightEntries = useLiveQuery(() => db.weightEntries.toArray(), []) ?? [];
  const nutritionEntries = useLiveQuery(() => db.nutritionEntries.toArray(), []) ?? [];
  const exerciseEntries = useLiveQuery(() => db.exerciseEntries.toArray(), []) ?? [];
  const sleepEntries = useLiveQuery(() => db.sleepEntries.toArray(), []) ?? [];
  const medications = useLiveQuery(() => db.medications.toArray(), []) ?? [];
  const medicationLogs = useLiveQuery(() => db.medicationLogs.toArray(), []) ?? [];
  const symptomEntries = useLiveQuery(() => db.symptomEntries.toArray(), []) ?? [];

  const inRange = <T extends { date: string }>(items: T[], start: string, end: string) =>
    items.filter((i) => i.date >= start && i.date <= end);

  const summary = useMemo(() => {
    const w7 = inRange(weightEntries, last7.start, last7.end);
    const wPrev = inRange(weightEntries, prev7.start, prev7.end);
    const avg7 = averageByDay(w7.map((w) => ({ date: w.date, value: w.weightKg })));
    const avgPrev = averageByDay(wPrev.map((w) => ({ date: w.date, value: w.weightKg })));
    const mean = (arr: { value: number }[]) => (arr.length ? arr.reduce((s, a) => s + a.value, 0) / arr.length : null);
    const meanLast7 = mean(avg7);
    const meanPrev7 = mean(avgPrev);

    const n7 = inRange(nutritionEntries, last7.start, last7.end);
    const nutritionByDate = new Map<string, typeof n7>();
    for (const e of n7) nutritionByDate.set(e.date, [...(nutritionByDate.get(e.date) ?? []), e]);
    const dailyTotals = Array.from(nutritionByDate.values()).map((es) => sumNutrition(es));
    const avgCalories = dailyTotals.length ? dailyTotals.reduce((s, d) => s + d.calories, 0) / dailyTotals.length : null;
    const avgProtein = dailyTotals.length ? dailyTotals.reduce((s, d) => s + d.proteinG, 0) / dailyTotals.length : null;

    const ex7 = inRange(exerciseEntries, last7.start, last7.end);
    const totalExerciseMin = ex7.reduce((s, e) => s + e.durationMin, 0);

    const sl7 = inRange(sleepEntries, last7.start, last7.end);
    const avgSleepMin = sl7.length ? sl7.reduce((s, e) => s + e.durationMin, 0) / sl7.length : null;

    let scheduled = 0;
    let logged = 0;
    let missedOrSkipped = 0;
    for (const med of medications) {
      const dates = expectedScheduleDates(med, new Date(last7.start), new Date(last7.end));
      scheduled += dates.length;
      for (const d of dates) {
        const log = medicationLogs.find((l) => l.medicationId === med.id && l.date === d);
        if (log?.status === "taken") logged += 1;
        else if (log) missedOrSkipped += 1;
        else if (d < todayStr) missedOrSkipped += 1;
      }
    }

    const sym7 = inRange(symptomEntries, last7.start, last7.end);
    const symptomCounts = new Map<string, number>();
    for (const s of sym7) symptomCounts.set(s.type, (symptomCounts.get(s.type) ?? 0) + 1);
    const topSymptoms = Array.from(symptomCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return {
      meanLast7,
      meanPrev7,
      avgCalories,
      avgProtein,
      daysNutritionLogged: nutritionByDate.size,
      exerciseSessions: ex7.length,
      totalExerciseMin,
      avgSleepMin,
      scheduled,
      logged,
      missedOrSkipped,
      topSymptoms,
    };
  }, [weightEntries, nutritionEntries, exerciseEntries, sleepEntries, medications, medicationLogs, symptomEntries, last7.start, last7.end, prev7.start, prev7.end, todayStr]);

  if (!profile) return null;

  const weightChange = summary.meanLast7 !== null && summary.meanPrev7 !== null ? changeBetween(summary.meanPrev7, summary.meanLast7) : null;

  return (
    <div className="space-y-4 pb-4">
      <p className="text-sm text-text-muted">Your last 7 days ({last7.start} – {last7.end})</p>

      <Card>
        <CardHeader>
          <CardTitle>Weight</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Starting" value={`${profile.startingWeightKg} kg`} />
          <Stat label="Current" value={`${(summary.meanLast7 ?? profile.currentWeightKg).toFixed(1)} kg`} />
          <Stat label="7-day avg" value={summary.meanLast7 !== null ? `${summary.meanLast7.toFixed(1)} kg` : "—"} />
          <Stat
            label="Vs. previous week"
            value={weightChange !== null ? `${weightChange <= 0 ? "↓" : "↑"} ${Math.abs(weightChange).toFixed(1)} kg` : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nutrition</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-sm">
          <Stat label="Avg calories" value={summary.avgCalories !== null ? Math.round(summary.avgCalories) : "—"} />
          <Stat label="Avg protein" value={summary.avgProtein !== null ? `${Math.round(summary.avgProtein)}g` : "—"} />
          <Stat label="Days logged" value={summary.daysNutritionLogged} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercise</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Total sessions" value={summary.exerciseSessions} />
          <Stat label="Total minutes" value={summary.totalExerciseMin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sleep</CardTitle>
        </CardHeader>
        <CardContent>
          <Stat label="Average sleep" value={summary.avgSleepMin !== null ? formatDuration(Math.round(summary.avgSleepMin)) : "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medication</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-sm">
          <Stat label="Scheduled" value={summary.scheduled} />
          <Stat label="Logged" value={summary.logged} />
          <Stat label="Missed/skipped" value={summary.missedOrSkipped} />
        </CardContent>
      </Card>

      {summary.topSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Symptoms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {summary.topSymptoms.map(([type, count]) => (
              <p key={type}>
                {SYMPTOM_LABELS[type as keyof typeof SYMPTOM_LABELS]} — logged {count}×
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>This week, plainly</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-text">
          <p>You logged {summary.exerciseSessions} workout{summary.exerciseSessions === 1 ? "" : "s"} this week.</p>
          {summary.avgSleepMin !== null && <p>You averaged {formatDuration(Math.round(summary.avgSleepMin))} of sleep.</p>}
          {weightChange !== null && (
            <p>Your 7-day average weight {weightChange <= 0 ? "decreased" : "increased"} by {Math.abs(weightChange).toFixed(1)} kg.</p>
          )}
          <p>You logged nutrition on {summary.daysNutritionLogged} of the last 7 days.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-lg font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
