import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Check } from "lucide-react";
import { saveCheckin, getCheckinForDate } from "@/services/checkin";
import { setHabitCompletion } from "@/services/habits";
import { db } from "@/db/db";
import { formatISODate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

function ScaleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={cn(
              "focus-ring flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold",
              value === n ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-text-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function YesNoField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn("focus-ring rounded-lg px-3 py-1.5 text-sm font-medium", value ? "bg-positive text-white" : "bg-surface-muted text-text-muted")}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn("focus-ring rounded-lg px-3 py-1.5 text-sm font-medium", !value ? "bg-surface-muted text-text" : "bg-surface-muted text-text-muted")}
        >
          No
        </button>
      </div>
    </div>
  );
}

export function CheckIn() {
  const navigate = useNavigate();
  const today = formatISODate(new Date());
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const existing = useLiveQuery(() => getCheckinForDate(today), [today]);

  const [weightKg, setWeightKg] = useState("");
  const [appetite, setAppetite] = useState<number>();
  const [energy, setEnergy] = useState<number>();
  const [mood, setMood] = useState<number>();
  const [sleepHours, setSleepHours] = useState("");
  const [waterLiters, setWaterLiters] = useState("");
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [nutritionLogged, setNutritionLogged] = useState(false);
  const [medicationLogged, setMedicationLogged] = useState(false);
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [symptomNote, setSymptomNote] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await saveCheckin({
      date: today,
      weightKg: weightKg ? Number(weightKg) : undefined,
      appetite: appetite as 1 | 2 | 3 | 4 | 5 | undefined,
      energy: energy as 1 | 2 | 3 | 4 | 5 | undefined,
      mood: mood as 1 | 2 | 3 | 4 | 5 | undefined,
      sleepHours: sleepHours ? Number(sleepHours) : undefined,
      waterLiters: waterLiters ? Number(waterLiters) : undefined,
      exerciseCompleted,
      nutritionLogged,
      medicationLogged,
      hasSymptoms,
      symptomNote: hasSymptoms ? symptomNote.trim() || undefined : undefined,
    });

    const habitFlags: Record<string, boolean> = {
      daily_checkin: true,
      log_weight: Boolean(weightKg),
      exercise: exerciseCompleted,
      log_nutrition: nutritionLogged,
      medication_logged: medicationLogged,
    };
    await Promise.all(
      habits
        .filter((h) => h.key in habitFlags)
        .map((h) => setHabitCompletion(h.id, today, habitFlags[h.key])),
    );

    setSaved(true);
    setTimeout(() => navigate("/"), 900);
  }

  if (existing && !saved) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 pt-8 text-center">
          <Check className="h-8 w-8 text-positive" />
          <p className="font-semibold">You already checked in today.</p>
          <p className="text-sm text-text-muted">Come back tomorrow for your next check-in.</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Daily check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ci-weight">Weight (kg, optional)</Label>
            <Input id="ci-weight" type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <ScaleField label="Appetite" value={appetite} onChange={setAppetite} />
          <ScaleField label="Energy" value={energy} onChange={setEnergy} />
          <ScaleField label="Mood" value={mood} onChange={setMood} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ci-sleep">Sleep (hours)</Label>
              <Input id="ci-sleep" type="number" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ci-water">Water (liters)</Label>
              <Input id="ci-water" type="number" step="0.1" value={waterLiters} onChange={(e) => setWaterLiters(e.target.value)} />
            </div>
          </div>
          <YesNoField label="Exercise completed?" value={exerciseCompleted} onChange={setExerciseCompleted} />
          <YesNoField label="Nutrition logged?" value={nutritionLogged} onChange={setNutritionLogged} />
          <YesNoField label="Medication logged?" value={medicationLogged} onChange={setMedicationLogged} />
          <YesNoField label="Any symptoms?" value={hasSymptoms} onChange={setHasSymptoms} />
          {hasSymptoms && (
            <div>
              <Label htmlFor="ci-symptom-note">What did you notice?</Label>
              <Input id="ci-symptom-note" value={symptomNote} onChange={(e) => setSymptomNote(e.target.value)} />
              <p className="mt-1 text-xs text-text-muted">
                For detailed tracking, log this on the Symptoms page.
              </p>
            </div>
          )}
          <Button className="w-full" size="lg" onClick={handleSave} disabled={saved}>
            {saved ? "Saved!" : "Finish check-in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
