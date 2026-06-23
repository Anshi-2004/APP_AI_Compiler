// App-wide constants

export const APP_NAME = "CompilerAI";
export const APP_TAGLINE = "Natural Language → Working Application";

export const PIPELINE_STAGES = [
  {
    id: "intent" as const,
    label: "Intent Extraction",
    description: "Parse natural language into structured intent",
    icon: "Sparkles",
  },
  {
    id: "design" as const,
    label: "System Design",
    description: "Generate architecture and component graph",
    icon: "Layers",
  },
  {
    id: "schema" as const,
    label: "Schema Generation",
    description: "Produce UI, API, DB, and Auth schemas",
    icon: "FileJson",
  },
  {
    id: "validation" as const,
    label: "Validation",
    description: "Cross-layer validation and constraint checks",
    icon: "ShieldCheck",
  },
  {
    id: "repair" as const,
    label: "Repair Engine",
    description: "Auto-fix schema errors and mismatches",
    icon: "Wrench",
  },
  {
    id: "runtime" as const,
    label: "Runtime",
    description: "Execute and generate the application files",
    icon: "Zap",
  },
] as const;

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const MAX_PROMPT_LENGTH = 4000;

export const SCHEMA_TABS = [
  { id: "ui" as const, label: "UI Schema" },
  { id: "api" as const, label: "API Schema" },
  { id: "database" as const, label: "Database Schema" },
  { id: "auth" as const, label: "Authentication" },
  { id: "businessLogic" as const, label: "Business Logic" },
] as const;
