// ─────────────────────────────────────────────────────────
// Shared Pipeline Types
// ─────────────────────────────────────────────────────────

export type PipelineStageId =
  | "intent"
  | "design"
  | "schema"
  | "validation"
  | "repair"
  | "runtime";

export type StageStatus = "idle" | "pending" | "running" | "success" | "error" | "warning";

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  description: string;
  status: StageStatus;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  output?: any;
}

export interface PipelineRun {
  id: string;
  projectId: string;
  prompt: string;
  createdAt: string;
  completedAt?: string;
  status: StageStatus;
  stages: Record<PipelineStageId, PipelineStage>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  lastRunId?: string;
  status: StageStatus;
}

// ─────────────────────────────────────────────────────────
// Intent Extraction Types (Phase 2 placeholder)
// ─────────────────────────────────────────────────────────

export interface IntentResult {
  entities: string[];
  actions: string[];
  constraints: string[];
  appType: string;
  confidence: number;
}

// ─────────────────────────────────────────────────────────
// System Design Types (Phase 3 placeholder)
// ─────────────────────────────────────────────────────────

export interface SystemDesignNode {
  id: string;
  type: "service" | "database" | "api" | "ui" | "auth";
  label: string;
  x: number;
  y: number;
}

export interface SystemDesignEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SystemDesignResult {
  nodes: SystemDesignNode[];
  edges: SystemDesignEdge[];
}

// ─────────────────────────────────────────────────────────
// Schema Types (Phase 4 placeholder)
// ─────────────────────────────────────────────────────────

export type SchemaTabId = "ui" | "api" | "database" | "auth" | "businessLogic";

export interface GeneratedSchemas {
  ui: Record<string, unknown>;
  api: Record<string, unknown>;
  database: Record<string, unknown>;
  auth: Record<string, unknown>;
  businessLogic: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────
// Validation Types (Phase 5 placeholder)
// ─────────────────────────────────────────────────────────

export type ValidationSeverity = "pass" | "warning" | "error";

export interface ValidationCheck {
  id: string;
  rule: string;
  severity: ValidationSeverity;
  message: string;
  layer: "ui" | "api" | "database" | "auth" | "cross-layer";
  field?: string;
}

export interface ValidationReport {
  totalChecks: number;
  passed: number;
  warnings: number;
  errors: number;
  checks: ValidationCheck[];
}

// ─────────────────────────────────────────────────────────
// Repair Types (Phase 6 placeholder)
// ─────────────────────────────────────────────────────────

export interface RepairAction {
  id: string;
  errorId: string;
  description: string;
  original: string;
  repaired: string;
  applied: boolean;
}

export interface RepairReport {
  totalErrors: number;
  repaired: number;
  failed: number;
  actions: RepairAction[];
}

// ─────────────────────────────────────────────────────────
// Runtime Types (Phase 7 placeholder)
// ─────────────────────────────────────────────────────────

export interface RuntimeFile {
  path: string;
  type: "page" | "api" | "component" | "schema" | "config";
  size?: number;
}

export interface RuntimeResult {
  files: RuntimeFile[];
  pages: string[];
  apis: string[];
  databases: string[];
  status: StageStatus;
  executionTimeMs?: number;
  build_logs?: string[];
  preview_url?: string | null;
}

// ─────────────────────────────────────────────────────────
// Evaluation Types (Phase 8 placeholder)
// ─────────────────────────────────────────────────────────

export interface EvaluationMetrics {
  successRate: number;
  avgLatencyMs: number;
  totalRetries: number;
  failures: number;
  repairPercent: number;
  tokenCost: number;
}
