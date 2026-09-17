import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { db } from "@/db/db";
import { exportBackup, importBackup, deleteAllData, validateBackup } from "@/services/backup";
import { listWeightEntries } from "@/services/weight";
import { upsertReminder, getNotificationPermission, requestNotificationPermission } from "@/services/reminders";
import { toCSV } from "@/utils/csv";
import { downloadText } from "@/utils/download";
import { formatISODate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import type { ReminderSetting, ReminderType } from "@/types/models";

const SIMPLE_REMINDERS: { type: ReminderType; label: string; defaultTime: string }[] = [
  { type: "daily_checkin", label: "Daily check-in reminder", defaultTime: "20:00" },
  { type: "weight", label: "Weight reminder", defaultTime: "07:30" },
  { type: "water", label: "Water reminders", defaultTime: "12:00" },
  { type: "exercise", label: "Exercise reminder", defaultTime: "18:00" },
];

export function SettingsPage() {
  const reminders = useLiveQuery(() => db.reminderSettings.toArray(), []) ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission());

  async function handleExportJSON() {
    const backup = await exportBackup();
    downloadText(JSON.stringify(backup, null, 2), `fitjourney-backup-${formatISODate(new Date())}.json`, "application/json");
  }

  async function handleExportWeightCSV() {
    const entries = await listWeightEntries();
    const rows = entries.map((e) => ({ date: e.date, time: e.time, weight_kg: e.weightKg, note: e.note ?? "" }));
    downloadText(toCSV(rows), `fitjourney-weight-${formatISODate(new Date())}.csv`, "text/csv");
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(false);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!validateBackup(json)) {
        setImportError("This file doesn't look like a valid FitJourney backup.");
        return;
      }
      const confirmed = window.confirm(
        "Importing will replace ALL data currently on this device with the contents of this backup. This cannot be undone. Continue?",
      );
      if (!confirmed) return;
      await importBackup(json);
      setImportSuccess(true);
    } catch {
      setImportError("Could not read this file. Make sure it's an unmodified FitJourney backup JSON file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAll() {
    await deleteAllData();
    window.location.href = "/onboarding";
  }

  function reminderFor(type: ReminderType): ReminderSetting | undefined {
    return reminders.find((r) => r.type === type);
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {permission !== "granted" && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm text-text-muted">Browser notifications are not enabled.</p>
              <Button
                size="sm"
                onClick={async () => setPermission(await requestNotificationPermission())}
              >
                Enable
              </Button>
            </div>
          )}
          {SIMPLE_REMINDERS.map(({ type, label, defaultTime }) => {
            const existing = reminderFor(type);
            return (
              <div key={type} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  {existing?.enabled && (
                    <Input
                      type="time"
                      className="mt-1 h-8 w-28 text-xs"
                      value={existing.time}
                      onChange={(e) =>
                        upsertReminder({
                          id: existing.id,
                          type,
                          enabled: true,
                          time: e.target.value,
                          daysOfWeek: [],
                          label,
                          sound: true,
                          vibrate: true,
                        })
                      }
                    />
                  )}
                </div>
                <Switch
                  checked={existing?.enabled ?? false}
                  aria-label={`Toggle ${label}`}
                  onCheckedChange={(checked) =>
                    upsertReminder({
                      id: existing?.id,
                      type,
                      enabled: checked,
                      time: existing?.time ?? defaultTime,
                      daysOfWeek: [],
                      label,
                      sound: true,
                      vibrate: true,
                    })
                  }
                />
              </div>
            );
          })}
          <p className="text-xs text-text-muted">
            Medication reminders are configured on the Medication page. Reminders fire while FitJourney is open in a
            browser tab or installed app — there is no background server to deliver them when the app is fully
            closed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-muted">
            FitJourney stores everything only on this device. Nothing is uploaded automatically. You can export a full
            backup, restore from one, or erase everything.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportJSON}>
              <Download className="h-4 w-4" /> Export all data (JSON)
            </Button>
            <Button variant="outline" onClick={handleExportWeightCSV}>
              <Download className="h-4 w-4" /> Export weight (CSV)
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import backup
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          </div>
          {importError && <p className="text-sm font-medium text-urgent">{importError}</p>}
          {importSuccess && <p className="text-sm font-medium text-positive">Backup imported successfully.</p>}
        </CardContent>
      </Card>

      <Card className="border-urgent">
        <CardHeader>
          <CardTitle className="text-urgent">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!confirmingDelete ? (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              <AlertTriangle className="h-4 w-4" /> Delete all data
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-urgent p-3">
              <p className="text-sm font-medium">
                This permanently deletes every entry, photo, and setting on this device. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteAll}>
                  Yes, delete everything
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
