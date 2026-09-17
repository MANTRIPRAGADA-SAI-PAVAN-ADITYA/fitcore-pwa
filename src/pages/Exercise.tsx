import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { subDays } from "date-fns";
import { db } from "@/db/db";
import { addExerciseEntry, deleteExerciseEntry, listExerciseEntriesBetween } from "@/services/exercise";
import { formatISODate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { ExerciseCategory, ExerciseIntensity } from "@/types/models";

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: "strength", label: "Strength training" },
  { value: "walking", label: "Walking" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "boxing", label: "Boxing" },
  { value: "yoga", label: "Yoga" },
  { value: "cardio", label: "Cardio" },
  { value: "other", label: "Other" },
];

export function Exercise() {
  const today = formatISODate(new Date());
  const weekStart = formatISODate(subDays(new Date(), 6));
  const weekEntries = useLiveQuery(() => listExerciseEntriesBetween(weekStart, today), [weekStart, today]) ?? [];
  const allEntries = useLiveQuery(() => db.exerciseEntries.orderBy("date").reverse().limit(30).toArray(), []) ?? [];

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [category, setCategory] = useState<ExerciseCategory>("walking");
  const [customLabel, setCustomLabel] = useState("");
  const [durationMin, setDurationMin] = useState("30");
  const [intensity, setIntensity] = useState<ExerciseIntensity>("moderate");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [steps, setSteps] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [notes, setNotes] = useState("");

  const weeklySummary = useMemo(() => {
    const totalDuration = weekEntries.reduce((sum, e) => sum + e.durationMin, 0);
    const activeDays = new Set(weekEntries.map((e) => e.date)).size;
    const strengthSessions = weekEntries.filter((e) => e.category === "strength").length;
    const cardioSessions = weekEntries.filter((e) => e.category === "cardio" || e.category === "cycling" || e.category === "swimming").length;
    return { sessions: weekEntries.length, totalDuration, activeDays, strengthSessions, cardioSessions };
  }, [weekEntries]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await addExerciseEntry({
      date,
      time,
      category,
      customLabel: category === "other" ? customLabel.trim() || undefined : undefined,
      durationMin: Number(durationMin) || 0,
      intensity,
      caloriesBurned: caloriesBurned ? Number(caloriesBurned) : undefined,
      steps: steps ? Number(steps) : undefined,
      distanceKm: distanceKm ? Number(distanceKm) : undefined,
      notes: notes.trim() || undefined,
    });
    setDurationMin("30");
    setCaloriesBurned("");
    setSteps("");
    setDistanceKm("");
    setNotes("");
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Sessions" value={weeklySummary.sessions} />
          <Stat label="Total minutes" value={weeklySummary.totalDuration} />
          <Stat label="Active days" value={weeklySummary.activeDays} />
          <Stat label="Strength / Cardio" value={`${weeklySummary.strengthSessions} / ${weeklySummary.cardioSessions}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log a workout</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ex-date">Date</Label>
                <Input id="ex-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ex-time">Time</Label>
                <Input id="ex-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="ex-category">Type</Label>
              <Select id="ex-category" value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            {category === "other" && (
              <div>
                <Label htmlFor="ex-custom">Custom workout name</Label>
                <Input id="ex-custom" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ex-duration">Duration (min)</Label>
                <Input id="ex-duration" type="number" min={0} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ex-intensity">Intensity</Label>
                <Select id="ex-intensity" value={intensity} onChange={(e) => setIntensity(e.target.value as ExerciseIntensity)}>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="vigorous">Vigorous</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="ex-calories">Calories</Label>
                <Input id="ex-calories" type="number" min={0} value={caloriesBurned} onChange={(e) => setCaloriesBurned(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ex-steps">Steps</Label>
                <Input id="ex-steps" type="number" min={0} value={steps} onChange={(e) => setSteps(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ex-distance">Distance (km)</Label>
                <Input id="ex-distance" type="number" step="0.1" min={0} value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="ex-notes">Notes</Label>
              <Textarea id="ex-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">
              Log workout
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent workouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {allEntries.length === 0 && <p className="text-sm text-text-muted">No workouts logged yet.</p>}
          {allEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium capitalize">
                  {entry.customLabel || entry.category.replace("_", " ")} · {entry.durationMin} min
                </p>
                <p className="text-xs text-text-muted">
                  {entry.date} {entry.time} · {entry.intensity}
                  {entry.caloriesBurned ? ` · ${entry.caloriesBurned} cal` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteExerciseEntry(entry.id)}
                className="focus-ring rounded-lg p-2 text-text-muted hover:bg-urgent-soft hover:text-urgent"
                aria-label="Delete entry"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
