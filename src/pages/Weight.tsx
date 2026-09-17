import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Download } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { db } from "@/db/db";
import { PROFILE_ID } from "@/services/profile";
import { addWeightEntry, deleteWeightEntry } from "@/services/weight";
import { rollingAverage, changeBetween, formatISODate } from "@/utils/calculations";
import { toCSV } from "@/utils/csv";
import { downloadText } from "@/utils/download";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

export function Weight() {
  const entries = useLiveQuery(() => db.weightEntries.orderBy("[date+time]").toArray(), []) ?? [];
  const profile = useLiveQuery(() => db.users.get(PROFILE_ID), []);

  const [date, setDate] = useState(formatISODate(new Date()));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [weightKg, setWeightKg] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const series = useMemo(() => entries.map((e) => ({ date: e.date, value: e.weightKg })), [entries]);
  const rolling7 = useMemo(() => rollingAverage(series, 7), [series]);
  const rolling30 = useMemo(() => rollingAverage(series, 30), [series]);

  const chartData = useMemo(() => {
    const r7Map = new Map(rolling7.map((r) => [r.date, r.value]));
    const r30Map = new Map(rolling30.map((r) => [r.date, r.value]));
    const uniqueDates = Array.from(new Set(series.map((s) => s.date))).sort();
    return uniqueDates.map((d) => {
      const dayEntries = series.filter((s) => s.date === d);
      const daily = dayEntries.reduce((a, b) => a + b.value, 0) / dayEntries.length;
      return {
        date: d,
        daily,
        avg7: r7Map.get(d),
        avg30: r30Map.get(d),
      };
    });
  }, [series, rolling7, rolling30]);

  const last = chartData.at(-1);
  const prev = chartData.at(-2);
  const dailyChange = last && prev ? changeBetween(prev.daily, last.daily) : null;
  const avg7Change =
    rolling7.length >= 2 ? changeBetween(rolling7[rolling7.length - 2].value, rolling7[rolling7.length - 1].value) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!weightKg || Number(weightKg) <= 0) return;
    setSaving(true);
    await addWeightEntry({ date, time, weightKg: Number(weightKg), note: note.trim() || undefined });
    setWeightKg("");
    setNote("");
    setSaving(false);
  }

  function handleExportCSV() {
    const rows = entries.map((e) => ({ date: e.date, time: e.time, weight_kg: e.weightKg, note: e.note ?? "" }));
    downloadText(toCSV(rows), `fitjourney-weight-${formatISODate(new Date())}.csv`, "text/csv");
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a weigh-in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="w-date">Date</Label>
                <Input id="w-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="w-time">Time</Label>
                <Input id="w-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="w-weight">Weight (kg)</Label>
              <Input
                id="w-weight"
                type="number"
                step="0.1"
                min={1}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="w-note">Note (optional)</Label>
              <Textarea id="w-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after breakfast" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save weigh-in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 pt-5">
            <div>
              <p className="text-xs text-text-muted">Today&rsquo;s change</p>
              <p className="text-lg font-semibold">
                {dailyChange === null ? "—" : `${dailyChange >= 0 ? "increased" : "decreased"} ${Math.abs(dailyChange).toFixed(1)} kg`}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">7-day average</p>
              <p className="text-lg font-semibold text-brand">
                {avg7Change === null ? "—" : `${avg7Change >= 0 ? "up" : "down"} ${Math.abs(avg7Change).toFixed(1)} kg`}
              </p>
            </div>
          </CardContent>
          <CardContent className="pt-0 text-xs text-text-muted">
            Focus on the 7-day trend rather than any single reading — day-to-day changes are mostly water weight.
          </CardContent>
        </Card>
      )}

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Starting vs current vs target</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { label: "Start", value: profile.startingWeightKg },
                  { label: "Current", value: last?.daily ?? profile.currentWeightKg },
                  { label: "Target", value: profile.targetWeightKg },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
                <Bar dataKey="value" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Trend (daily · 7-day avg · 30-day avg)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
                <Line type="monotone" dataKey="daily" stroke="var(--color-text-muted)" dot={false} strokeWidth={1} name="Daily" />
                <Line type="monotone" dataKey="avg7" stroke="var(--color-brand)" dot={false} strokeWidth={2} name="7-day avg" />
                <Line type="monotone" dataKey="avg30" stroke="var(--color-info)" dot={false} strokeWidth={2} name="30-day avg" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>History</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={entries.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-text-muted">No weigh-ins yet.</p>}
          {[...entries].reverse().map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  {entry.weightKg} kg <span className="font-normal text-text-muted">· {entry.date} {entry.time}</span>
                </p>
                {entry.note && <p className="text-xs text-text-muted">{entry.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => deleteWeightEntry(entry.id)}
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
