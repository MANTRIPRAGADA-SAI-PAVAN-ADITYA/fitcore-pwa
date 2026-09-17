import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "brand" | "positive" | "attention" | "urgent" | "info" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-soft text-brand",
  positive: "bg-positive-soft text-positive",
  attention: "bg-attention-soft text-attention",
  urgent: "bg-urgent-soft text-urgent",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-muted text-text-muted",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
