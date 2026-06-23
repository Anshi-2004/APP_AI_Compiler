import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-20 px-8",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-3)] border border-white/[0.06] flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
