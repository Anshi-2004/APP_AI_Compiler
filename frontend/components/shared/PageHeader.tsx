import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 pb-6 border-b border-white/[0.06] mb-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/20 flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-[var(--color-brand-400)]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
