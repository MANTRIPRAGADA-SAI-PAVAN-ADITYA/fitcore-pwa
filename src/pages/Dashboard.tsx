import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { Flame, Droplets, Dumbbell, Moon, Pill, Scale } from "lucide-react";
import { db } from "@/db/db";
import { PROFILE_ID } from "@/services/profile";
import { getSettings } from "@/services/settings";
import { totalWaterMl } from "@/services/water";
import { formatDuration } from "@/services/sleep";
import { sumNutrition, changeBetween, valueDaysAgo, progressPercent, formatISODate } from "@/utils/calculations";
import { currentStreak } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

export function Dashboard() {
  const today = formatISODate(new Date());
  const profile = useLiveQuery(() => db.users.get(PROFILE_ID), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const weightEntries = useLiveQuery(() => db.weightEntries.orderBy("date").toArray(), []) ?? [];
  const nutritionToday = useLiveQuery(() => db.nutritionEntries.where("date").equals(today).toArray(), [today]) ?? [];
  const waterToday = useLiveQuery(() => db.waterEntries.where("date").equals(today).toArray(), [today]) ?? [];
  const exerciseToday = useLiveQuery(() => db.exerciseEntries.where("date").equals(today).toArray(), [today]) ?? [];
  const sleepEntries = useLiveQuery(() => db.sleepEntries.orderBy("date").reverse().limit(1).toArray(), []) ?? [];
  const activeMedications = useLiveQuery(() => db.medications.toArray(), []) ?? [];
  const medicationLogsToday = useLiveQuery(() => db.medicationLogs.where("date").equals(today).toArray(), [today]) ?? [];
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const allHabitLogs = useLiveQuery(() => db.habitLogs.toArray(), []);

  if (!profile || !settings) return null;

  const weightSeries = weightEntries.map((w) => ({ date: w.date, value: w.weightKg }));
  const latestWeight = weightEntries.length ? weightEntries[weightEntries.length - 1].weightKg : profile.currentWeightKg;
  const sinceStart = changeBetween(profile.startingWeightKg, latestWeight);
  const weekAgo = valueDaysAgo(weightSeries, today, 7);
  const monthAgo = valueDaysAgo(weightSeries, today, 30);
  const change7d = weekAgo !== null ? changeBetween(weekAgo, latestWeight) : null;
  const change30d = monthAgo !== null ? changeBetween(monthAgo, latestWeight) : null;
  const progressPct = progressPercent(profile.startingWeightKg, latestWeight, profile.targetWeightKg);

  const nutritionTotals = sumNutrition(nutritionToday);
  const waterMl = totalWaterMl(waterToday);
  const exerciseMinutes = exerciseToday.reduce((sum, e) => sum + e.durationMin, 0);
  const lastSleep = sleepEntries[0];

  const anyMedicationLoggedToday = medicationLogsToday.some((l) => l.status === "taken");
  const hasActiveMedication = activeMedications.some((m) => m.active);

  const habitList = (habits ?? []).filter((h) => !h.archived);
  const habitLogsCompleted = (allHabitLogs ?? []).filter((l) => l.completed);
  const streaks = habitList.map((h) =>
    currentStreak(
      habitLogsCompleted.filter((l) => l.habitId === h.id).map((l) => l.date),
      today,
    ),
  );
  const bestStreak = streaks.length ? Math.max(...streaks) : 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <p className="text-sm text-text-muted">Welcome back,</p>
        <h2 className="text-2xl font-bold text-text">{profile.name}</h2>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Weight</p>
            <p className="text-2xl font-bold text-text">{latestWeight.toFixed(1)} kg</p>
            <p className={`text-xs font-medium ${sinceStart <= 0 ? "text-positive" : "text-text-muted"}`}>
              {sinceStart <= 0 ? "↓" : "↑"} {Math.abs(sinceStart).toFixed(1)} kg since starting
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Target</p>
            <p className="text-2xl font-bold text-text">{profile.targetWeightKg} kg</p>
            <p className="text-xs text-text-muted">
              {change7d !== null ? `7d avg change ${change7d <= 0 ? "↓" : "↑"} ${Math.abs(change7d).toFixed(1)} kg` : "Log more to see trend"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Progress</p>
            <p className="text-2xl font-bold text-text">{progressPct.toFixed(0)}%</p>
            <p className="text-xs text-text-muted">
              {change30d !== null ? `30d change ${change30d <= 0 ? "↓" : "↑"} ${Math.abs(change30d).toFixed(1)} kg` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Streak</p>
            <p className="flex items-center gap-1 text-2xl font-bold text-text">
              <Flame className="h-5 w-5 text-attention" /> {bestStreak}d
            </p>
            <p className="text-xs text-text-muted">Best active habit streak</p>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <ProgressBar value={progressPct} label="Progress toward target weight" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&rsquo;s nutrition</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ProgressRing
              value={(nutritionTotals.calories / Math.max(1, settings.nutritionTargets.calories)) * 100}
              size={80}
              tone="brand"
              label="Calories consumed vs target"
            >
              <span className="text-xs font-semibold">
                {Math.round((nutritionTotals.calories / Math.max(1, settings.nutritionTargets.calories)) * 100)}%
              </span>
            </ProgressRing>
            <div className="space-y-1 text-sm">
              <p>
                Calories <span className="font-semibold">{Math.round(nutritionTotals.calories)}</span> /{" "}
                {settings.nutritionTargets.calories}
              </p>
              <p>
                Protein <span className="font-semibold">{Math.round(nutritionTotals.proteinG)}g</span> /{" "}
                {settings.nutritionTargets.proteinG}g
              </p>
              <Link to="/nutrition" className="text-xs font-medium text-brand hover:underline">
                Log food →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hydration</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ProgressRing
              value={(waterMl / Math.max(1, settings.nutritionTargets.waterMl)) * 100}
              size={80}
              tone="info"
              label="Water consumed vs target"
            >
              <Droplets className="h-6 w-6 text-info" />
            </ProgressRing>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-semibold">{(waterMl / 1000).toFixed(2)} L</span> /{" "}
                {(settings.nutritionTargets.waterMl / 1000).toFixed(1)} L
              </p>
              <Link to="/water" className="text-xs font-medium text-brand hover:underline">
                Add water →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medication</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Pill className="h-8 w-8 text-brand" />
            <div>
              {hasActiveMedication ? (
                <Badge tone={anyMedicationLoggedToday ? "positive" : "attention"}>
                  {anyMedicationLoggedToday ? "✓ Logged today" : "Not yet logged today"}
                </Badge>
              ) : (
                <Badge tone="neutral">No medication set up</Badge>
              )}
              <Link to="/medication" className="mt-1 block text-xs font-medium text-brand hover:underline">
                Open medication →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercise &amp; sleep</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-text-muted" />
              <div>
                <p className="text-sm font-semibold">{exerciseMinutes} min</p>
                <p className="text-xs text-text-muted">Today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="h-6 w-6 text-text-muted" />
              <div>
                <p className="text-sm font-semibold">{lastSleep ? formatDuration(lastSleep.durationMin) : "—"}</p>
                <p className="text-xs text-text-muted">Last night</p>
              </div>
            </div>
            <Scale className="hidden h-6 w-6 text-text-muted sm:block" aria-hidden="true" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/check-in">
          <Card className="p-3 text-center hover:bg-surface-muted">
            <p className="text-sm font-semibold">Daily check-in</p>
          </Card>
        </Link>
        <Link to="/weekly-review">
          <Card className="p-3 text-center hover:bg-surface-muted">
            <p className="text-sm font-semibold">Weekly review</p>
          </Card>
        </Link>
        <Link to="/insights">
          <Card className="p-3 text-center hover:bg-surface-muted">
            <p className="text-sm font-semibold">Insights</p>
          </Card>
        </Link>
        <Link to="/safety">
          <Card className="p-3 text-center hover:bg-surface-muted">
            <p className="text-sm font-semibold">Safety &amp; help</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
