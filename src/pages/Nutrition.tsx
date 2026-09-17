import { useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Plus } from "lucide-react";
import { db } from "@/db/db";
import { PROFILE_ID } from "@/services/profile";
import { getSettings, updateNutritionTargets, dismissLowCaloriePrompt } from "@/services/settings";
import {
  addFood,
  addMeal,
  logFoodEntry,
  logMealEntry,
  deleteMeal,
  quickLogNutrition,
  deleteNutritionEntry,
  listNutritionEntriesForDate,
} from "@/services/nutrition";
import { sumNutrition, formatISODate, isCalorieTargetVeryLow } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, HelpText } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/Progress";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/Dialog";
import type { Food, MealFoodItem, MealType } from "@/types/models";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function MacroRow({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="font-medium text-text">
          {Math.round(value)}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <ProgressBar value={(value / Math.max(1, target)) * 100} label={`${label} progress`} />
    </div>
  );
}

export function Nutrition() {
  const today = formatISODate(new Date());
  const profile = useLiveQuery(() => db.users.get(PROFILE_ID), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const foods = useLiveQuery(() => db.foods.orderBy("name").toArray(), []) ?? [];
  const meals = useLiveQuery(() => db.meals.orderBy("name").toArray(), []) ?? [];
  const entries = useLiveQuery(() => listNutritionEntriesForDate(today), [today]) ?? [];

  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [servings, setServings] = useState("1");
  const [selectedMealId, setSelectedMealId] = useState("");
  const [quickDesc, setQuickDesc] = useState("");
  const [quickCals, setQuickCals] = useState("");
  const [quickProtein, setQuickProtein] = useState("");
  const [quickCarbs, setQuickCarbs] = useState("");
  const [quickFat, setQuickFat] = useState("");
  const [quickFiber, setQuickFiber] = useState("");
  const [mode, setMode] = useState<"food" | "meal" | "quick">("food");

  const [newFoodOpen, setNewFoodOpen] = useState(false);
  const [newMealOpen, setNewMealOpen] = useState(false);

  if (!settings || !profile) return null;

  const totals = sumNutrition(entries);
  const time = new Date().toTimeString().slice(0, 5);

  async function handleLog(e: FormEvent) {
    e.preventDefault();
    if (mode === "food") {
      if (!selectedFoodId) return;
      await logFoodEntry({ date: today, time, mealType, foodId: selectedFoodId, servings: Number(servings) || 1 });
      setSelectedFoodId("");
      setServings("1");
    } else if (mode === "meal") {
      if (!selectedMealId) return;
      await logMealEntry({ date: today, time, mealType, mealId: selectedMealId });
      setSelectedMealId("");
    } else {
      if (!quickDesc.trim()) return;
      await quickLogNutrition({
        date: today,
        time,
        mealType,
        description: quickDesc.trim(),
        calories: Number(quickCals) || 0,
        proteinG: Number(quickProtein) || 0,
        carbsG: Number(quickCarbs) || 0,
        fatG: Number(quickFat) || 0,
        fiberG: Number(quickFiber) || 0,
      });
      setQuickDesc("");
      setQuickCals("");
      setQuickProtein("");
      setQuickCarbs("");
      setQuickFat("");
      setQuickFiber("");
    }
  }

  const showLowCaloriePrompt =
    !settings.lowCaloriePromptDismissed && isCalorieTargetVeryLow(settings.nutritionTargets.calories, profile.sex);

  return (
    <div className="space-y-4 pb-4">
      {showLowCaloriePrompt && (
        <Card className="border-attention bg-attention-soft">
          <CardContent className="pt-4 text-sm text-text">
            <p>
              Your configured calorie target is quite low. Consider discussing your nutrition plan with your doctor
              or registered dietitian.
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => dismissLowCaloriePrompt()}>
              Got it
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Today&rsquo;s nutrition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MacroRow label="Calories" value={totals.calories} target={settings.nutritionTargets.calories} unit="" />
          <MacroRow label="Protein" value={totals.proteinG} target={settings.nutritionTargets.proteinG} unit="g" />
          <MacroRow label="Carbs" value={totals.carbsG} target={settings.nutritionTargets.carbsG} unit="g" />
          <MacroRow label="Fat" value={totals.fatG} target={settings.nutritionTargets.fatG} unit="g" />
          <MacroRow label="Fiber" value={totals.fiberG} target={settings.nutritionTargets.fiberG} unit="g" />
          <TargetsEditor targets={settings.nutritionTargets} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Log food</CardTitle>
          <div className="flex gap-2">
            <Dialog open={newFoodOpen} onOpenChange={setNewFoodOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" /> New food
                </Button>
              </DialogTrigger>
              <DialogContent title="Create a reusable food">
                <NewFoodForm onDone={() => setNewFoodOpen(false)} />
              </DialogContent>
            </Dialog>
            <Dialog open={newMealOpen} onOpenChange={setNewMealOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={foods.length === 0}>
                  <Plus className="h-4 w-4" /> New meal
                </Button>
              </DialogTrigger>
              <DialogContent title="Create a reusable meal" description="Combine foods from your library into a meal you can log in one tap.">
                <NewMealForm foods={foods} onDone={() => setNewMealOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={mode === "food" ? "primary" : "outline"} onClick={() => setMode("food")}>
              From food library
            </Button>
            <Button type="button" size="sm" variant={mode === "meal" ? "primary" : "outline"} onClick={() => setMode("meal")}>
              Saved meals
            </Button>
            <Button type="button" size="sm" variant={mode === "quick" ? "primary" : "outline"} onClick={() => setMode("quick")}>
              Quick add
            </Button>
          </div>
          <form onSubmit={handleLog} className="space-y-3">
            <div>
              <Label htmlFor="meal-type">Meal</Label>
              <Select id="meal-type" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                {MEAL_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>

            {mode === "food" ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="food-select">Food</Label>
                  <Select id="food-select" value={selectedFoodId} onChange={(e) => setSelectedFoodId(e.target.value)}>
                    <option value="">Select a food…</option>
                    {foods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.servingSize})
                      </option>
                    ))}
                  </Select>
                  {foods.length === 0 && <HelpText>Create a food first using &ldquo;New food&rdquo; above.</HelpText>}
                </div>
                <div>
                  <Label htmlFor="servings">Servings</Label>
                  <Input id="servings" type="number" step="0.5" min={0.5} value={servings} onChange={(e) => setServings(e.target.value)} />
                </div>
              </div>
            ) : mode === "meal" ? (
              <div>
                <Label htmlFor="meal-select">Saved meal</Label>
                <Select id="meal-select" value={selectedMealId} onChange={(e) => setSelectedMealId(e.target.value)}>
                  <option value="">Select a saved meal…</option>
                  {meals.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.items.length} item{m.items.length === 1 ? "" : "s"})
                    </option>
                  ))}
                </Select>
                {meals.length === 0 && (
                  <HelpText>Create a meal first using &ldquo;New meal&rdquo; above (needs at least one food).</HelpText>
                )}
                {selectedMealId && (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteMeal(selectedMealId);
                      setSelectedMealId("");
                    }}
                    className="mt-1.5 text-xs font-medium text-urgent hover:underline"
                  >
                    Delete this saved meal
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="q-desc">Description</Label>
                  <Input id="q-desc" value={quickDesc} onChange={(e) => setQuickDesc(e.target.value)} placeholder="e.g. Chicken salad" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="q-cal">Calories</Label>
                    <Input id="q-cal" type="number" min={0} value={quickCals} onChange={(e) => setQuickCals(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="q-protein">Protein (g)</Label>
                    <Input id="q-protein" type="number" min={0} value={quickProtein} onChange={(e) => setQuickProtein(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="q-carbs">Carbs (g)</Label>
                    <Input id="q-carbs" type="number" min={0} value={quickCarbs} onChange={(e) => setQuickCarbs(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="q-fat">Fat (g)</Label>
                    <Input id="q-fat" type="number" min={0} value={quickFat} onChange={(e) => setQuickFat(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="q-fiber">Fiber (g)</Label>
                    <Input id="q-fiber" type="number" min={0} value={quickFiber} onChange={(e) => setQuickFiber(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">
              Log entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&rsquo;s log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-text-muted">Nothing logged yet today.</p>}
          {MEAL_TYPES.map(({ value, label }) => {
            const mealEntries = entries.filter((e) => e.mealType === value);
            if (mealEntries.length === 0) return null;
            return (
              <div key={value}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
                <div className="space-y-1.5">
                  {mealEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{e.description}</p>
                        <p className="text-xs text-text-muted">
                          {Math.round(e.calories)} cal · {Math.round(e.proteinG)}g protein
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteNutritionEntry(e.id)}
                        className="focus-ring rounded-lg p-2 text-text-muted hover:bg-urgent-soft hover:text-urgent"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function TargetsEditor({ targets }: { targets: import("@/types/models").NutritionTargets }) {
  const [open, setOpen] = useState(false);
  const [calories, setCalories] = useState(String(targets.calories));
  const [proteinG, setProteinG] = useState(String(targets.proteinG));
  const [carbsG, setCarbsG] = useState(String(targets.carbsG));
  const [fatG, setFatG] = useState(String(targets.fatG));
  const [fiberG, setFiberG] = useState(String(targets.fiberG));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-brand hover:underline">
        Edit targets
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="t-cal">Calories</Label>
          <Input id="t-cal" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="t-protein">Protein (g)</Label>
          <Input id="t-protein" type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="t-carbs">Carbs (g)</Label>
          <Input id="t-carbs" type="number" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="t-fat">Fat (g)</Label>
          <Input id="t-fat" type="number" value={fatG} onChange={(e) => setFatG(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="t-fiber">Fiber (g)</Label>
          <Input id="t-fiber" type="number" value={fiberG} onChange={(e) => setFiberG(e.target.value)} />
        </div>
      </div>
      <HelpText>Set these based on guidance from your doctor or dietitian.</HelpText>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            await updateNutritionTargets({
              calories: Number(calories),
              proteinG: Number(proteinG),
              carbsG: Number(carbsG),
              fatG: Number(fatG),
              fiberG: Number(fiberG),
            });
            setOpen(false);
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function NewFoodForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !servingSize.trim()) return;
    await addFood({
      name: name.trim(),
      servingSize: servingSize.trim(),
      calories: Number(calories) || 0,
      proteinG: Number(proteinG) || 0,
      carbsG: Number(carbsG) || 0,
      fatG: Number(fatG) || 0,
      fiberG: Number(fiberG) || 0,
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="nf-name">Name</Label>
        <Input id="nf-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="nf-serving">Serving size</Label>
        <Input id="nf-serving" value={servingSize} onChange={(e) => setServingSize(e.target.value)} placeholder="e.g. 1 cup" required />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="nf-cal">Calories</Label>
          <Input id="nf-cal" type="number" min={0} value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nf-protein">Protein (g)</Label>
          <Input id="nf-protein" type="number" min={0} value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nf-carbs">Carbs (g)</Label>
          <Input id="nf-carbs" type="number" min={0} value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nf-fat">Fat (g)</Label>
          <Input id="nf-fat" type="number" min={0} value={fatG} onChange={(e) => setFatG(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nf-fiber">Fiber (g)</Label>
          <Input id="nf-fiber" type="number" min={0} value={fiberG} onChange={(e) => setFiberG(e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full">
        Save food
      </Button>
    </form>
  );
}

function NewMealForm({ foods, onDone }: { foods: Food[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [items, setItems] = useState<MealFoodItem[]>([{ foodId: foods[0]?.id ?? "", servings: 1 }]);

  function updateItem(index: number, patch: Partial<MealFoodItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.foodId && i.servings > 0);
    if (!name.trim() || validItems.length === 0) return;
    await addMeal({ name: name.trim(), items: validItems });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="nm-name">Meal name</Label>
        <Input id="nm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Overnight oats bowl" required />
      </div>
      <div className="space-y-2">
        <Label>Foods in this meal</Label>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              className="flex-1"
              value={item.foodId}
              onChange={(e) => updateItem(index, { foodId: e.target.value })}
            >
              <option value="">Select a food…</option>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.servingSize})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="0.5"
              min={0.5}
              value={item.servings}
              onChange={(e) => updateItem(index, { servings: Number(e.target.value) || 0 })}
              className="w-20"
              aria-label="Servings"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={items.length === 1}
              className="focus-ring shrink-0 rounded-lg p-2 text-text-muted hover:bg-urgent-soft hover:text-urgent disabled:opacity-30"
              aria-label="Remove food from meal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setItems((prev) => [...prev, { foodId: foods[0]?.id ?? "", servings: 1 }])}
        >
          <Plus className="h-4 w-4" /> Add another food
        </Button>
      </div>
      <Button type="submit" className="w-full">
        Save meal
      </Button>
    </form>
  );
}
