"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  Database,
  Globe,
  Layers,
  Shield,
  Code2,
  GitBranch,
  Clock,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Severity = "pass" | "warning" | "error";
type Section = "ui" | "api" | "database" | "auth" | "business_logic";

interface ValidationCheck {
  id: string;
  rule: string;
  category: string;
  severity: Severity;
  message: string;
  layer: string;
  field?: string;
  suggestion?: string;
}

interface CategoryResult {
  category: string;
  total: number;
  passed: number;
  warnings: number;
  errors: number;
  checks: ValidationCheck[];
}

interface RepairRecord {
  id: string;
  section: Section;
  error: string;
  repair_reason: string;
  original_json: Record<string, unknown>;
  updated_json: Record<string, unknown>;
  repair_time_ms: number;
  success: boolean;
  error_count: number;
  errors_fixed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES: CategoryResult[] = [
  {
    category: "json", total: 18, passed: 18, warnings: 0, errors: 0,
    checks: [
      { id: "j1", rule: "required_section_present", category: "json", severity: "pass", message: "Section 'ui' present", layer: "cross-layer" },
      { id: "j2", rule: "required_section_present", category: "json", severity: "pass", message: "Section 'api' present", layer: "cross-layer" },
      { id: "j3", rule: "list_not_empty", category: "json", severity: "pass", message: "'api.endpoints' has 12 items", layer: "api" },
    ],
  },
  {
    category: "ui", total: 14, passed: 11, warnings: 2, errors: 1,
    checks: [
      { id: "u1", rule: "page_has_valid_route", category: "ui", severity: "error", message: "Page 'Admin Panel' route '' INVALID or missing", layer: "ui", field: "comp-admin", suggestion: "Page routes must start with '/'" },
      { id: "u2", rule: "no_duplicate_routes", category: "ui", severity: "pass", message: "Route '/dashboard' is unique", layer: "ui" },
      { id: "u3", rule: "page_has_access_control", category: "ui", severity: "warning", message: "Page 'Checkout' accessible_to: UNDEFINED", layer: "ui", suggestion: "Define accessible_to roles or add 'public'" },
      { id: "u4", rule: "has_layout_component", category: "ui", severity: "pass", message: "UI schema has a layout component", layer: "ui" },
    ],
  },
  {
    category: "api", total: 22, passed: 19, warnings: 3, errors: 0,
    checks: [
      { id: "a1", rule: "endpoint_has_response_schema", category: "api", severity: "warning", message: "GET /api/v1/stats response schema MISSING", layer: "api", suggestion: "Add a response_body schema" },
      { id: "a2", rule: "valid_http_method", category: "api", severity: "pass", message: "POST /api/v1/orders — method valid", layer: "api" },
      { id: "a3", rule: "no_duplicate_endpoints", category: "api", severity: "pass", message: "POST:/api/v1/products unique", layer: "api" },
    ],
  },
  {
    category: "database", total: 16, passed: 12, warnings: 2, errors: 2,
    checks: [
      { id: "d1", rule: "table_has_primary_key", category: "database", severity: "error", message: "Table 'sessions' MISSING a primary key", layer: "database", suggestion: "Add a UUID primary key" },
      { id: "d2", rule: "has_audit_timestamp", category: "database", severity: "warning", message: "Table 'sessions' missing 'updated_at'", layer: "database" },
      { id: "d3", rule: "foreign_key_references_valid_table", category: "database", severity: "error", message: "FK 'orders.product_id' → 'products.id' REFERENCES UNKNOWN TABLE", layer: "database" },
      { id: "d4", rule: "snake_case_table_name", category: "database", severity: "pass", message: "Table 'pipeline_runs' naming valid", layer: "database" },
    ],
  },
  {
    category: "cross_layer", total: 10, passed: 9, warnings: 1, errors: 0,
    checks: [
      { id: "c1", rule: "ui_role_in_auth_schema", category: "cross_layer", severity: "pass", message: "UI role 'admin' defined in auth schema", layer: "cross-layer" },
      { id: "c2", rule: "role_has_permissions", category: "cross_layer", severity: "warning", message: "Role 'moderator' MISSING permissions", layer: "cross-layer", suggestion: "Define permissions for role 'moderator'" },
    ],
  },
  {
    category: "logical", total: 8, passed: 8, warnings: 0, errors: 0,
    checks: [
      { id: "l1", rule: "admin_role_exists", category: "logical", severity: "pass", message: "Admin role found in auth schema", layer: "auth" },
      { id: "l2", rule: "valid_token_expiry_format", category: "logical", severity: "pass", message: "Token expiry '7d' valid", layer: "auth" },
    ],
  },
];

const MOCK_REPAIRS: RepairRecord[] = [
  {
    id: "r001",
    section: "ui",
    error: "Page 'Admin Panel' route '' INVALID or missing",
    repair_reason: "Regenerating 'ui' schema to fix 1 validation error: page_has_valid_route",
    original_json: { id: "comp-admin", name: "Admin Panel", type: "page", route: "", accessible_to: ["admin"] },
    updated_json: { id: "comp-admin", name: "Admin Panel", type: "page", route: "/admin", accessible_to: ["admin"] },
    repair_time_ms: 1240,
    success: true,
    error_count: 1,
    errors_fixed: 1,
  },
  {
    id: "r002",
    section: "database",
    error: "Table 'sessions' MISSING a primary key; FK 'orders.product_id' references unknown table",
    repair_reason: "Regenerating 'database' schema to fix 2 validation errors: table_has_primary_key, foreign_key_references_valid_table",
    original_json: { name: "sessions", fields: [{ name: "token", type: "text" }] },
    updated_json: { name: "sessions", fields: [{ name: "id", type: "uuid", primary_key: true }, { name: "token", type: "text" }, { name: "created_at", type: "timestamp" }, { name: "updated_at", type: "timestamp" }] },
    repair_time_ms: 2890,
    success: true,
    error_count: 2,
    errors_fixed: 2,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Category config
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  json:        { label: "JSON",          icon: Code2,    color: "text-purple-400" },
  ui:          { label: "UI",            icon: Layers,   color: "text-blue-400" },
  api:         { label: "API",           icon: Globe,    color: "text-cyan-400" },
  database:    { label: "Database",      icon: Database, color: "text-amber-400" },
  cross_layer: { label: "Cross-Layer",   icon: GitBranch,color: "text-pink-400" },
  logical:     { label: "Logical",       icon: Zap,      color: "text-emerald-400" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const styles = {
    pass:    "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    error:   "bg-red-500/10 border-red-500/20 text-red-400",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#34d399" : score >= 70 ? "#fbbf24" : "#f87171";

  return (
    <svg width="64" height="64" className="rotate-[-90deg]">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={r}
        fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x="32" y="36" textAnchor="middle"
        fill={color} fontSize="12" fontWeight="700"
        style={{ transform: "rotate(90deg)", transformOrigin: "32px 32px" }}
      >
        {score}
      </text>
    </svg>
  );
}

function CategoryCard({ cat, onClick, active }: {
  cat: CategoryResult;
  onClick: () => void;
  active: boolean;
}) {
  const meta = CATEGORY_META[cat.category];
  const Icon = meta.icon;
  const hasErrors = cat.errors > 0;
  const hasWarnings = cat.warnings > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        active
          ? "bg-[var(--color-brand-500)]/10 border-[var(--color-brand-500)]/40"
          : "bg-[var(--color-surface-1)] border-white/[0.06] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">{meta.label}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{cat.total} checks</div>
        </div>
        {hasErrors ? (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        ) : hasWarnings ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
      </div>
      <div className="flex gap-2">
        {cat.errors > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">{cat.errors} errors</span>}
        {cat.warnings > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{cat.warnings} warnings</span>}
        {cat.errors === 0 && cat.warnings === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">All passed</span>}
      </div>
    </button>
  );
}

function CheckRow({ check }: { check: ValidationCheck }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-lg border overflow-hidden ${
      check.severity === "error" ? "border-red-500/20 bg-red-500/5" :
      check.severity === "warning" ? "border-amber-500/20 bg-amber-500/5" :
      "border-white/[0.05] bg-white/[0.02]"
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <SeverityBadge severity={check.severity} />
        <span className="flex-1 text-sm text-[var(--color-text-primary)]">{check.message}</span>
        <span className="text-[10px] font-mono text-[var(--color-text-disabled)] shrink-0">{check.rule}</span>
        {check.suggestion && (open ? <ChevronUp className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />)}
      </button>
      <AnimatePresence>
        {open && check.suggestion && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.05] px-4 py-3"
          >
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-brand-400)] mt-0.5 shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)]">{check.suggestion}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RepairCard({ record }: { record: RepairRecord }) {
  const [open, setOpen] = useState(false);

  const sectionMeta = {
    ui: { icon: Layers, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    api: { icon: Globe, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
    database: { icon: Database, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    auth: { icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    business_logic: { icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  }[record.section] ?? { icon: Wrench, color: "text-white", bg: "bg-white/10 border-white/20" };

  const Icon = sectionMeta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${sectionMeta.bg}`}>
          <Icon className={`w-4 h-4 ${sectionMeta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-semibold uppercase tracking-wider ${sectionMeta.color}`}>{record.section.replace("_", " ")}</span>
            <span className="text-[10px] text-[var(--color-text-disabled)] font-mono">#{record.id.slice(0, 8)}</span>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] truncate">{record.repair_reason}</div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs font-semibold text-emerald-400">{record.errors_fixed}/{record.error_count} fixed</div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-disabled)]">
              <Clock className="w-3 h-3" />
              {record.repair_time_ms}ms
            </div>
          </div>
          {record.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
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
              {/* Error */}
              <div>
                <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" /> Validation Error
                </div>
                <div className="rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2.5 font-mono text-xs text-red-300">
                  {record.error}
                </div>
              </div>

              {/* Repair Reason */}
              <div>
                <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-brand-400)]" /> Repair Strategy
                </div>
                <div className="rounded-lg bg-[var(--color-brand-500)]/5 border border-[var(--color-brand-500)]/20 px-3 py-2.5 text-xs text-[var(--color-brand-300)]">
                  {record.repair_reason}
                </div>
              </div>

              {/* JSON Diff */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Original JSON
                  </div>
                  <div className="rounded-lg overflow-hidden border border-white/[0.06] h-40">
                    <MonacoEditor
                      height="160px"
                      defaultLanguage="json"
                      value={JSON.stringify(record.original_json, null, 2)}
                      theme="vs-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 11, lineNumbers: "off", scrollBeyondLastLine: false, wordWrap: "on" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Repaired JSON
                  </div>
                  <div className="rounded-lg overflow-hidden border border-white/[0.06] h-40">
                    <MonacoEditor
                      height="160px"
                      defaultLanguage="json"
                      value={JSON.stringify(record.updated_json, null, 2)}
                      theme="vs-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 11, lineNumbers: "off", scrollBeyondLastLine: false, wordWrap: "on" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RepairPage() {
  const [activeCategory, setActiveCategory] = useState<string>("ui");
  const [tab, setTab] = useState<"validation" | "repairs">("validation");

  const totalChecks = MOCK_CATEGORIES.reduce((s, c) => s + c.total, 0);
  const totalPassed = MOCK_CATEGORIES.reduce((s, c) => s + c.passed, 0);
  const totalErrors = MOCK_CATEGORIES.reduce((s, c) => s + c.errors, 0);
  const totalWarnings = MOCK_CATEGORIES.reduce((s, c) => s + c.warnings, 0);
  const score = Math.round((totalPassed / totalChecks) * 100);

  const activeChecks = MOCK_CATEGORIES.find(c => c.category === activeCategory)?.checks ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Wrench}
        title="Validation & Repair Engine"
        description="Six-layer schema validation with targeted LLM-powered section repair"
        badge={<StatusBadge status={totalErrors === 0 ? "success" : "warning"} label={`Score: ${score}/100`} />}
      />

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Checks", value: totalChecks, color: "text-[var(--color-text-primary)]", bg: "bg-[var(--color-surface-1)] border-white/[0.06]" },
          { label: "Passed", value: totalPassed, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Warnings", value: totalWarnings, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Errors", value: totalErrors, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`p-4 rounded-xl border ${card.bg}`}
          >
            <div className="text-xs text-[var(--color-text-muted)] mb-1">{card.label}</div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Validation Score Ring + Repair Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] flex items-center gap-5"
        >
          <ScoreRing score={score} />
          <div>
            <div className="text-lg font-bold text-[var(--color-text-primary)]">Validation Score</div>
            <div className="text-sm text-[var(--color-text-muted)]">
              {totalPassed} of {totalChecks} checks passed across 6 categories
            </div>
            {totalErrors === 0 && <div className="text-xs text-emerald-400 mt-1">✓ No critical errors detected</div>}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06]"
        >
          <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Repair Summary</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-red-400">{MOCK_REPAIRS.reduce((s, r) => s + r.error_count, 0)}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Errors Found</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{MOCK_REPAIRS.reduce((s, r) => s + r.errors_fixed, 0)}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Fixed by LLM</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--color-brand-400)]">{MOCK_REPAIRS.length}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Sections Repaired</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--color-surface-1)] border border-white/[0.06] rounded-xl w-fit">
        {(["validation", "repairs"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-[var(--color-brand-500)] text-white"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t === "validation" ? "Validation Results" : "Repair History"}
          </button>
        ))}
      </div>

      {tab === "validation" ? (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Category list */}
          <div className="space-y-2">
            {MOCK_CATEGORIES.map(cat => (
              <CategoryCard
                key={cat.category}
                cat={cat}
                active={activeCategory === cat.category}
                onClick={() => setActiveCategory(cat.category)}
              />
            ))}
          </div>

          {/* Check detail */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              {(() => {
                const meta = CATEGORY_META[activeCategory];
                const Icon = meta.icon;
                return <Icon className={`w-4 h-4 ${meta.color}`} />;
              })()}
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {CATEGORY_META[activeCategory].label} Checks
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-2"
              >
                {activeChecks.map(check => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {MOCK_REPAIRS.map(record => (
            <RepairCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
