"use client";

import Link from "next/link";
import { Bell, GitBranch, Moon, Sun, Cpu } from "lucide-react";
import { useCompilerStore } from "@/store/compilerStore";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const { theme, setTheme, activeProject } = useCompilerStore();

  return (
    <header className="flex items-center justify-between px-4 h-[52px] border-b border-white/[0.06] bg-[var(--color-surface-1)]/80 backdrop-blur shrink-0">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{APP_NAME}</span>
        </Link>
        {activeProject && (
          <>
            <span className="text-[var(--color-text-disabled)]">/</span>
            <span className="text-[var(--color-text-secondary)]">
              {activeProject.name}
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.06]"
          )}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications (placeholder) */}
        <button
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all relative",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.06]"
          )}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)]" />
        </button>

        {/* GitHub */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.06]"
          )}
          aria-label="GitHub"
        >
          <GitBranch className="w-4 h-4" />
        </a>

        {/* Avatar (Phase 2: auth) */}
        <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-semibold ml-1">
          A
        </div>
      </div>
    </header>
  );
}
