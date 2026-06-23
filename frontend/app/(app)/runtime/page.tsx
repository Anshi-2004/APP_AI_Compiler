"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, FolderOpen, FileText, Globe, Database, CheckCircle2,
  ChevronRight, File, Server, Download,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { mockRuntimeResult } from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCompilerStore } from "@/store/compilerStore";
import { API_BASE_URL } from "@/lib/constants";
import type { RuntimeFile } from "@/types/pipeline";

type Tab = "structure" | "pages" | "apis" | "database" | "status";

const fileTypeIcon: Record<string, React.ElementType> = {
  page: FileText, api: Server, component: File, schema: Database, config: File,
};
const fileTypeColor: Record<string, string> = {
  page: "text-purple-400", api: "text-blue-400", component: "text-amber-400",
  schema: "text-emerald-400", config: "text-[var(--color-text-muted)]",
};

export default function RuntimePage() {
  const [activeTab, setActiveTab] = useState<Tab>("structure");
  const { activeRun } = useCompilerStore();

  const result = activeRun?.stages?.runtime?.output
    ? {
        ...mockRuntimeResult,
        status: activeRun.stages.runtime.status,
        files: activeRun.stages.runtime.output.files || [],
        pages: activeRun.stages.runtime.output.pages || [],
        apis: activeRun.stages.runtime.output.apis || [],
        databases: activeRun.stages.runtime.output.databases || [],
        executionTimeMs: activeRun.stages.runtime.durationMs || 14400,
        build_logs: activeRun.stages.runtime.output.build_logs || [],
        preview_url: activeRun.stages.runtime.output.preview_url || null,
      }
    : mockRuntimeResult;

  const handleDownload = () => {
    const runId = activeRun?.id ?? "run-01";
    window.open(`${API_BASE_URL}/api/v1/runtime/download/${runId}`, "_blank");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "structure", label: "File Structure", icon: FolderOpen },
    { id: "pages", label: "Pages", icon: Globe },
    { id: "apis", label: "APIs", icon: Server },
    { id: "database", label: "Database", icon: Database },
    { id: "status", label: "Execution", icon: Zap },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={Zap}
        title="Runtime Preview"
        description="Generated application structure, pages, APIs, and execution status"
        badge={<StatusBadge status={result.status} />}
        actions={
          <div className="flex gap-2">
            {result.preview_url && (
              <a
                href={result.preview_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] border border-white/[0.08] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.1] transition-all"
              >
                <Globe className="w-3.5 h-3.5" /> Preview App
              </a>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold gradient-brand text-white hover:opacity-90 glow-brand transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download ZIP
            </button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Files Generated", value: result.files.length, icon: File, color: "text-[var(--color-brand-400)]" },
          { label: "Pages", value: result.pages.length, icon: Globe, color: "text-purple-400" },
          { label: "API Routes", value: result.apis.length, icon: Server, color: "text-blue-400" },
          { label: "Execution Time", value: formatDuration(result.executionTimeMs!), icon: Zap, color: "text-amber-400" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="p-4 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--color-text-muted)]">{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Tab panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden"
      >
        {/* Tabs */}
        <div className="flex items-center border-b border-white/[0.06] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "text-[var(--color-brand-400)] border-[var(--color-brand-400)] bg-[var(--color-brand-500)]/5"
                    : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* File Structure */}
          {activeTab === "structure" && (
            <div className="space-y-1 font-mono text-xs">
              {result.files.map((file: RuntimeFile, i: number) => {
                const segments = file.path.split("/");
                const depth = segments.length - 1;
                const Icon = fileTypeIcon[file.type] ?? File;
                return (
                  <motion.div
                    key={file.path}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-2 py-1 hover:bg-white/[0.03] rounded-md px-2 transition-colors"
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${fileTypeColor[file.type]}`} />
                    <span className="text-[var(--color-text-secondary)]">{segments[segments.length - 1]}</span>
                    <span className="ml-auto text-[var(--color-text-disabled)] text-[10px] capitalize">{file.type}</span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pages */}
          {activeTab === "pages" && (
            <div className="space-y-1">
              {result.pages.map((page: string, i: number) => (
                <motion.div
                  key={page}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-sm font-mono text-[var(--color-text-secondary)]">{page}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-disabled)] ml-auto" />
                </motion.div>
              ))}
            </div>
          )}

          {/* APIs */}
          {activeTab === "apis" && (
            <div className="space-y-1">
              {result.apis.map((api: string, i: number) => (
                <motion.div
                  key={api}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <Server className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-sm font-mono text-[var(--color-text-secondary)]">{api}</span>
                  <span className="ml-auto text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">REST</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Database */}
          {activeTab === "database" && (
            <div className="space-y-1">
              {result.databases.map((table: string, i: number) => (
                <motion.div
                  key={table}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-sm font-mono text-[var(--color-text-secondary)]">{table}</span>
                  <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">PostgreSQL</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Execution Status */}
          {activeTab === "status" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold text-emerald-400">Execution Successful</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    All {result.files.length} files generated in {formatDuration(result.executionTimeMs!)}
                  </div>
                </div>
              </div>

              {result.build_logs && result.build_logs.length > 0 ? (
                <div className="rounded-lg bg-black/40 border border-white/[0.06] p-4 font-mono text-[10px] leading-relaxed text-zinc-300 max-h-60 overflow-y-auto space-y-1">
                  {result.build_logs.map((log: string, idx: number) => (
                    <div key={idx} className={cn(
                      log.includes("[ERROR]") || log.includes("[CRITICAL]") ? "text-red-400" :
                      log.includes("[WARNING]") ? "text-amber-400" :
                      log.includes("[DEBUG]") ? "text-zinc-500" : "text-zinc-300"
                    )}>
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {[
                    { step: "Initialize runtime environment", status: "done" },
                    { step: "Resolve schema dependencies", status: "done" },
                    { step: "Generate page components", status: "done" },
                    { step: "Generate API route handlers", status: "done" },
                    { step: "Generate Prisma schema", status: "done" },
                    { step: "Generate environment config", status: "done" },
                    { step: "Bundle output artifacts", status: "done" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[var(--color-text-secondary)]">{step.step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
