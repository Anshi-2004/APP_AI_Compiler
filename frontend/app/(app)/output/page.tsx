"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { FileJson, Copy, Download, Check } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { mockGeneratedSchemas } from "@/lib/mock-data";
import { SCHEMA_TABS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SchemaTabId } from "@/types/pipeline";

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

export default function OutputPage() {
  const [activeTab, setActiveTab] = useState<SchemaTabId>("ui");
  const [copied, setCopied] = useState(false);
  const { activeRun } = useCompilerStore();

  const runSchemas = activeRun?.stages?.schema?.output;

  // Normalize key names: map business_logic (from backend) to businessLogic (expected by frontend)
  const schemas = runSchemas
    ? {
        ui: runSchemas.ui ?? {},
        api: runSchemas.api ?? {},
        database: runSchemas.database ?? {},
        auth: runSchemas.auth ?? {},
        businessLogic: runSchemas.business_logic ?? runSchemas.businessLogic ?? {},
      }
    : mockGeneratedSchemas;

  const content = JSON.stringify(
    schemas[activeTab],
    null,
    2
  );

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
    a.download = `${activeTab}-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 flex flex-col h-full">
      <PageHeader
        icon={FileJson}
        title="Generated Output"
        description="All schemas produced by the compilation pipeline"
        actions={
          <div className="flex items-center gap-2">
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

      {/* Editor panel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden flex flex-col"
        style={{ minHeight: 540 }}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-white/[0.06] overflow-x-auto">
          {SCHEMA_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-px",
                activeTab === tab.id
                  ? "text-[var(--color-brand-400)] border-[var(--color-brand-400)] bg-[var(--color-brand-500)]/5"
                  : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)] hover:bg-white/[0.02]"
              )}
            >
              {tab.label}
            </button>
          ))}

          {/* Line count */}
          <div className="ml-auto px-4 flex items-center gap-3 text-xs text-[var(--color-text-disabled)] shrink-0">
            <span>{content.split("\n").length} lines</span>
            <span className="font-mono">{(new Blob([content]).size / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1" style={{ minHeight: 480 }}>
          <MonacoEditor
            key={activeTab}
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
              renderLineHighlight: "line",
              smoothScrolling: true,
              cursorSmoothCaretAnimation: "on",
              folding: true,
            }}
          />
        </div>
      </motion.div>

      {/* Schema summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {SCHEMA_TABS.map((tab) => {
          const data = schemas[tab.id] as Record<string, unknown>;
          const keys = data ? Object.keys(data).length : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "p-3 rounded-xl text-left border transition-all",
                activeTab === tab.id
                  ? "bg-[var(--color-brand-500)]/10 border-[var(--color-brand-500)]/30"
                  : "bg-[var(--color-surface-1)] border-white/[0.06] hover:border-white/[0.1]"
              )}
            >
              <div className={cn("text-xs font-medium mb-0.5", activeTab === tab.id ? "text-[var(--color-brand-400)]" : "text-[var(--color-text-secondary)]")}>
                {tab.label}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                {keys} {keys === 1 ? "key" : "keys"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
