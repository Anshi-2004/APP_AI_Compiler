"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu, Sparkles, Layers, FileJson, ShieldCheck, Wrench, Zap,
  CheckCircle2, XCircle, Clock, Loader2, ChevronRight, ArrowRight,
  Play, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { mockPipelineRun, mockPipelineRunning } from "@/lib/mock-data";
import { PIPELINE_STAGES } from "@/lib/constants";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import type { PipelineRun, StageStatus } from "@/types/pipeline";
import { useCompilerStore } from "@/store/compilerStore";

const stageIconMap: Record<string, React.ElementType> = {
  intent: Sparkles, design: Layers, schema: FileJson,
  validation: ShieldCheck, repair: Wrench, runtime: Zap,
};

const statusIcon: Record<StageStatus, React.ElementType> = {
  idle: Clock, pending: Clock, running: Loader2,
  success: CheckCircle2, error: XCircle, warning: AlertCircle,
};

const statusColor: Record<StageStatus, string> = {
  idle: "text-[var(--color-text-disabled)]",
  pending: "text-[var(--color-text-muted)]",
  running: "text-[var(--color-brand-400)]",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

function StageCard({ stage, index }: { stage: PipelineRun["stages"][keyof PipelineRun["stages"]]; index: number }) {
  const StageIcon = stageIconMap[stage.id];
  const StatusIcon = statusIcon[stage.status];
  const isRunning = stage.status === "running";
  const isSuccess = stage.status === "success";
  const isError = stage.status === "error";
  const isPending = stage.status === "pending" || stage.status === "idle";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className={`relative rounded-xl border p-5 transition-all ${
        isRunning
          ? "bg-[var(--color-brand-500)]/5 border-[var(--color-brand-500)]/30 glow-brand"
          : isSuccess
          ? "bg-emerald-500/5 border-emerald-500/20"
          : isError
          ? "bg-red-500/5 border-red-500/20"
          : "bg-[var(--color-surface-1)] border-white/[0.06]"
      }`}
    >
      {/* Stage number */}
      <div className="absolute top-4 right-4 text-xs font-mono text-[var(--color-text-disabled)]">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
            isRunning
              ? "bg-[var(--color-brand-500)]/15 border-[var(--color-brand-500)]/30"
              : isSuccess
              ? "bg-emerald-500/15 border-emerald-500/20"
              : isError
              ? "bg-red-500/15 border-red-500/20"
              : "bg-[var(--color-surface-3)] border-white/[0.06]"
          }`}
        >
          <StageIcon
            className={`w-5 h-5 ${
              isRunning
                ? "text-[var(--color-brand-400)]"
                : isSuccess
                ? "text-emerald-400"
                : isError
                ? "text-red-400"
                : "text-[var(--color-text-muted)]"
            } ${isRunning ? "animate-pulse" : ""}`}
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {stage.label}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {stage.description}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`w-3.5 h-3.5 ${statusColor[stage.status]} ${
              isRunning ? "animate-spin" : ""
            }`}
          />
          <StatusBadge status={stage.status} size="sm" />
        </div>
        {stage.durationMs && (
          <span className="text-xs font-mono text-[var(--color-text-muted)]">
            {formatDuration(stage.durationMs)}
          </span>
        )}
      </div>

      {/* Running progress bar */}
      {isRunning && (
        <div className="mt-3 h-0.5 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
          <motion.div
            className="h-full gradient-brand rounded-full"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Error message */}
      {isError && stage.errorMessage && (
        <div className="mt-3 text-xs text-red-400 bg-red-500/5 rounded-lg px-3 py-2 font-mono">
          {stage.errorMessage}
        </div>
      )}
    </motion.div>
  );
}

export default function PipelinePage() {
  const { activeRun: storeRun } = useCompilerStore();
  const [activeRun, setActiveRun] = useState<"completed" | "running" | "store">("store");

  const resolvedMode = activeRun === "store" && !storeRun ? "completed" : activeRun;
  const run =
    resolvedMode === "store" && storeRun
      ? storeRun
      : resolvedMode === "completed"
      ? mockPipelineRun
      : mockPipelineRunning;

  const stages = PIPELINE_STAGES.map((s) => run.stages[s.id]);
  const successCount = stages.filter((s) => s.status === "success").length;
  const isRunning = stages.some((s) => s.status === "running");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={Cpu}
        title="Pipeline"
        description="Real-time status of every compilation stage"
        badge={<StatusBadge status={run.status} />}
        actions={
          <div className="flex items-center gap-2">
            {/* Demo toggle */}
            <div className="flex items-center rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] p-0.5">
              {storeRun && (
                <button
                  onClick={() => setActiveRun("store")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    resolvedMode === "store"
                      ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  Active Run
                </button>
              )}
              {(["completed", "running"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveRun(mode)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    resolvedMode === mode
                      ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  {mode === "completed" ? "Demo Completed" : "Demo Running"}
                </button>
              ))}
            </div>
            <Link
              href="/workspace"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg gradient-brand text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Play className="w-3.5 h-3.5" /> New Run
            </Link>
          </div>
        }
      />

      {/* Run meta */}
      <div className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <span className="text-[var(--color-text-muted)]">
            Run ID: <span className="font-mono text-[var(--color-text-secondary)]">{run.id}</span>
          </span>
          <span className="text-[var(--color-text-muted)]">
            Started: <span className="text-[var(--color-text-secondary)]">{formatRelativeTime(run.createdAt)}</span>
          </span>
          <span className="text-[var(--color-text-muted)]">
            Progress: <span className="text-[var(--color-text-secondary)]">{successCount}/{stages.length} stages</span>
          </span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[var(--color-brand-400)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-400)] animate-pulse" />
              Pipeline running...
            </span>
          )}
        </div>

        {/* Prompt */}
        <div className="mt-3 text-xs text-[var(--color-text-muted)] font-mono bg-[var(--color-surface-2)] rounded-lg px-3 py-2 line-clamp-1">
          {run.prompt}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
          <motion.div
            className="h-full gradient-brand rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(successCount / stages.length) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" as const }}
          />
        </div>
      </div>

      {/* Stage Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage, i) => (
          <StageCard key={stage.id} stage={stage} index={i} />
        ))}
      </div>

      {/* Navigation to output pages */}
      {run.status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {[
            { href: "/output", label: "View Generated Output", desc: "UI, API, DB, Auth schemas", icon: FileJson, color: "text-[var(--color-brand-400)]" },
            { href: "/validation", label: "Validation Report", desc: "Checks, warnings, errors", icon: ShieldCheck, color: "text-emerald-400" },
            { href: "/runtime", label: "Runtime Preview", desc: "Generated files & structure", icon: Zap, color: "text-amber-400" },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] hover:border-white/[0.12] transition-all group"
              >
                <Icon className={`w-5 h-5 ${link.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-400)] transition-colors">
                    {link.label}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">{link.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-disabled)] group-hover:text-[var(--color-brand-400)] transition-colors shrink-0" />
              </Link>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
