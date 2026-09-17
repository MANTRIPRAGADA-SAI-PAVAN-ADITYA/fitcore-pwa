import { useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Flame, Plus, Trash2 } from "lucide-react";
import { db } from "@/db/db";
import { addCustomHabit, archiveHabit, setHabitCompletion } from "@/services/habits";
import { currentStreak, formatISODate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export function Habits() {
  const today = formatISODate(new Date());
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const [newHabit, setNewHabit] = useState("");

  const active = habits.filter((h) => !h.archived);

  function isCompletedToday(habitId: string): boolean {
    return habitLogs.some((l) => l.habitId === habitId && l.date === today && l.completed);
  }

  function streakFor(habitId: string): number {
    const completedDates = habitLogs.filter((l) => l.habitId === habitId && l.completed).map((l) => l.date);
    return currentStreak(completedDates, today);
  }

  async function handleAddHabit(e: FormEvent) {
    e.preventDefault();
    if (!newHabit.trim()) return;
    await addCustomHabit(newHabit.trim());
    setNewHabit("");
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Today&rsquo;s habits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.map((habit) => {
            const done = isCompletedToday(habit.id);
            const streak = streakFor(habit.id);
            return (
              <div key={habit.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setHabitCompletion(habit.id, today, !done)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md border-2",
                      done ? "border-brand bg-brand text-brand-fg" : "border-border",
                    )}
                    aria-hidden="true"
                  >
                    {done && "✓"}
                  </span>
                  <span className="text-sm font-medium">{habit.label}</span>
                </button>
                <div className="flex items-center gap-2">
                  {streak > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-attention">
                      <Flame className="h-3.5 w-3.5" /> {streak}d
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">Start again today</span>
                  )}
                  {habit.isCustom && (
                    <button
                      type="button"
                      onClick={() => archiveHabit(habit.id)}
                      className="focus-ring rounded-lg p-1.5 text-text-muted hover:bg-urgent-soft hover:text-urgent"
                      aria-label="Remove habit"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a custom habit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddHabit} className="flex gap-2">
            <Input placeholder="e.g. Meal prep on Sundays" value={newHabit} onChange={(e) => setNewHabit(e.target.value)} />
            <Button type="submit">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-text-muted">
        Streaks are here to encourage consistency, not to punish an off day. Missing a day just means starting again —
        that&rsquo;s normal.
      </p>
    </div>
  );
}
