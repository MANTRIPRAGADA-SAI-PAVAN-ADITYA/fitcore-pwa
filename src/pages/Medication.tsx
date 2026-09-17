import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, subDays } from "date-fns";
import { Bell, Check, Circle, Plus, Trash2, TriangleAlert } from "lucide-react";
import { db } from "@/db/db";
import {
  addMedication,
  logMedicationEvent,
  deleteMedicationLog,
  expectedScheduleDates,
  statusForScheduledDate,
} from "@/services/medication";
import {
  upsertReminder,
  deleteReminder,
  getNotificationPermission,
  requestNotificationPermission,
} from "@/services/reminders";
import { formatISODate } from "@/utils/calculations";
import { MedicationDisclaimer } from "@/components/MedicationDisclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea, HelpText } from "@/components/ui/Input";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import type { MedicationFrequency, MedicationLogStatus } from "@/types/models";

const STATUS_META: Record<string, { icon: typeof Check; label: string; tone: "positive" | "neutral" | "urgent" | "attention" }> = {
  taken: { icon: Check, label: "Taken", tone: "positive" },
  upcoming: { icon: Circle, label: "Upcoming", tone: "neutral" },
  missed: { icon: TriangleAlert, label: "Missed", tone: "urgent" },
  not_scheduled: { icon: Circle, label: "Not scheduled", tone: "neutral" },
};

