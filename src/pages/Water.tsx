import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { logWater, deleteWaterEntry, listWaterEntriesForDate, totalWaterMl } from "@/services/water";
import { getSettings, updateNutritionTargets } from "@/services/settings";
import { formatISODate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function WaterBottle({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-40 w-20 overflow-hidden rounded-b-2xl rounded-t-lg border-4 border-info bg-surface-muted">
      <div
        className="absolute bottom-0 left-0 right-0 bg-info/70 transition-[height] duration-700"
        style={{ height: `${clamped}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text">
        {Math.round(clamped)}%
      </div>
    </div>
  );
}

export function Water() {
  const today = formatISODate(new Date());
  const settings = useLiveQuery(() => getSettings(), []);
  const entries = useLiveQuery(() => listWaterEntriesForDate(today), [today]) ?? [];
  const [customAmount, setCustomAmount] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  if (!settings) return null;

  const total = totalWaterMl(entries);
  const target = settings.nutritionTargets.waterMl;
  const percent = (total / Math.max(1, target)) * 100;

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <WaterBottle percent={percent} />
          <p className="text-2xl font-bold text-text">
            {(total / 1000).toFixed(2)} L <span className="text-base font-normal text-text-muted">/ {(target / 1000).toFixed(1)} L</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => logWater(today, 250)}>+250 ml</Button>
            <Button onClick={() => logWater(today, 500)}>+500 ml</Button>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Custom ml"
                className="w-28"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const amount = Number(customAmount);
                  if (amount > 0) {
                    logWater(today, amount);
                    setCustomAmount("");
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>

          {editingGoal ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-text-muted">ml goal</span>
              <Button
                size="sm"
                onClick={async () => {
                  if (Number(goalInput) > 0) await updateNutritionTargets({ waterMl: Number(goalInput) });
                  setEditingGoal(false);
                }}
              >
                Save
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="text-xs font-medium text-brand hover:underline"
              onClick={() => {
                setGoalInput(String(target));
                setEditingGoal(true);
              }}
            >
              Change daily goal
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&rsquo;s log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-text-muted">No water logged yet today.</p>}
          {[...entries].reverse().map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <p className="text-sm font-medium">
                {e.amountMl} ml <span className="font-normal text-text-muted">· {e.time}</span>
              </p>
              <button
                type="button"
                onClick={() => deleteWaterEntry(e.id)}
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
