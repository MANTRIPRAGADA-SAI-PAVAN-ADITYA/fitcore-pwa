import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/db/db";
import { addMeasurement, deleteMeasurement, MEASUREMENT_LABELS } from "@/services/measurements";
import { formatISODate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import type { MeasurementType } from "@/types/models";

export function Measurements() {
  const entries = useLiveQuery(() => db.measurements.orderBy("date").toArray(), []) ?? [];

  const [date, setDate] = useState(formatISODate(new Date()));
  const [type, setType] = useState<MeasurementType>("waist");
  const [customLabel, setCustomLabel] = useState("");
  const [valueCm, setValueCm] = useState("");
  const [note, setNote] = useState("");
  const [selectedChartType, setSelectedChartType] = useState<MeasurementType>("waist");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valueCm) return;
    await addMeasurement({
      date,
      type,
      customLabel: type === "custom" ? customLabel.trim() || undefined : undefined,
      valueCm: Number(valueCm),
      note: note.trim() || undefined,
    });
    setValueCm("");
    setNote("");
  }

  const chartData = useMemo(
    () => entries.filter((e) => e.type === selectedChartType).map((e) => ({ date: e.date, value: e.valueCm })),
    [entries, selectedChartType],
  );

  const typesWithData = useMemo(() => Array.from(new Set(entries.map((e) => e.type))), [entries]);

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a measurement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="me-date">Date</Label>
                <Input id="me-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="me-type">Location</Label>
                <Select id="me-type" value={type} onChange={(e) => setType(e.target.value as MeasurementType)}>
                  {Object.entries(MEASUREMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {type === "custom" && (
              <div>
                <Label htmlFor="me-custom">Custom label</Label>
                <Input id="me-custom" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="me-value">{type === "body_fat_pct" ? "Value (%)" : "Value (cm)"}</Label>
              <Input id="me-value" type="number" step="0.1" min={0} value={valueCm} onChange={(e) => setValueCm(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="me-note">Note (optional)</Label>
              <Input id="me-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">
              Save measurement
            </Button>
          </form>
        </CardContent>
      </Card>

      {typesWithData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Trend</CardTitle>
            <Select
              className="w-40"
              value={selectedChartType}
              onChange={(e) => setSelectedChartType(e.target.value as MeasurementType)}
            >
              {typesWithData.map((t) => (
                <option key={t} value={t}>
                  {MEASUREMENT_LABELS[t]}
                </option>
              ))}
            </Select>
          </CardHeader>
          <CardContent style={{ height: 200 }}>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-brand)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-text-muted">Log at least two entries for this measurement to see a trend.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-text-muted">No measurements logged yet.</p>}
          {[...entries].reverse().map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <p className="text-sm font-medium">
                {entry.customLabel || MEASUREMENT_LABELS[entry.type]}: {entry.valueCm}
                {entry.type === "body_fat_pct" ? "%" : " cm"} <span className="font-normal text-text-muted">· {entry.date}</span>
              </p>
              <button
                type="button"
                onClick={() => deleteMeasurement(entry.id)}
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
