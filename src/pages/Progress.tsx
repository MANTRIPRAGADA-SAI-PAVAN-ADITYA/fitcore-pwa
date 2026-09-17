import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Camera, Trash2 } from "lucide-react";
import { db } from "@/db/db";
import { PROFILE_ID } from "@/services/profile";
import { addProgressPhoto, deleteProgressPhoto, listProgressPhotos } from "@/services/photos";
import { MEASUREMENT_LABELS } from "@/services/measurements";
import { changeBetween, percentChange, progressPercent, formatISODate } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ProgressPhoto } from "@/types/models";

function PhotoThumb({ photo, onDelete }: { photo: ProgressPhoto; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo.blob]);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-muted">
      {url && <img src={url} alt={`Progress photo from ${photo.date}`} className="h-full w-full object-cover" />}
      <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-xs text-white">{photo.date}</div>
      <button
        type="button"
        onClick={onDelete}
        className="focus-ring absolute right-1 top-1 rounded-lg bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="Delete photo"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Progress() {
  const profile = useLiveQuery(() => db.users.get(PROFILE_ID), []);
  const weightEntries = useLiveQuery(() => db.weightEntries.orderBy("date").toArray(), []) ?? [];
  const measurements = useLiveQuery(() => db.measurements.orderBy("date").toArray(), []) ?? [];
  const photos = useLiveQuery(() => listProgressPhotos(), []) ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  const latestWeight = weightEntries.length ? weightEntries[weightEntries.length - 1].weightKg : profile.currentWeightKg;
  const lostKg = changeBetween(latestWeight, profile.startingWeightKg);
  const pctLost = percentChange(profile.startingWeightKg, latestWeight);
  const pct = progressPercent(profile.startingWeightKg, latestWeight, profile.targetWeightKg);

  const latestByType = new Map<string, (typeof measurements)[number]>();
  for (const m of measurements) latestByType.set(m.type, m);

  async function handlePhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await addProgressPhoto(formatISODate(new Date()), file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Weight lost</p>
          <p className="text-4xl font-extrabold text-brand">
            {lostKg > 0 ? lostKg.toFixed(1) : "0.0"} kg
          </p>
          {pctLost !== null && (
            <p className="text-sm text-text-muted">{Math.abs(pctLost).toFixed(1)}% of starting weight</p>
          )}

          <div className="pt-2">
            <div className="mb-1 flex justify-between text-xs font-semibold text-text-muted">
              <span>START · {profile.startingWeightKg} kg</span>
              <span>TARGET · {profile.targetWeightKg} kg</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-700"
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">{pct.toFixed(0)}% of the way to your target</p>
          </div>
        </CardContent>
      </Card>

      {latestByType.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest measurements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from(latestByType.values()).map((m) => (
              <div key={m.type} className="rounded-lg border border-border p-2 text-center">
                <p className="text-lg font-bold">
                  {m.valueCm}
                  {m.type === "body_fat_pct" ? "%" : " cm"}
                </p>
                <p className="text-xs text-text-muted">{m.customLabel || MEASUREMENT_LABELS[m.type]}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Progress photos</CardTitle>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Camera className="h-4 w-4" /> Add photo
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-text-muted">
            Photos are stored only on this device and are never uploaded or shared unless you export your data yourself.
          </p>
          {photos.length === 0 ? (
            <p className="text-sm text-text-muted">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => (
                <PhotoThumb key={photo.id} photo={photo} onDelete={() => deleteProgressPhoto(photo.id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
