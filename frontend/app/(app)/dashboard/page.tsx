"use client";

import { useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  LayoutDashboard,
  Clock,
  Folder,
  ArrowRight,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { mockPipelineRun, mockEvaluationMetrics } from "@/lib/mock-data";
import { formatRelativeTime, formatDuration } from "@/lib/utils";
import type { StageStatus } from "@/types/pipeline";
import { useCompilerStore } from "@/store/compilerStore";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

const statusIcon: Record<StageStatus, React.ElementType> = {
  idle: Clock,
  pending: Clock,
  running: Loader2,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
};

export default function DashboardPage() {
  const { projects, activeRun, fetchProjects, setActiveProject } = useCompilerStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const metricCards = [
    { label: "Success Rate", value: `${mockEvaluationMetrics.successRate}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Avg Latency", value: formatDuration(mockEvaluationMetrics.avgLatencyMs), icon: Zap, color: "text-[var(--color-brand-400)]", bg: "bg-[var(--color-brand-500)]/10 border-[var(--color-brand-500)]/20" },
    { label: "Total Projects", value: projects.length, icon: Folder, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Repair Rate", value: `${mockEvaluationMetrics.repairPercent}%`, icon: CheckCircle2, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  ];

  // Resolve active run or fall back to mock
  const resolvedRun = activeRun || mockPipelineRun;

  // Resolve prompt history
  const promptHistory = projects.map(p => ({
    id: p.lastRunId || p.id,
    prompt: p.description,
    status: p.status,
    createdAt: p.createdAt
  })).slice(0, 3);

  const resolvedPromptHistory = promptHistory.length > 0 ? promptHistory : [
    mockPipelineRun,
    { id: "run-old-1", prompt: "Create a task management SaaS with kanban and team roles", status: "success" as const, createdAt: "2026-06-19T10:00:00Z" },
    { id: "run-old-2", prompt: "Build a blog CMS with markdown and RSS", status: "success" as const, createdAt: "2026-06-18T08:00:00Z" }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Overview of your compiler workspace and recent activity"
        actions={
          <Link
            href="/workspace"
            className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Link>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className={`p-4 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] hover:border-white/[0.1] transition-all`}
            >
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mb-3 ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{card.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-[var(--color-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent Projects</h2>
            </div>
            <Link href="/projects" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-brand-400)] flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {projects.slice(0, 4).map((project) => {
              const Icon = statusIcon[project.status];
              return (
                <Link
                  key={project.id}
                  href={`/pipeline`}
                  onClick={() => setActiveProject(project)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-3)] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-400)] transition-colors truncate">
                      {project.name}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] truncate">{project.description}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={project.status} size="sm" />
                    <span className="text-xs text-[var(--color-text-disabled)]">
                      {formatRelativeTime(project.updatedAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Prompt History */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
            <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Prompt History</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {resolvedPromptHistory.map((run) => {
              // Find matching project
              const matchedProject = projects.find(p => p.id === run.id || p.lastRunId === run.id);
              return (
                <Link
                  key={run.id}
                  href="/pipeline"
                  onClick={() => matchedProject && setActiveProject(matchedProject)}
                  className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                >
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 group-hover:text-[var(--color-text-primary)] transition-colors">
                    {run.prompt}
                  </p>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={run.status} size="sm" />
                    <span className="text-[10px] text-[var(--color-text-disabled)]">
                      {formatRelativeTime(run.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="p-4">
            <Link
              href="/workspace"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] border border-white/[0.06] text-xs font-medium text-[var(--color-text-secondary)] hover:text-white transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Generation
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Last Run Overview */}
      <motion.div
        custom={6}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Last Pipeline Run</h2>
          <Link href="/pipeline" className="text-xs text-[var(--color-brand-400)] hover:underline flex items-center gap-1">
            View details <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-5 font-mono bg-[var(--color-surface-2)] rounded-lg px-3 py-2 line-clamp-1">
          {resolvedRun.prompt}
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Object.values(resolvedRun.stages).map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                    stage.status === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : stage.status === "running"
                      ? "bg-[var(--color-brand-500)]/10 border-[var(--color-brand-500)]/20"
                      : "bg-white/[0.04] border-white/[0.08]"
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      stage.status === "success" ? "text-emerald-400" : "text-[var(--color-text-disabled)]"
                    }`}
                  />
                </div>
                <span className="text-[9px] text-[var(--color-text-muted)] text-center leading-tight max-w-[56px]">
                  {stage.label}
                </span>
                {stage.durationMs && (
                  <span className="text-[9px] text-[var(--color-text-disabled)] font-mono">
                    {formatDuration(stage.durationMs)}
                  </span>
                )}
              </div>
              {i < Object.values(resolvedRun.stages).length - 1 && (
                <div className="w-6 h-px bg-white/[0.1] shrink-0" />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

