import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { subDays } from "date-fns";
import { db } from "@/db/db";
import { addSleepEntry, deleteSleepEntry, formatDuration } from "@/services/sleep";
import { formatISODate, sumNutrition } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function Sleep() {
  const today = formatISODate(new Date());
  const ninetyDaysAgo = formatISODate(subDays(new Date(), 90));

  const entries = useLiveQuery(() => db.sleepEntries.orderBy("date").reverse().toArray(), []) ?? [];
  const weightEntries = useLiveQuery(() => db.weightEntries.orderBy("date").toArray(), []) ?? [];
  const exerciseEntries = useLiveQuery(() => db.exerciseEntries.where("date").between(ninetyDaysAgo, today, true, true).toArray(), [ninetyDaysAgo, today]) ?? [];
  const nutritionEntries = useLiveQuery(() => db.nutritionEntries.where("date").between(ninetyDaysAgo, today, true, true).toArray(), [ninetyDaysAgo, today]) ?? [];

  const defaultWake = new Date();
  const defaultBed = subDays(defaultWake, 0);
  defaultBed.setHours(defaultWake.getHours() - 8);

  const [date, setDate] = useState(today);
  const [bedtime, setBedtime] = useState(toLocalInputValue(defaultBed));
  const [wakeTime, setWakeTime] = useState(toLocalInputValue(defaultWake));
  const [quality, setQuality] = useState("3");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await addSleepEntry({
      date,
      bedtime: new Date(bedtime).toISOString(),
      wakeTime: new Date(wakeTime).toISOString(),
      quality: Number(quality) as 1 | 2 | 3 | 4 | 5,
      notes: notes.trim() || undefined,
    });
    setNotes("");
  }

  const correlation = useMemo(() => {
    const weightByDate = new Map(weightEntries.map((w) => [w.date, w.weightKg]));
    const exerciseByDate = new Map<string, number>();
    for (const ex of exerciseEntries) exerciseByDate.set(ex.date, (exerciseByDate.get(ex.date) ?? 0) + ex.durationMin);
    const nutritionByDate = new Map<string, ReturnType<typeof sumNutrition>>();
    const grouped = new Map<string, typeof nutritionEntries>();
    for (const n of nutritionEntries) grouped.set(n.date, [...(grouped.get(n.date) ?? []), n]);
    for (const [d, list] of grouped) nutritionByDate.set(d, sumNutrition(list));

    const goodSleep = entries.filter((e) => e.durationMin >= 420);
    const shortSleep = entries.filter((e) => e.durationMin < 420);

    const avg = (arr: number[]): number | null => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    const goodWeights = goodSleep.map((e) => weightByDate.get(e.date)).filter((v): v is number => v !== undefined);
    const shortWeights = shortSleep.map((e) => weightByDate.get(e.date)).filter((v): v is number => v !== undefined);
    const goodExercise = goodSleep.map((e) => exerciseByDate.get(e.date) ?? 0);
    const shortExercise = shortSleep.map((e) => exerciseByDate.get(e.date) ?? 0);
    const goodCalories = goodSleep.map((e) => nutritionByDate.get(e.date)?.calories ?? null).filter((v): v is number => v !== null);
    const shortCalories = shortSleep.map((e) => nutritionByDate.get(e.date)?.calories ?? null).filter((v): v is number => v !== null);

    return {
      goodNights: goodSleep.length,
      shortNights: shortSleep.length,
      avgWeightGood: avg(goodWeights),
      avgWeightShort: avg(shortWeights),
      avgExerciseGood: avg(goodExercise),
      avgExerciseShort: avg(shortExercise),
      avgCaloriesGood: avg(goodCalories),
      avgCaloriesShort: avg(shortCalories),
    };
  }, [entries, weightEntries, exerciseEntries, nutritionEntries]);

  const hasEnoughData = correlation.goodNights >= 3 && correlation.shortNights >= 3;

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Log sleep</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="sl-date">Date (wake day)</Label>
              <Input id="sl-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sl-bed">Bedtime</Label>
                <Input id="sl-bed" type="datetime-local" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sl-wake">Wake time</Label>
                <Input id="sl-wake" type="datetime-local" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="sl-quality">Sleep quality</Label>
              <Select id="sl-quality" value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="1">1 — Poor</option>
                <option value="2">2 — Below average</option>
                <option value="3">3 — Average</option>
                <option value="4">4 — Good</option>
                <option value="5">5 — Excellent</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="sl-notes">Notes</Label>
              <Textarea id="sl-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">
              Save sleep entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patterns in your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!hasEnoughData && (
            <p className="text-text-muted">Log at least a few nights of both shorter and longer sleep to see patterns here.</p>
          )}
          {hasEnoughData && (
            <>
              {correlation.avgWeightGood !== null && correlation.avgWeightShort !== null && (
                <p>
                  On days following 7+ hours of sleep, your average weight was{" "}
                  <span className="font-semibold">{correlation.avgWeightGood.toFixed(1)} kg</span>, compared to{" "}
                  <span className="font-semibold">{correlation.avgWeightShort.toFixed(1)} kg</span> after shorter nights.
                </p>
              )}
              {correlation.avgExerciseGood !== null && correlation.avgExerciseShort !== null && (
                <p>
                  You averaged <span className="font-semibold">{Math.round(correlation.avgExerciseGood)} min</span> of exercise
                  after longer sleep, vs <span className="font-semibold">{Math.round(correlation.avgExerciseShort)} min</span> after
                  shorter sleep.
                </p>
              )}
              {correlation.avgCaloriesGood !== null && correlation.avgCaloriesShort !== null && (
                <p>
                  Average logged calories were <span className="font-semibold">{Math.round(correlation.avgCaloriesGood)}</span> after
                  longer sleep vs <span className="font-semibold">{Math.round(correlation.avgCaloriesShort)}</span> after shorter
                  sleep.
                </p>
              )}
              <p className="text-xs text-text-muted">
                These are patterns observed in your own logged data only — not a claim that sleep caused these differences.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-text-muted">No sleep logged yet.</p>}
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{formatDuration(entry.durationMin)}</p>
                <p className="text-xs text-text-muted">
                  {entry.date} · quality {entry.quality}/5
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteSleepEntry(entry.id)}
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
