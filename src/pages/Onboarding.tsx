import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, HelpText } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { completeOnboarding, type ProfileInput } from "@/services/profile";
import { ensureDefaultHabits } from "@/services/habits";
import { getSettings } from "@/services/settings";
import type {
  ActivityLevel,
  DietaryPreference,
  Sex,
  UnitSystem,
} from "@/types/models";

const sexOptions: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const activityOptions: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary (little to no exercise)" },
  { value: "light", label: "Light (1-3 days/week)" },
  { value: "moderate", label: "Moderate (3-5 days/week)" },
  { value: "active", label: "Active (6-7 days/week)" },
  { value: "very_active", label: "Very active (physical job or 2x/day)" },
];

const dietOptions: { value: DietaryPreference; label: string }[] = [
  { value: "none", label: "No specific preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "low_carb", label: "Low-carb" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "other", label: "Other" },
];

const STEPS = ["About you", "Body & goals", "Preferences"] as const;

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("prefer_not_to_say");
  const [units, setUnits] = useState<UnitSystem>("metric");

  const [heightCm, setHeightCm] = useState("");
  const [startingWeightKg, setStartingWeightKg] = useState("");
  const [currentWeightKg, setCurrentWeightKg] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("light");

  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>("none");
  const [allergies, setAllergies] = useState("");
  const [exerciseFrequencyPerWeek, setExerciseFrequencyPerWeek] = useState("2");

  const isLast = step === STEPS.length - 1;

  function validateStep(): string | null {
    if (step === 0) {
      if (!name.trim()) return "Please enter your name.";
      if (!age || Number(age) <= 0 || Number(age) > 120) return "Please enter a valid age.";
    }
    if (step === 1) {
      if (!heightCm || Number(heightCm) <= 0) return "Please enter your height.";
      if (!startingWeightKg || Number(startingWeightKg) <= 0) return "Please enter a starting weight.";
      if (!currentWeightKg || Number(currentWeightKg) <= 0) return "Please enter your current weight.";
      if (!targetWeightKg || Number(targetWeightKg) <= 0) return "Please enter a target weight.";
    }
    return null;
  }

  function goNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const profile: ProfileInput = {
        name: name.trim(),
        age: Number(age),
        sex,
        heightCm: Number(heightCm),
        startingWeightKg: Number(startingWeightKg),
        currentWeightKg: Number(currentWeightKg),
        targetWeightKg: Number(targetWeightKg),
        targetDate: targetDate || null,
        activityLevel,
        dietaryPreference,
        allergies: allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        exerciseFrequencyPerWeek: Number(exerciseFrequencyPerWeek) || 0,
        units,
      };
      await completeOnboarding(profile);
      await Promise.all([ensureDefaultHabits(), getSettings()]);
      navigate("/", { replace: true });
    } catch {
      setError("Something went wrong saving your profile. Your data stays on this device — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand">
          <HeartPulse className="h-7 w-7" aria-hidden="true" />
          <span className="text-xl font-bold">FitJourney</span>
        </div>

        <div className="mb-5 flex items-center justify-center gap-2" role="tablist" aria-label="Onboarding steps">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  idx <= step ? "bg-brand text-brand-fg" : "bg-surface-muted text-text-muted"
                }`}
                aria-current={idx === step ? "step" : undefined}
              >
                {idx + 1}
              </div>
              {idx < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} noValidate>
              <h2 className="mb-4 text-lg font-semibold text-text">{STEPS[step]}</h2>

              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input id="age" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="units">Units</Label>
                      <Select id="units" value={units} onChange={(e) => setUnits(e.target.value as UnitSystem)}>
                        <option value="metric">Metric (kg, cm)</option>
                        <option value="imperial">Imperial (lb, in)</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sex">Sex</Label>
                    <Select id="sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                      {sexOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    <HelpText>Used only to inform BMI display and default targets — never shared.</HelpText>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input id="height" type="number" min={1} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startWeight">Starting weight (kg)</Label>
                      <Input id="startWeight" type="number" step="0.1" min={1} value={startingWeightKg} onChange={(e) => setStartingWeightKg(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="currentWeight">Current weight (kg)</Label>
                      <Input id="currentWeight" type="number" step="0.1" min={1} value={currentWeightKg} onChange={(e) => setCurrentWeightKg(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="targetWeight">Target weight (kg)</Label>
                      <Input id="targetWeight" type="number" step="0.1" min={1} value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="targetDate">Target date (optional)</Label>
                      <Input id="targetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="activity">Activity level</Label>
                    <Select id="activity" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
                      {activityOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="diet">Dietary preference</Label>
                    <Select id="diet" value={dietaryPreference} onChange={(e) => setDietaryPreference(e.target.value as DietaryPreference)}>
                      {dietOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="allergies">Allergies / intolerances</Label>
                    <Input id="allergies" placeholder="e.g. peanuts, lactose (comma-separated)" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="exerciseFreq">Typical exercise frequency (days/week)</Label>
                    <Input id="exerciseFreq" type="number" min={0} max={14} value={exerciseFrequencyPerWeek} onChange={(e) => setExerciseFrequencyPerWeek(e.target.value)} />
                  </div>
                  <HelpText>
                    You can fine-tune nutrition and water targets, medication details, and reminders any time from
                    Settings.
                  </HelpText>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-urgent">
                  {error}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0 || submitting}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {isLast ? (
                  <Button key="submit" type="submit" disabled={submitting}>
                    {submitting ? "Saving…" : "Start my journey"}
                  </Button>
                ) : (
                  <Button key="next" type="button" onClick={goNext}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
