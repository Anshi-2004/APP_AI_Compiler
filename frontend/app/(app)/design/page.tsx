"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Layers, Copy, Download, Check, Cpu, Server, Database, ExternalLink, Link2, Info } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { useCompilerStore } from "@/store/compilerStore";

// Monaco Editor — loaded client-side only
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)] shimmer rounded-b-xl min-h-[400px]">
      Loading editor...
    </div>
  ),
});

const mockDesignData = {
  architecture: [
    { id: "frontend", name: "Next.js Frontend", type: "frontend", technology: "Next.js 16", responsibilities: ["UI rendering", "client-side routing", "state management"] },
    { id: "api", name: "FastAPI Backend", type: "backend", technology: "FastAPI", responsibilities: ["business logic", "REST APIs", "data validation"] },
    { id: "db", name: "PostgreSQL Database", type: "database", technology: "PostgreSQL 16", responsibilities: ["data persistence", "relational queries"] },
    { id: "stripe", name: "Stripe Payment Gateway", type: "external", technology: "Stripe API", responsibilities: ["credit card payments", "subscription Billing"] },
  ],
  connections: [
    { id: "e1", source: "frontend", target: "api", protocol: "REST / JSON" },
    { id: "e2", source: "api", target: "db", protocol: "SQL / SQLAlchemy" },
    { id: "e3", source: "api", target: "stripe", protocol: "HTTPS / Webhooks" },
  ],
  entity_relationships: [],
  navigation_flow: [],
  role_hierarchy: [],
  data_flows: [],
  tech_stack: { frontend: "Next.js & Tailwind CSS", backend: "FastAPI & Pydantic", database: "PostgreSQL & SQLAlchemy" },
  design_notes: [
    "Stripe webhook notifications handled server-side for security compliance",
    "FastAPI auto-generates OpenAPI specification schemas for frontend client sync",
    "PostgreSQL tables mapped using SQLAlchemy asynchronous session handlers"
  ]
};

export default function DesignPage() {
  const [activeView, setActiveView] = useState<"structured" | "raw">("structured");
  const [copied, setCopied] = useState(false);
  const { activeRun } = useCompilerStore();

  const runDesign = activeRun?.stages?.design?.output;
  const design = runDesign || mockDesignData;
  const content = JSON.stringify(design, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-design.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case "frontend": return Cpu;
      case "backend": return Server;
      case "database": return Database;
      default: return ExternalLink;
    }
  };

  const getComponentColor = (type: string) => {
    switch (type) {
      case "frontend": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "backend": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "database": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 flex flex-col h-full">
      <PageHeader
        icon={Layers}
        title="System Design"
        description="Generated system topology, components, connections, and technology stack"
        actions={
          <div className="flex items-center gap-2">
            {/* View Selector */}
            <div className="flex items-center rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] p-0.5 text-xs font-semibold mr-2">
              <button
                onClick={() => setActiveView("structured")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all",
                  activeView === "structured" ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                )}
              >
                Structured View
              </button>
              <button
                onClick={() => setActiveView("raw")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all",
                  activeView === "raw" ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                )}
              >
                Raw JSON
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        }
      />

      {activeView === "structured" ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column: Tech Stack & Notes */}
          <div className="space-y-6">
            {/* Tech Stack */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Technology Stack</h3>
              <div className="space-y-3.5 text-xs">
                {Object.entries(design.tech_stack).map(([layer, tech]: [string, any]) => (
                  <div key={layer} className="space-y-1">
                    <span className="text-[var(--color-text-muted)] capitalize block">{layer}</span>
                    <span className="text-[var(--color-text-secondary)] font-medium text-sm block">
                      {tech as string}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Design Notes */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4 animate-in"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[var(--color-brand-400)]" /> Design Decisions
              </h3>
              <div className="space-y-3.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {design.design_notes.map((note: any, i: number) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[var(--color-brand-400)] font-bold">0{i+1}.</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right 2 Columns: Components & Connections */}
          <div className="md:col-span-2 space-y-6">
            {/* Architecture Components */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Architecture Components</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {design.architecture.map((comp: any) => {
                  const Icon = getComponentIcon(comp.type);
                  return (
                    <div key={comp.id} className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", getComponentColor(comp.type))}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-[var(--color-text-secondary)] block">{comp.name}</span>
                            <span className="text-[10px] text-[var(--color-text-disabled)] capitalize font-mono block">{comp.technology}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] space-y-1 pt-1.5 border-t border-white/[0.04]">
                          <span className="font-bold text-[var(--color-text-secondary)] block mb-1">Responsibilities:</span>
                          {comp.responsibilities.map((resp: any, i: number) => (
                            <div key={i} className="flex items-start gap-1">
                              <span className="text-[var(--color-text-disabled)]">•</span>
                              <span>{resp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Architecture Connections */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-[var(--color-brand-400)]" /> Data Flow Connections
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[var(--color-text-muted)]">
                      <th className="py-2.5 font-semibold">Source</th>
                      <th className="py-2.5 font-semibold text-center">Connection</th>
                      <th className="py-2.5 font-semibold">Target</th>
                      <th className="py-2.5 font-semibold text-right">Protocol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {design.connections.map((conn: any) => (
                      <tr key={conn.id}>
                        <td className="py-3 font-semibold text-[var(--color-text-secondary)] capitalize">{conn.source}</td>
                        <td className="py-3 text-center text-[var(--color-text-disabled)]">───&gt;</td>
                        <td className="py-3 font-semibold text-[var(--color-text-secondary)] capitalize">{conn.target}</td>
                        <td className="py-3 text-right font-mono text-purple-400">{conn.protocol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden flex flex-col flex-1"
          style={{ minHeight: 520 }}
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-xs text-[var(--color-text-disabled)] shrink-0">
            <span>{content.split("\n").length} lines</span>
            <span className="font-mono">{(new Blob([content]).size / 1024).toFixed(1)} KB</span>
          </div>
          <div className="flex-1" style={{ minHeight: 480 }}>
            <MonacoEditor
              height="480px"
              defaultLanguage="json"
              value={content}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
