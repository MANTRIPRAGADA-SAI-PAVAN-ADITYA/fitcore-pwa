import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeTone } from "@/components/ui/Badge";

const toneToVar: Record<BadgeTone, string> = {
  brand: "var(--color-brand)",
  positive: "var(--color-positive)",
  attention: "var(--color-attention)",
  urgent: "var(--color-urgent)",
  info: "var(--color-info)",
  neutral: "var(--color-text-muted)",
};

interface ProgressBarProps {
  value: number; // 0-100
  tone?: BadgeTone;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, tone = "brand", className, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped}%`, backgroundColor: toneToVar[tone] }}
      />
    </div>
  );
}

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  tone?: BadgeTone;
  label?: string;
  children?: ReactNode;
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 10,
  tone = "brand",
  label,
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneToVar[tone]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  );
}
