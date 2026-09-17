import { useLiveQuery } from "dexie-react-hooks";
import { Lightbulb } from "lucide-react";
import { db } from "@/db/db";
import { getSettings } from "@/services/settings";
import { generateInsights } from "@/analytics/insights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function Insights() {
  const weightEntries = useLiveQuery(() => db.weightEntries.toArray(), []) ?? [];
  const exerciseEntries = useLiveQuery(() => db.exerciseEntries.toArray(), []) ?? [];
  const nutritionEntries = useLiveQuery(() => db.nutritionEntries.toArray(), []) ?? [];
  const settings = useLiveQuery(() => getSettings(), []);

  if (!settings) return null;

  const insights = generateInsights({
    weightEntries,
    exerciseEntries,
    nutritionEntries,
    proteinTargetG: settings.nutritionTargets.proteinG,
  });

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle>Insights from your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-sm text-text-muted">
              Keep logging your weight, nutrition, and exercise — patterns will show up here once there&rsquo;s enough
              history.
            </p>
          ) : (
            insights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <p className="text-sm text-text">{insight.text}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-text-muted">
        These insights describe patterns in your own logged data. They are not medical advice, do not diagnose
        anything, and never suggest changing your medication.
      </p>
    </div>
  );
}
