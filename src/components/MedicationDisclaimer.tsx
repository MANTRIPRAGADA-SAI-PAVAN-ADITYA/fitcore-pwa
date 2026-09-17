import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The persistent, non-dismissable safety disclaimer required across every
 * medication-adjacent screen. Keep this wording stable — it is quoted
 * verbatim in the product spec and should not be softened or removed.
 */
export function MedicationDisclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-info bg-info-soft px-3.5 py-3 text-sm text-text",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
      <p>
        Your medication plan should always follow your doctor&rsquo;s prescription. This app
        tracks information and reminders; it does not prescribe, diagnose, or modify treatment.
      </p>
    </div>
  );
}
