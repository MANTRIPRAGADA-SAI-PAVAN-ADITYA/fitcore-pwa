import { Link } from "react-router-dom";
import { Scale, Apple, Droplets, Dumbbell, Moon, Pill, Stethoscope, Ruler, CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

const items = [
  { to: "/check-in", label: "Daily check-in", sub: "30 seconds", icon: CalendarCheck },
  { to: "/weight", label: "Weight", sub: "Record today's weigh-in", icon: Scale },
  { to: "/nutrition", label: "Nutrition", sub: "Log a meal or food", icon: Apple },
  { to: "/water", label: "Water", sub: "Add hydration", icon: Droplets },
  { to: "/exercise", label: "Exercise", sub: "Log a workout", icon: Dumbbell },
  { to: "/sleep", label: "Sleep", sub: "Record last night", icon: Moon },
  { to: "/medication", label: "Medication", sub: "Log a dose", icon: Pill },
  { to: "/symptoms", label: "Symptoms", sub: "Track how you feel", icon: Stethoscope },
  { to: "/measurements", label: "Measurements", sub: "Waist, chest, hips…", icon: Ruler },
];

export function LogHub() {
  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-semibold text-text">What would you like to log?</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(({ to, label, sub, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="flex h-full flex-col items-start gap-2 p-4 transition-colors hover:bg-surface-muted">
              <Icon className="h-6 w-6 text-brand" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-text">{label}</p>
                <p className="text-xs text-text-muted">{sub}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
