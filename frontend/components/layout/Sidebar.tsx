"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Layers,
  FileJson,
  ShieldCheck,
  Wrench,
  Zap,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PenLine,
  Cpu,
  History,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useCompilerStore } from "@/store/compilerStore";

const navItems = [
  {
    group: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: Folder },
      { href: "/workspace", label: "Prompt Workspace", icon: PenLine },
    ],
  },
  {
    group: "Pipeline",
    items: [
      { href: "/pipeline", label: "Pipeline", icon: Cpu },
      { href: "/intent", label: "Intent", icon: Sparkles },
      { href: "/design", label: "System Design", icon: Layers },
      { href: "/output", label: "Schema", icon: FileJson },
      { href: "/validation", label: "Validation", icon: ShieldCheck },
      { href: "/repair", label: "Repair", icon: Wrench },
      { href: "/runtime", label: "Runtime", icon: Zap },
    ],
  },
  {
    group: "Analysis",
    items: [
      { href: "/evaluation", label: "Evaluation", icon: BarChart3 },
      { href: "/repair-history", label: "Repair History", icon: History },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useCompilerStore();

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 60 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full border-r border-white/[0.06] bg-[var(--color-surface-1)] shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-semibold text-sm tracking-tight text-[var(--color-text-primary)] whitespace-nowrap"
            >
              {APP_NAME}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navItems.map((group) => (
          <div key={group.group}>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]"
                >
                  {group.group}
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all duration-150 group relative",
                        isActive
                          ? "bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.04]"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-lg bg-[var(--color-brand-500)]/10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 relative z-10",
                          isActive
                            ? "text-[var(--color-brand-400)]"
                            : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]"
                        )}
                      />
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.12 }}
                            className="relative z-10 whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[var(--color-surface-3)] border border-white/[0.08] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-4)] transition-all z-10"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}
