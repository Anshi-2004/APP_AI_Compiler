"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Sparkles, Copy, Download, Check, Database, Users, Layout, Shield, FileText } from "lucide-react";
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

const mockIntentData = {
  project_type: "saas",
  project_name: "ShopAI",
  description: "A modern e-commerce platform with Stripe payments",
  modules: ["Products", "Cart", "Orders", "Auth", "Admin"],
  features: ["Stripe checkout", "Product search", "Admin dashboard"],
  entities: [
    { name: "User", fields: ["id", "email", "password_hash"], relationships: ["has many Orders"] },
    { name: "Product", fields: ["id", "name", "price", "stock"], relationships: ["belongs to Category"] },
    { name: "Order", fields: ["id", "user_id", "total", "status"], relationships: ["belongs to User"] },
  ],
  roles: [
    { name: "admin", permissions: ["create", "read", "update", "delete"] },
    { name: "customer", permissions: ["read", "create:order", "read:own-orders"] },
  ],
  pages: [
    { name: "Product Listing", route: "/products", accessible_to: ["customer", "guest"] },
    { name: "Admin Dashboard", route: "/admin", accessible_to: ["admin"] },
    { name: "Checkout", route: "/checkout", accessible_to: ["customer"] },
  ],
  auth: { required: true, strategies: ["email-password"], session_type: "jwt" },
  business_rules: [
    { id: "rule-001", description: "Stock must be > 0 before checkout", applies_to: "api" },
  ],
  assumptions: ["Stripe is configured with live keys", "Email notifications via SendGrid"],
  confidence: 0.95,
};

export default function IntentPage() {
  const [activeView, setActiveView] = useState<"structured" | "raw">("structured");
  const [copied, setCopied] = useState(false);
  const { activeRun } = useCompilerStore();

  const runIntent = activeRun?.stages?.intent?.output;
  const intent = runIntent || mockIntentData;
  const content = JSON.stringify(intent, null, 2);

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
    a.download = `extracted-intent.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 flex flex-col h-full">
      <PageHeader
        icon={Sparkles}
        title="Intent Extraction"
        description="Extracted project scopes, modules, entities, pages, and constraints from the prompt"
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
          {/* Left Column: Scope & Meta */}
          <div className="space-y-6">
            {/* Summary card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Project Metadata</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)] block mb-0.5">Project Name</span>
                  <span className="text-[var(--color-text-secondary)] font-medium text-sm">{intent.project_name}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block mb-0.5">Type</span>
                  <span className="inline-flex px-2 py-0.5 bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)] rounded-full font-semibold uppercase text-[10px]">
                    {intent.project_type}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block mb-0.5">Description</span>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">{intent.description}</p>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                  <span className="text-[var(--color-text-muted)]">LLM Confidence</span>
                  <span className="font-mono text-emerald-400 font-bold">{(intent.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </motion.div>

            {/* Modules and Features */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Modules & Features</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[var(--color-text-muted)] text-xs block">Modules</span>
                  <div className="flex flex-wrap gap-1.5">
                    {intent.modules.map((m: any) => (
                      <span key={m} className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-[var(--color-text-secondary)]">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                  <span className="text-[var(--color-text-muted)] text-xs block">Core Features</span>
                  <div className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                    {intent.features.map((f: any, i: number) => (
                      <div key={f} className="flex items-start gap-2">
                        <span className="text-[var(--color-text-disabled)] mt-0.5">•</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Authentication Config */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-400" /> Authentication
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Enabled</span>
                  <span className={intent.auth.required ? "text-emerald-400 font-semibold" : "text-[var(--color-text-disabled)]"}>
                    {intent.auth.required ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Session Type</span>
                  <span className="text-[var(--color-text-secondary)] uppercase">{intent.auth.session_type}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block mb-1">Auth Strategies</span>
                  <div className="flex flex-wrap gap-1">
                    {intent.auth.strategies.map((s: any) => (
                      <span key={s} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] text-purple-300 uppercase">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right 2 Columns: Entities, Roles, Pages, Rules */}
          <div className="md:col-span-2 space-y-6">
            {/* Database Entities */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" /> Extracted Entities
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {intent.entities.map((entity: any) => (
                  <div key={entity.name} className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{entity.name}</span>
                      <span className="text-[10px] text-[var(--color-text-disabled)]">{entity.fields.length} fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entity.fields.map((f: any) => (
                        <span key={f} className="px-2 py-0.5 bg-white/[0.04] text-[var(--color-text-muted)] rounded text-[10px]">
                          {f}
                        </span>
                      ))}
                    </div>
                    {entity.relationships.length > 0 && (
                      <div className="text-[10px] text-[var(--color-text-muted)] pt-2 border-t border-white/[0.04] space-y-0.5">
                        <span className="font-bold">Relationships:</span>
                        {entity.relationships.map((rel: any) => (
                          <div key={rel} className="italic">{rel}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Roles & Permissions */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" /> User Roles & Access Control
              </h3>
              <div className="space-y-3">
                {intent.roles.map((role: any) => (
                  <div key={role.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg gap-2 text-xs">
                    <span className="font-semibold text-[var(--color-text-secondary)] capitalize w-24">{role.name}</span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {role.permissions.map((p: any) => (
                        <span key={p} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded font-mono text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Navigation Pages */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-4"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Layout className="w-4 h-4 text-blue-400" /> Planned App Pages
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[var(--color-text-muted)]">
                      <th className="py-2 font-semibold">Page Name</th>
                      <th className="py-2 font-semibold">Target Route</th>
                      <th className="py-2 font-semibold">Accessible To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {intent.pages.map((page: any) => (
                      <tr key={page.name}>
                        <td className="py-2.5 font-semibold text-[var(--color-text-secondary)]">{page.name}</td>
                        <td className="py-2.5 font-mono text-blue-400">{page.route}</td>
                        <td className="py-2.5">
                          <div className="flex gap-1.5">
                            {page.accessible_to.map((role: any) => (
                              <span key={role} className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-[var(--color-text-muted)]">
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Business Rules & Assumptions */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Business Rules */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-3"
              >
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" /> Business Rules
                </h3>
                <div className="space-y-2 text-xs">
                  {intent.business_rules.map((rule: any) => (
                    <div key={rule.id} className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)] mb-1">
                        <span className="font-mono">{rule.id}</span>
                        <span className="capitalize">Applies: {rule.applies_to}</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">{rule.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Assumptions */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] space-y-3"
              >
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Assumptions</h3>
                <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)] list-disc pl-4">
                  {intent.assumptions.map((ass: any, i: number) => (
                    <li key={i}>{ass}</li>
                  ))}
                </ul>
              </motion.div>
            </div>
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