export function Medication() {
  const today = formatISODate(new Date());
  const medications = useLiveQuery(() => db.medications.toArray(), []) ?? [];
  const allLogs = useLiveQuery(() => db.medicationLogs.toArray(), []) ?? [];
  const reminders = useLiveQuery(() => db.reminderSettings.where({ type: "medication" }).toArray(), []) ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [logDialogDate, setLogDialogDate] = useState<string | null>(null);
  const [activeMedId, setActiveMedId] = useState<string | null>(medications[0]?.id ?? null);

  const activeMedication = medications.find((m) => m.id === activeMedId) ?? medications[0];

  const rangeStart = subDays(new Date(), 13);
  const rangeEnd = addDays(new Date(), 6);

  const scheduleDates = useMemo(() => {
    if (!activeMedication) return [];
    return expectedScheduleDates(activeMedication, rangeStart, rangeEnd);
  }, [activeMedication, rangeStart, rangeEnd]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, (typeof allLogs)[number]>();
    for (const log of allLogs) {
      if (log.medicationId === activeMedication?.id) map.set(log.date, log);
    }
    return map;
  }, [allLogs, activeMedication]);

  return (
    <div className="space-y-4 pb-4">
      <MedicationDisclaimer />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your medication</CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Add prescribed medication"
              description="Enter exactly what your doctor prescribed. FitJourney only records this — it never changes or recommends dosing."
            >
              <AddMedicationForm onDone={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {medications.length === 0 ? (
            <p className="text-sm text-text-muted">
              No medication set up yet. Add your prescribed semaglutide details to start tracking your schedule.
            </p>
          ) : (
            <div className="space-y-2">
              {medications.map((med) => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => setActiveMedId(med.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    activeMedication?.id === med.id ? "border-brand bg-brand-soft" : "border-border"
                  }`}
                >
                  <p className="font-semibold">{med.name}</p>
                  <p className="text-text-muted">
                    {med.prescribedDose} · {med.frequency} at {med.prescribedTime}
                  </p>
                  {med.prescribingDoctor && <p className="text-xs text-text-muted">Dr. {med.prescribingDoctor}</p>}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeMedication && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {scheduleDates.map((d) => {
                  const status = statusForScheduledDate(d, today, logsByDate);
                  const meta = STATUS_META[status];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setLogDialogDate(d)}
                      className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl border border-border p-2 hover:bg-surface-muted"
                    >
                      <span className="text-[10px] text-text-muted">{d.slice(5)}</span>
                      <Badge tone={meta.tone}>
                        <Icon className="h-3.5 w-3.5" />
                      </Badge>
                      <span className="text-[10px] text-text-muted">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Dialog open={logDialogDate !== null} onOpenChange={(open) => !open && setLogDialogDate(null)}>
            <DialogContent title={`Log dose — ${logDialogDate ?? ""}`}>
              {logDialogDate && (
                <LogDoseForm
                  medicationId={activeMedication.id}
                  prescribedDose={activeMedication.prescribedDose}
                  date={logDialogDate}
                  onDone={() => setLogDialogDate(null)}
                />
              )}
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle>Recent log entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allLogs.filter((l) => l.medicationId === activeMedication.id).length === 0 && (
                <p className="text-sm text-text-muted">No doses logged yet.</p>
              )}
              {[...allLogs]
                .filter((l) => l.medicationId === activeMedication.id)
                .reverse()
                .map((log) => (
                  <div key={log.id} className="rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {log.date} {log.time} —{" "}
                        <span className="capitalize">{log.status}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => deleteMedicationLog(log.id)}
                        className="focus-ring rounded-lg p-2 text-text-muted hover:bg-urgent-soft hover:text-urgent"
                        aria-label="Delete log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {log.actualDose && <p className="text-xs text-text-muted">Dose taken: {log.actualDose}</p>}
                    {log.injectionSite && <p className="text-xs text-text-muted">Site: {log.injectionSite}</p>}
                    {log.notes && <p className="text-xs text-text-muted">{log.notes}</p>}
                    {log.status === "missed" && (
                      <p className="mt-1 text-xs font-medium text-attention">
                        Follow the missed-dose instructions provided by your prescribing doctor or medication leaflet.
                      </p>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>

          <ReminderCard medicationId={activeMedication.id} reminders={reminders} />
        </>
      )}
    </div>
  );
}

function AddMedicationForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("Semaglutide");
  const [prescribedDose, setPrescribedDose] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequency>("weekly");
  const [prescribedTime, setPrescribedTime] = useState("09:00");
  const [startDate, setStartDate] = useState(formatISODate(new Date()));
  const [prescribingDoctor, setPrescribingDoctor] = useState("");
  const [clinicContact, setClinicContact] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prescribedDose.trim()) return;
    await addMedication({
      name: name.trim() || "Semaglutide",
      prescribedDose: prescribedDose.trim(),
      frequency,
      prescribedTime,
      startDate,
      prescribingDoctor: prescribingDoctor.trim() || undefined,
      clinicContact: clinicContact.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <HelpText>Enter exactly what is written on your prescription — FitJourney stores this as-is.</HelpText>
      <div>
        <Label htmlFor="m-name">Medication name</Label>
        <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="m-dose">Prescribed dose</Label>
        <Input id="m-dose" placeholder="e.g. 0.25 mg" value={prescribedDose} onChange={(e) => setPrescribedDose(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="m-frequency">Frequency</Label>
          <Select id="m-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as MedicationFrequency)}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom / as prescribed</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="m-time">Prescribed time</Label>
          <Input id="m-time" type="time" value={prescribedTime} onChange={(e) => setPrescribedTime(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="m-start">Start date</Label>
        <Input id="m-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="m-doctor">Prescribing doctor (optional)</Label>
        <Input id="m-doctor" value={prescribingDoctor} onChange={(e) => setPrescribingDoctor(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="m-clinic">Clinic / contact (optional)</Label>
        <Input id="m-clinic" value={clinicContact} onChange={(e) => setClinicContact(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="m-notes">Notes (optional)</Label>
        <Textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">
        Save medication
      </Button>
    </form>
  );
}

function LogDoseForm({
  medicationId,
  prescribedDose,
  date,
  onDone,
}: {
  medicationId: string;
  prescribedDose: string;
  date: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<MedicationLogStatus>("taken");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [actualDose, setActualDose] = useState(prescribedDose);
  const [injectionSite, setInjectionSite] = useState("");
  const [notes, setNotes] = useState("");

  async function save(finalStatus: MedicationLogStatus) {
    await logMedicationEvent({
      medicationId,
      date,
      time,
      status: finalStatus,
      prescribedDose,
      actualDose: finalStatus === "taken" ? actualDose.trim() || prescribedDose : undefined,
      injectionSite: finalStatus === "taken" ? injectionSite.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
    });
    onDone();
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="log-time">Time</Label>
        <Input id="log-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      {status === "taken" && (
        <>
          <div>
            <Label htmlFor="log-dose">Actual dose taken</Label>
            <Input id="log-dose" value={actualDose} onChange={(e) => setActualDose(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="log-site">Injection site</Label>
            <Input id="log-site" placeholder="e.g. Left thigh" value={injectionSite} onChange={(e) => setInjectionSite(e.target.value)} />
          </div>
        </>
      )}
      <div>
        <Label htmlFor="log-notes">Notes</Label>
        <Textarea id="log-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {status !== "taken" && (
        <p className="text-xs font-medium text-attention">
          Follow the missed-dose instructions provided by your prescribing doctor or medication leaflet.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="primary" onClick={() => { setStatus("taken"); void save("taken"); }}>
          Log taken
        </Button>
        <Button type="button" variant="outline" onClick={() => { setStatus("skipped"); void save("skipped"); }}>
          Skipped
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setStatus("missed"); void save("missed"); }}>
          Missed
        </Button>
      </div>
    </div>
  );
}

function ReminderCard({
  medicationId,
  reminders,
}: {
  medicationId: string;
  reminders: import("@/types/models").ReminderSetting[];
}) {
  const existing = reminders.find((r) => r.medicationId === medicationId);
  const [time, setTime] = useState(existing?.time ?? "09:00");
  const [permission, setPermission] = useState(getNotificationPermission());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {permission !== "granted" && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <p className="text-sm text-text-muted">Enable notifications to receive reminders.</p>
            <Button
              size="sm"
              onClick={async () => {
                const result = await requestNotificationPermission();
                setPermission(result);
              }}
            >
              <Bell className="h-4 w-4" /> Enable
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Semaglutide reminder</p>
            <p className="text-xs text-text-muted">&ldquo;Semaglutide reminder — follow your prescribed schedule.&rdquo;</p>
          </div>
          <Switch
            checked={existing?.enabled ?? false}
            aria-label="Enable medication reminder"
            onCheckedChange={(checked) =>
              upsertReminder({
                id: existing?.id,
                type: "medication",
                enabled: checked,
                time,
                daysOfWeek: [],
                label: "Semaglutide reminder — follow your prescribed schedule.",
                medicationId,
                sound: true,
                vibrate: true,
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="rem-time" className="mb-0">
            Time
          </Label>
          <Input
            id="rem-time"
            type="time"
            className="w-32"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              if (existing) {
                upsertReminder({
                  id: existing.id,
                  type: existing.type,
                  enabled: existing.enabled,
                  time: e.target.value,
                  daysOfWeek: existing.daysOfWeek,
                  label: existing.label,
                  medicationId: existing.medicationId,
                  sound: existing.sound,
                  vibrate: existing.vibrate,
                });
              }
            }}
          />
          {existing && (
            <button
              type="button"
              onClick={() => deleteReminder(existing.id)}
              className="focus-ring ml-auto rounded-lg p-2 text-text-muted hover:bg-urgent-soft hover:text-urgent"
              aria-label="Remove reminder"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
