"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Globe,
  Layers,
  Shield,
  Zap,
  Wrench,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/shared/PageHeader";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Section = "ui" | "api" | "database" | "auth" | "business_logic";

interface RepairRecord {
  id: string;
  run_id: string;
  section: Section;
  error: string;
  repair_reason: string;
  original_json: Record<string, unknown>;
  updated_json: Record<string, unknown>;
  repair_time_ms: number;
  success: boolean;
  error_count: number;
  errors_fixed: number;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock history data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_HISTORY: RepairRecord[] = [
  {
    id: "r-aabb1122",
    run_id: "run-01",
    section: "database",
    error: "Table 'sessions' MISSING a primary key",
    repair_reason: "Regenerating 'database' schema to fix 2 validation errors: table_has_primary_key, foreign_key_references_valid_table",
    original_json: { name: "sessions", fields: [{ name: "token", type: "text" }] },
    updated_json: { name: "sessions", fields: [{ name: "id", type: "uuid", primary_key: true }, { name: "token", type: "text" }, { name: "created_at", type: "timestamp" }, { name: "updated_at", type: "timestamp" }] },
    repair_time_ms: 2890,
    success: true,
    error_count: 2,
    errors_fixed: 2,
    created_at: "2025-06-21T16:42:10Z",
  },
  {
    id: "r-ccdd3344",
    run_id: "run-01",
    section: "ui",
    error: "Page 'Admin Panel' route '' INVALID or missing",
    repair_reason: "Regenerating 'ui' schema to fix 1 validation error: page_has_valid_route",
    original_json: { id: "comp-admin", name: "Admin Panel", type: "page", route: "", accessible_to: ["admin"] },
    updated_json: { id: "comp-admin", name: "Admin Panel", type: "page", route: "/admin", accessible_to: ["admin"] },
    repair_time_ms: 1240,
    success: true,
    error_count: 1,
    errors_fixed: 1,
    created_at: "2025-06-21T16:42:22Z",
  },
  {
    id: "r-eeff5566",
    run_id: "run-02",
    section: "api",
    error: "GET /api/v1/stats missing response_body; POST /api/v1/checkout has duplicate path",
    repair_reason: "Regenerating 'api' schema to fix 2 errors: endpoint_has_response_schema, no_duplicate_endpoints",
    original_json: { method: "GET", path: "/api/v1/stats", response_body: null },
    updated_json: { method: "GET", path: "/api/v1/stats", response_body: { total_sales: "number", total_orders: "number" } },
    repair_time_ms: 3150,
    success: true,
    error_count: 2,
    errors_fixed: 2,
    created_at: "2025-06-21T15:30:05Z",
  },
  {
    id: "r-aabb9900",
    run_id: "run-02",
    section: "auth",
    error: "Role 'moderator' undefined in auth schema — referenced by UI component",
    repair_reason: "Regenerating 'auth' schema to fix 1 cross-layer error: ui_role_in_auth_schema",
    original_json: { roles: ["admin", "customer"] },
    updated_json: { roles: ["admin", "customer", "moderator"], role_permissions: { moderator: ["read", "update"] } },
    repair_time_ms: 1780,
    success: true,
    error_count: 1,
    errors_fixed: 1,
    created_at: "2025-06-21T15:30:17Z",
  },
  {
    id: "r-ffee1100",
    run_id: "run-03",
    section: "business_logic",
    error: "Rule 'checkout-flow' missing trigger field",
    repair_reason: "Regenerating 'business_logic' to fix 1 logical error: business_rule_complete",
    original_json: { id: "checkout-flow", name: "Checkout Validation", condition: "cart.total > 0", trigger: "" },
    updated_json: { id: "checkout-flow", name: "Checkout Validation", trigger: "before order creation", condition: "cart.total > 0 AND cart.items.length > 0", action: "Validate stock availability and payment method" },
    repair_time_ms: 2100,
    success: false,
    error_count: 1,
    errors_fixed: 0,
    created_at: "2025-06-21T14:15:40Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section meta
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_META: Record<Section, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  ui:             { icon: Layers,   color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/25",    label: "UI Schema" },
  api:            { icon: Globe,    color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/25",    label: "API Schema" },
  database:       { icon: Database, color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25",  label: "Database Schema" },
  auth:           { icon: Shield,   color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/25",label: "Auth Schema" },
  business_logic: { icon: Zap,      color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25",label: "Business Logic" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06]">
      <div className="text-xs text-[var(--color-text-muted)] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--color-text-disabled)] mt-0.5">{sub}</div>}
    </div>
  );
}

function TimelineConnector({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px flex-1 bg-white/[0.08]" />
      {!isLast && <div className="w-px h-4 bg-white/[0.06]" />}
    </div>
  );
}

function HistoryRow({ record, index }: { record: RepairRecord; index: number }) {
  const [open, setOpen] = useState(false);
  const meta = SECTION_META[record.section];
  const Icon = meta.icon;

  const dateStr = new Date(record.created_at).toLocaleString("en-IN", {
    dateStyle: "medium", timeStyle: "short",
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-4"
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-4">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${meta.bg}`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="w-px flex-1 mt-2 bg-white/[0.06]" />
      </div>

      {/* Card */}
      <div className="flex-1 pb-4">
        <div className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-disabled)]">
                  #{record.id.slice(0, 8)}
                </span>
                <span className="text-[10px] text-[var(--color-text-disabled)]">
                  run:{record.run_id}
                </span>
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] truncate">{record.error}</div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className={`text-xs font-semibold ${record.success ? "text-emerald-400" : "text-red-400"}`}>
                  {record.success ? `${record.errors_fixed} fixed` : "Failed"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-disabled)]">
                  <Clock className="w-3 h-3" /> {record.repair_time_ms}ms
                </div>
                <div className="text-[10px] text-[var(--color-text-disabled)]">{dateStr}</div>
              </div>
              {record.success
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : <XCircle className="w-5 h-5 text-red-400" />
              }
              {open ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
            </div>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/[0.06]"
              >
                <div className="p-5 space-y-4">
                  {/* Repair Reason */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-brand-500)]/5 border border-[var(--color-brand-500)]/20">
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--color-brand-400)] mt-0.5 shrink-0" />
                    <p className="text-xs text-[var(--color-brand-300)]">{record.repair_reason}</p>
                  </div>

                  {/* JSON Diff */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Original JSON
                      </div>
                      <div className="rounded-lg overflow-hidden border border-white/[0.06] h-36">
                        <MonacoEditor
                          height="144px"
                          defaultLanguage="json"
                          value={JSON.stringify(record.original_json, null, 2)}
                          theme="vs-dark"
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 11, lineNumbers: "off", scrollBeyondLastLine: false, wordWrap: "on", padding: { top: 6, bottom: 6 } }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full inline-block ${record.success ? "bg-emerald-500" : "bg-red-500"}`} />
                        {record.success ? "Repaired JSON" : "Repair Failed"}
                      </div>
                      <div className="rounded-lg overflow-hidden border border-white/[0.06] h-36">
                        <MonacoEditor
                          height="144px"
                          defaultLanguage="json"
                          value={record.success ? JSON.stringify(record.updated_json, null, 2) : "// Repair failed — manual fix required"}
                          theme="vs-dark"
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 11, lineNumbers: "off", scrollBeyondLastLine: false, wordWrap: "on", padding: { top: 6, bottom: 6 } }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metadata footer */}
                  <div className="flex items-center gap-4 pt-1 text-[10px] text-[var(--color-text-disabled)] border-t border-white/[0.04] pt-3">
                    <span>Repair ID: <span className="font-mono">{record.id}</span></span>
                    <span>Run: <span className="font-mono">{record.run_id}</span></span>
                    <span>Duration: {record.repair_time_ms}ms</span>
                    <span>Errors: {record.errors_fixed}/{record.error_count} fixed</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type FilterSection = "all" | Section;

export default function RepairHistoryPage() {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<FilterSection>("all");
  const [successFilter, setSuccessFilter] = useState<"all" | "success" | "failed">("all");

  const filtered = MOCK_HISTORY.filter(r => {
    const matchSection = sectionFilter === "all" || r.section === sectionFilter;
    const matchSuccess = successFilter === "all" || (successFilter === "success" ? r.success : !r.success);
    const matchSearch = !search || r.error.toLowerCase().includes(search.toLowerCase()) || r.section.includes(search.toLowerCase());
    return matchSection && matchSuccess && matchSearch;
  });

  const totalFixed = MOCK_HISTORY.reduce((s, r) => s + r.errors_fixed, 0);
  const totalErrors = MOCK_HISTORY.reduce((s, r) => s + r.error_count, 0);
  const successRate = Math.round((MOCK_HISTORY.filter(r => r.success).length / MOCK_HISTORY.length) * 100);
  const avgTime = Math.round(MOCK_HISTORY.reduce((s, r) => s + r.repair_time_ms, 0) / MOCK_HISTORY.length);

  const sections: FilterSection[] = ["all", "ui", "api", "database", "auth", "business_logic"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={History}
        title="Repair History"
        description="Complete audit trail of every LLM-powered section repair across all pipeline runs"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Repairs" value={MOCK_HISTORY.length} color="text-[var(--color-text-primary)]" />
        <StatCard label="Errors Fixed" value={totalFixed} sub={`of ${totalErrors} errors`} color="text-emerald-400" />
        <StatCard label="Success Rate" value={`${successRate}%`} color="text-[var(--color-brand-400)]" />
        <StatCard label="Avg Repair Time" value={`${avgTime}ms`} color="text-amber-400" />
      </div>

      {/* Section breakdown bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-4 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06]"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[var(--color-brand-400)]" />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Repairs by Section</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["ui", "api", "database", "auth", "business_logic"] as Section[]).map(sec => {
            const count = MOCK_HISTORY.filter(r => r.section === sec).length;
            const meta = SECTION_META[sec];
            const Icon = meta.icon;
            return (
              <div key={sec} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${meta.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                <span className={`text-xs font-medium ${meta.color}`}>{sec.replace("_", " ")}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by error, section..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-brand-500)]/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {sections.map(sec => (
            <button
              key={sec}
              onClick={() => setSectionFilter(sec)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                sectionFilter === sec
                  ? "bg-[var(--color-brand-500)] border-[var(--color-brand-500)] text-white"
                  : "bg-[var(--color-surface-1)] border-white/[0.06] text-[var(--color-text-muted)] hover:border-white/[0.12]"
              }`}
            >
              {sec === "all" ? "All Sections" : sec.replace("_", " ")}
            </button>
          ))}
          <select
            value={successFilter}
            onChange={e => setSuccessFilter(e.target.value as typeof successFilter)}
            className="px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-1)] border border-white/[0.06] text-[var(--color-text-muted)] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="success">Succeeded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <div className="text-xs text-[var(--color-text-muted)]">
        Showing {filtered.length} of {MOCK_HISTORY.length} repair records
      </div>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div className="space-y-0">
          {filtered.map((record, i) => (
            <HistoryRow key={record.id} record={record} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No repair records match your filters</p>
        </div>
      )}
    </div>
  );
}
