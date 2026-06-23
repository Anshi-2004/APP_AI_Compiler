"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle,
  Filter, ChevronDown,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { mockValidationReport } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { ValidationSeverity } from "@/types/pipeline";
import { useCompilerStore } from "@/store/compilerStore";

const severityConfig: Record<
  ValidationSeverity,
  { icon: React.ElementType; label: string; className: string; badge: string }
> = {
  pass: {
    icon: CheckCircle2,
    label: "Passed",
    className: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    className: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  error: {
    icon: XCircle,
    label: "Error",
    className: "text-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const layerColors: Record<string, string> = {
  ui: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  api: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  database: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  auth: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "cross-layer": "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function ValidationPage() {
  const [filter, setFilter] = useState<ValidationSeverity | "all">("all");
  const { activeRun } = useCompilerStore();
  const rawReport = activeRun?.stages?.validation?.output || mockValidationReport;

  // Normalize the report to handle both camelCase/snake_case and grouped/flat checks formats
  const report = {
    totalChecks: rawReport.total_checks ?? rawReport.totalChecks ?? 0,
    passed: rawReport.passed ?? 0,
    warnings: rawReport.warnings ?? 0,
    errors: rawReport.errors ?? 0,
    checks: (Array.isArray(rawReport.checks)
      ? rawReport.checks
      : [
          rawReport.json_validation?.checks,
          rawReport.ui_validation?.checks,
          rawReport.api_validation?.checks,
          rawReport.db_validation?.checks,
          rawReport.cross_layer_validation?.checks,
          rawReport.logical_validation?.checks,
        ]
          .filter(Boolean)
          .flat()) as any[],
  };

  const filtered = filter === "all"
    ? report.checks
    : report.checks.filter((c: any) => c.severity === filter);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Validation Report"
        description="Cross-layer checks across UI, API, database, and auth schemas"
        badge={<StatusBadge status={report.errors > 0 ? "error" : report.warnings > 0 ? "pending" : "success"} />}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Checks", value: report.totalChecks, icon: ShieldCheck, color: "text-[var(--color-text-secondary)]", bg: "bg-[var(--color-surface-2)] border-white/[0.06]" },
          { label: "Passed", value: report.passed, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Warnings", value: report.warnings, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Errors", value: report.errors, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`p-4 rounded-xl border ${card.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--color-text-muted)]">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Score bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Validation Score</span>
          <span className="text-2xl font-bold gradient-text">
            {Math.round((report.passed / report.totalChecks) * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden flex">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(report.passed / report.totalChecks) * 100}%` }} />
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(report.warnings / report.totalChecks) * 100}%` }} />
          <div className="h-full bg-red-500 transition-all" style={{ width: `${(report.errors / report.totalChecks) * 100}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Passed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Warnings</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Errors</span>
        </div>
      </motion.div>

      {/* Filter + Checks */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden"
      >
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <span className="text-xs text-[var(--color-text-muted)] mr-2">Filter:</span>
          {(["all", "pass", "warning", "error"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize",
                filter === f
                  ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              )}
            >
              {f === "all" ? `All (${report.totalChecks})` : f === "pass" ? `✔ Passed (${report.passed})` : f === "warning" ? `⚠ Warnings (${report.warnings})` : `✖ Errors (${report.errors})`}
            </button>
          ))}
          <span className="ml-auto text-xs text-[var(--color-text-disabled)]">{filtered.length} results</span>
        </div>

        {/* Check list */}
        <div className="divide-y divide-white/[0.04]">
          {filtered.map((check: any, i: number) => {
            const { icon: SevIcon, label: sevLabel, className: sevClass, badge } = severityConfig[check.severity as ValidationSeverity];
            return (
              <motion.div
                key={check.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sevClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">{check.rule}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge}`}>{sevLabel}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${layerColors[check.layer] ?? "text-[var(--color-text-muted)]"}`}>
                      {check.layer}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{check.message}</p>
                  {check.field && (
                    <span className="text-[10px] font-mono text-[var(--color-text-disabled)] mt-1 block">
                      → {check.field}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
