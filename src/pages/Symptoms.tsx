import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { db } from "@/db/db";
import { addSymptomEntry, deleteSymptomEntry, SYMPTOM_LABELS, SEVERITY_LABELS } from "@/services/symptoms";
import { formatISODate, daysBetween } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { SymptomSeverity, SymptomType } from "@/types/models";

const SEVERITY_TONE: Record<SymptomSeverity, "neutral" | "attention" | "urgent"> = {
  0: "neutral",
  1: "neutral",
  2: "attention",
  3: "urgent",
};

export function Symptoms() {
  const today = formatISODate(new Date());
  const entries = useLiveQuery(() => db.symptomEntries.orderBy("date").reverse().toArray(), []) ?? [];
  const medicationLogs = useLiveQuery(() => db.medicationLogs.orderBy("date").reverse().toArray(), []) ?? [];

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [type, setType] = useState<SymptomType>("nausea");
  const [customLabel, setCustomLabel] = useState("");
  const [severity, setSeverity] = useState<SymptomSeverity>(1);
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");
  const [medicationLogId, setMedicationLogId] = useState("");

  const closestMedicationLogByDate = useMemo(() => {
    const takenLogs = medicationLogs.filter((l) => l.status === "taken");
    const map = new Map<string, (typeof medicationLogs)[number]>();
    for (const entry of entries) {
      const closest = takenLogs.find((l) => {
        const diff = daysBetween(l.date, entry.date);
        return diff >= 0 && diff <= 3;
      });
      if (closest) map.set(entry.id, closest);
    }
    return map;
  }, [entries, medicationLogs]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await addSymptomEntry({
      date,
      time,
      type,
      customLabel: type === "other" ? customLabel.trim() || undefined : undefined,
      severity,
      durationMin: durationMin ? Number(durationMin) : undefined,
      notes: notes.trim() || undefined,
      medicationLogId: medicationLogId || undefined,
    });
    setNotes("");
    setDurationMin("");
    setMedicationLogId("");
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Log a symptom</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-date">Date</Label>
                <Input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-time">Start time</Label>
                <Input id="s-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="s-type">Symptom</Label>
              <Select id="s-type" value={type} onChange={(e) => setType(e.target.value as SymptomType)}>
                {Object.entries(SYMPTOM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            {type === "other" && (
              <div>
                <Label htmlFor="s-custom">Describe symptom</Label>
                <Input id="s-custom" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="s-severity">Severity</Label>
              <Select id="s-severity" value={severity} onChange={(e) => setSeverity(Number(e.target.value) as SymptomSeverity)}>
                <option value={0}>0 — None</option>
                <option value={1}>1 — Mild</option>
                <option value={2}>2 — Moderate</option>
                <option value={3}>3 — Severe</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="s-duration">Duration (minutes, optional)</Label>
              <Input id="s-duration" type="number" min={0} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-med">Relationship to medication date (optional)</Label>
              <Select id="s-med" value={medicationLogId} onChange={(e) => setMedicationLogId(e.target.value)}>
                <option value="">Not linked</option>
                {medicationLogs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.date} dose
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="s-notes">Notes</Label>
              <Textarea id="s-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {severity === 3 && (
              <p className="text-xs font-medium text-urgent">
                For severe or rapidly worsening symptoms, see the Safety &amp; medical help page for guidance on seeking care.
              </p>
            )}
            <Button type="submit" className="w-full">
              Save symptom entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-text-muted">No symptoms logged yet.</p>}
          {entries.map((entry) => {
            const linked = closestMedicationLogByDate.get(entry.id);
            return (
              <div key={entry.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {entry.customLabel || SYMPTOM_LABELS[entry.type]}{" "}
                    <Badge tone={SEVERITY_TONE[entry.severity]} className="ml-1">
                      {SEVERITY_LABELS[entry.severity]}
                    </Badge>
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteSymptomEntry(entry.id)}
                    className="focus-ring rounded-lg p-2 text-text-muted hover:bg-urgent-soft hover:text-urgent"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-text-muted">
                  {entry.date} {entry.time}
                  {entry.durationMin ? ` · ${entry.durationMin} min` : ""}
                </p>
                {entry.notes && <p className="mt-1 text-xs text-text-muted">{entry.notes}</p>}
                {linked && (
                  <p className="mt-1 text-xs text-info">Symptom recorded after medication entry ({linked.date})</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
