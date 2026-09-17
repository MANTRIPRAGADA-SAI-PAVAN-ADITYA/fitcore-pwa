import { useState } from "react";
import type { FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { ShieldAlert, Settings as SettingsIcon } from "lucide-react";
import { db } from "@/db/db";
import { PROFILE_ID, updateProfile } from "@/services/profile";
import { calcBMI, bmiCategory, changeBetween, percentChange, estimatedWeeklyRate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, HelpText } from "@/components/ui/Input";
import type { ActivityLevel, DietaryPreference, Sex, UnitSystem, UserProfile } from "@/types/models";

export function Profile() {
  const profile = useLiveQuery(() => db.users.get(PROFILE_ID), []);
  const weightEntries = useLiveQuery(() => db.weightEntries.orderBy("date").toArray(), []) ?? [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const bmi = calcBMI(profile.currentWeightKg, profile.heightCm);
  const totalLostKg = changeBetween(profile.currentWeightKg, profile.startingWeightKg);
  const pctLost = percentChange(profile.startingWeightKg, profile.currentWeightKg);
  const weeklyRate = estimatedWeeklyRate(weightEntries.map((w) => ({ date: w.date, value: w.weightKg })));

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your profile</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          {editing ? (
            <EditProfileForm
              profile={profile}
              saving={saving}
              onCancel={() => setEditing(false)}
              onSave={async (patch) => {
                setSaving(true);
                await updateProfile(patch);
                setSaving(false);
                setEditing(false);
              }}
            />
          ) : (
            <div className="space-y-1 text-sm text-text">
              <p className="text-lg font-semibold">{profile.name}</p>
              <p className="text-text-muted">
                {profile.age} yrs · {profile.heightCm} cm · {profile.units === "metric" ? "Metric" : "Imperial"}
              </p>
              <p className="text-text-muted capitalize">
                {profile.activityLevel.replace("_", " ")} activity · {profile.dietaryPreference.replace("_", " ")} diet
              </p>
              {profile.allergies.length > 0 && (
                <p className="text-text-muted">Allergies: {profile.allergies.join(", ")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>BMI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bmi ? bmi.toFixed(1) : "—"}</p>
            <p className="text-xs text-text-muted">{bmi ? bmiCategory(bmi) : "Add weight to calculate"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly trend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {weeklyRate === null ? "—" : `${weeklyRate > 0 ? "+" : ""}${weeklyRate.toFixed(2)} kg`}
            </p>
            <p className="text-xs text-text-muted">Estimated from your own history</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Since starting</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalLostKg === 0 ? "0 kg" : `${totalLostKg > 0 ? "+" : ""}${totalLostKg.toFixed(1)} kg`}
            </p>
            <p className="text-xs text-text-muted">
              {pctLost !== null ? `${Math.abs(pctLost).toFixed(1)}% of starting weight` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Target</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile.targetWeightKg} kg</p>
            <p className="text-xs text-text-muted">
              {profile.targetDate ? `By ${profile.targetDate}` : "No target date set"}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-text-muted">
        BMI and trend figures are informational estimates based on your own logged data — not a medical diagnosis.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/safety">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted">
            <ShieldAlert className="h-5 w-5 text-urgent" />
            <div>
              <p className="text-sm font-semibold">Safety & medical help</p>
              <p className="text-xs text-text-muted">Emergency contacts</p>
            </div>
          </Card>
        </Link>
        <Link to="/settings">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted">
            <SettingsIcon className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm font-semibold">Settings & data</p>
              <p className="text-xs text-text-muted">Targets, reminders, export</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function EditProfileForm({
  profile,
  saving,
  onSave,
  onCancel,
}: {
  profile: UserProfile;
  saving: boolean;
  onSave: (patch: Partial<UserProfile>) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [currentWeightKg, setCurrentWeightKg] = useState(String(profile.currentWeightKg));
  const [targetWeightKg, setTargetWeightKg] = useState(String(profile.targetWeightKg));
  const [targetDate, setTargetDate] = useState(profile.targetDate ?? "");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(profile.dietaryPreference);
  const [allergies, setAllergies] = useState(profile.allergies.join(", "));
  const [units, setUnits] = useState<UnitSystem>(profile.units);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      age: Number(age),
      sex,
      heightCm: Number(heightCm),
      currentWeightKg: Number(currentWeightKg),
      targetWeightKg: Number(targetWeightKg),
      targetDate: targetDate || null,
      activityLevel,
      dietaryPreference,
      allergies: allergies.split(",").map((a) => a.trim()).filter(Boolean),
      units,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="p-name">Name</Label>
        <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-age">Age</Label>
          <Input id="p-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="p-units">Units</Label>
          <Select id="p-units" value={units} onChange={(e) => setUnits(e.target.value as UnitSystem)}>
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="p-sex">Sex</Label>
        <Select id="p-sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="intersex">Intersex</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-height">Height (cm)</Label>
          <Input id="p-height" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="p-current">Current weight (kg)</Label>
          <Input id="p-current" type="number" step="0.1" value={currentWeightKg} onChange={(e) => setCurrentWeightKg(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-target">Target weight (kg)</Label>
          <Input id="p-target" type="number" step="0.1" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="p-target-date">Target date</Label>
          <Input id="p-target-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="p-activity">Activity level</Label>
        <Select id="p-activity" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
          <option value="very_active">Very active</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="p-diet">Dietary preference</Label>
        <Select id="p-diet" value={dietaryPreference} onChange={(e) => setDietaryPreference(e.target.value as DietaryPreference)}>
          <option value="none">No specific preference</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="pescatarian">Pescatarian</option>
          <option value="halal">Halal</option>
          <option value="kosher">Kosher</option>
          <option value="low_carb">Low-carb</option>
          <option value="gluten_free">Gluten-free</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="p-allergies">Allergies / intolerances</Label>
        <Input id="p-allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
        <HelpText>Comma-separated</HelpText>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
