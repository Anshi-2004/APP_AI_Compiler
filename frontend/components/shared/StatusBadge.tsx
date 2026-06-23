import type { StageStatus } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StageStatus;
  label?: string;
  size?: "sm" | "md";
}

const config: Record<
  StageStatus,
  { label: string; className: string; dotClass: string }
> = {
  idle: {
    label: "Idle",
    className: "bg-white/[0.05] text-[var(--color-text-muted)]",
    dotClass: "bg-[var(--color-text-disabled)]",
  },
  pending: {
    label: "Pending",
    className: "bg-white/[0.06] text-[var(--color-text-secondary)]",
    dotClass: "bg-[var(--color-status-pending)]",
  },
  running: {
    label: "Running",
    className:
      "bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)] border border-[var(--color-brand-500)]/20",
    dotClass: "bg-[var(--color-brand-400)] animate-pulse",
  },
  success: {
    label: "Success",
    className:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    dotClass: "bg-emerald-400",
  },
  error: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 border border-red-500/20",
    dotClass: "bg-red-400",
  },
  warning: {
    label: "Warning",
    className: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    dotClass: "bg-amber-400",
  },
};

export default function StatusBadge({
  status,
  label,
  size = "md",
}: StatusBadgeProps) {
  const { label: defaultLabel, className, dotClass } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      {label ?? defaultLabel}
    </span>
  );
}
