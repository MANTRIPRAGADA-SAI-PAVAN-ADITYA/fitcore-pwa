import { db } from "@/db/db";
import { newId } from "@/utils/id";
import type { ReminderSetting, ReminderType } from "@/types/models";

export type ReminderInput = Omit<ReminderSetting, "id" | "createdAt" | "updatedAt">;

export async function upsertReminder(input: ReminderInput & { id?: string }): Promise<void> {
  const now = new Date().toISOString();
  if (input.id) {
    await db.reminderSettings.update(input.id, { ...input, updatedAt: now });
  } else {
    await db.reminderSettings.add({ id: newId(), ...input, createdAt: now, updatedAt: now });
  }
}

export async function deleteReminder(id: string): Promise<void> {
  await db.reminderSettings.delete(id);
}

export async function listReminders(): Promise<ReminderSetting[]> {
  return db.reminderSettings.toArray();
}

export async function remindersByType(type: ReminderType): Promise<ReminderSetting[]> {
  return db.reminderSettings.where({ type }).toArray();
}

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const result = await Notification.requestPermission();
  return result;
}

function firedKey(reminderId: string, date: string): string {
  return `fitjourney:reminder-fired:${reminderId}:${date}`;
}

function alreadyFiredToday(reminderId: string, date: string): boolean {
  try {
    return localStorage.getItem(firedKey(reminderId, date)) === "1";
  } catch {
    return false;
  }
}

function markFiredToday(reminderId: string, date: string): void {
  try {
    localStorage.setItem(firedKey(reminderId, date), "1");
  } catch {
    // localStorage unavailable — reminder may re-fire once more this session, which is harmless.
  }
}

function showNotification(title: string, body: string, requireInteraction: boolean): void {
  if (getNotificationPermission() !== "granted") return;
  try {
    new Notification(title, { body, requireInteraction, icon: "/icons/icon-192.svg" });
  } catch {
    // Some browsers (notably iOS Safari outside an installed PWA) throw here — fail silently.
  }
}

/**
 * Foreground reminder scheduler. Because FitJourney ships with no backend
 * and this is a from-scratch MVP, reminders only fire while the app (or its
 * installed PWA) is open in a tab — there is no push server to wake the
 * browser when the app is fully closed. Call this once from the app root;
 * it polls every 30s, which is frequent enough for a same-minute match
 * without being wasteful.
 */
export function startReminderScheduler(): () => void {
  const interval = window.setInterval(async () => {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const today = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getDay();

    const reminders = await db.reminderSettings.toArray().catch(() => []);
    const enabled = reminders.filter((r) => r.enabled);

    for (const reminder of enabled) {
      if (reminder.time !== hhmm) continue;
      if (reminder.daysOfWeek.length > 0 && !reminder.daysOfWeek.includes(dayOfWeek)) continue;
      if (alreadyFiredToday(reminder.id, today)) continue;

      showNotification("FitJourney", reminder.label, reminder.type === "medication");
      markFiredToday(reminder.id, today);
    }
  }, 30_000);

  return () => window.clearInterval(interval);
}
