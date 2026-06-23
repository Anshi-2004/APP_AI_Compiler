"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, TrendingUp, Zap, XCircle, Wrench, DollarSign, RefreshCw,
  Play, Download, ChevronDown, CheckCircle, AlertTriangle, Award,
  FileText, Info
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatDuration } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/constants";

// Interfaces
interface EvaluationItem {
  id: string;
  run_id?: string;
  prompt_name: string;
  prompt_type: string;
  prompt_text: string;
  status: string;
  latency_ms: number;
  validation_errors: number;
  retries: number;
  repair_success: boolean;
  execution_success: boolean;
  token_cost: number;
  created_at: string;
}

interface EvaluationRun {
  id: string;
  name: string;
  status: string;
  created_at: string;
  completed_at?: string;
  total_runs: number;
  success_rate: number;
  avg_latency_ms: number;
  total_token_cost: number;
  items: EvaluationItem[];
}

interface EvaluationSummary {
  id: string;
  name: string;
  status: string;
  created_at: string;
  completed_at?: string;
  total_runs: number;
  success_rate: number;
  avg_latency_ms: number;
  total_token_cost: number;
}

// Generate Mock Fallback baseline run
const generateMockRun = (id: string, name: string): EvaluationRun => {
  const products = [
    { name: "CRM", text: "Build a CRM platform with contacts, deals, pipelines, interaction tracking..." },
    { name: "Hospital Management", text: "Build a hospital management system with patient records, doctor schedules..." },
    { name: "Library", text: "Build a library management system with book catalog, member registrations..." },
    { name: "HRMS", text: "Build an HR management system with employee profiles, attendance logs..." },
    { name: "Food Delivery", text: "Build a food delivery platform with customer ordering, menu management..." },
    { name: "Inventory", text: "Build an inventory management system with products, stock levels..." },
    { name: "LMS", text: "Build a learning management system with courses, lessons..." },
    { name: "Banking", text: "Build a core banking application with accounts, deposits..." },
    { name: "Fitness", text: "Build a fitness tracking app with workout plans, exercise logs..." },
    { name: "Project Management", text: "Build a project management platform with workspaces, task boards..." },
  ];
  const edgeCases = [
    { name: "Very Vague Prompt", text: "saas app that does things" },
    { name: "Conflicting Prompt", text: "Build an app where all pages are public guests only, but all pages require admin auth..." },
    { name: "Incomplete Prompt", text: "Build an application with database." },
    { name: "Impossible Requirements", text: "Build a secure bank database that runs entirely inside client local storage..." },
    { name: "Missing Authentication", text: "Build a clinical healthcare patient record management app but do not include auth..." },
    { name: "Duplicate Modules", text: "Build an app with Products module, Products module, Products module..." },
    { name: "Invalid JSON route", text: "Build an app where the home page route is empty string." },
    { name: "Circular DB dependencies", text: "Build a database where Table A has a foreign key to Table B, Table B to Table C..." },
    { name: "Empty Database Tables", text: "Build a blog platform with post and user tables but no columns inside tables." },
    { name: "Duplicate Endpoints", text: "Build an API that has two identical endpoints: GET /api/v1/users." },
  ];

  const items: EvaluationItem[] = [
    ...products.map((p, idx) => ({
      id: `mock-item-${idx}`,
      prompt_name: p.name,
      prompt_type: "product",
      prompt_text: p.text,
      status: "success",
      latency_ms: 12000 + Math.floor(Math.random() * 8000),
      validation_errors: 0,
      retries: 0,
      repair_success: true,
      execution_success: true,
      token_cost: 0.0012 + Math.random() * 0.0008,
      created_at: new Date().toISOString(),
    })),
    ...edgeCases.map((e, idx) => {
      // 3 failures in baseline simulation
      const failed = idx === 0 || idx === 3 || idx === 8;
      const retries = failed ? 3 : (idx % 2 === 0 ? 1 : 2);
      const repairSuccess = !failed;
      return {
        id: `mock-item-edge-${idx}`,
        prompt_name: e.name,
        prompt_type: "edge_case",
        prompt_text: e.text,
        status: failed ? "error" : "success",
        latency_ms: failed ? 8000 + Math.random() * 4000 : 16000 + Math.floor(Math.random() * 9000),
        validation_errors: failed ? 4 : (idx % 2 === 0 ? 1 : 2),
        retries: retries,
        repair_success: repairSuccess,
        execution_success: !failed,
        token_cost: 0.0022 + Math.random() * 0.0015,
        created_at: new Date().toISOString(),
      };
    })
  ];

  const total_latency = items.reduce((acc, curr) => acc + curr.latency_ms, 0);
  const total_cost = items.reduce((acc, curr) => acc + curr.token_cost, 0);
  const success_rate = (items.filter(i => i.status === "success").length / items.length) * 100;

  return {
    id,
    name,
    status: "success",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date().toISOString(),
    total_runs: items.length,
    success_rate,
    avg_latency_ms: total_latency / items.length,
    total_token_cost: total_cost,
    items,
  };
};

export default function EvaluationPage() {
  const [runs, setRuns] = useState<EvaluationSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("mock-baseline");
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeTab, setActiveTab] = useState<"latency" | "cost" | "categories">("latency");

  // Fetch runs list
  const fetchRuns = useCallback(async (selectNewest = false) => {
    try {
      setLoadingList(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/evaluation/runs`);
      const data = await res.json();
      
      const baselineSummary: EvaluationSummary = {
        id: "mock-baseline",
        name: "Mock Baseline Run",
        status: "success",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date().toISOString(),
        total_runs: 20,
        success_rate: 85.0,
        avg_latency_ms: 18500.0,
        total_token_cost: 0.0342,
      };

      if (data.success && data.data) {
        setRuns([baselineSummary, ...data.data]);
        if (data.data.length > 0 && selectNewest) {
          setSelectedRunId(data.data[0].id);
        }
      } else {
        setRuns([baselineSummary]);
      }
    } catch (err) {
      console.error("Failed to fetch evaluation runs, falling back to mock baseline:", err);
      setRuns([{
        id: "mock-baseline",
        name: "Mock Baseline Run (Offline)",
        status: "success",
        created_at: new Date().toISOString(),
        total_runs: 20,
        success_rate: 85.0,
        avg_latency_ms: 18500.0,
        total_token_cost: 0.0342,
      }]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Fetch run details
  const fetchDetails = useCallback(async (id: string) => {
    if (id === "mock-baseline") {
      setSelectedRun(generateMockRun("mock-baseline", "Mock Baseline Run"));
      return;
    }
    
    try {
      setLoadingDetails(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/evaluation/runs/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedRun(data.data);
      }
    } catch (err) {
      console.error(`Failed to fetch evaluation details for ${id}:`, err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Load details on selected run change
  useEffect(() => {
    if (selectedRunId) {
      fetchDetails(selectedRunId);
    }
  }, [selectedRunId, fetchDetails]);

  // Poll active runs
  useEffect(() => {
    if (!selectedRun || selectedRun.status !== "running") return;

    const interval = setInterval(() => {
      fetchDetails(selectedRun.id);
      // Refresh list to update completion status
      fetchRuns(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedRun, fetchDetails, fetchRuns]);

  // Trigger evaluation
  const handleTriggerRun = async () => {
    try {
      setIsTriggering(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/evaluation/run`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newId = data.data.id;
        setSelectedRunId(newId);
        await fetchRuns();
      }
    } catch (err) {
      console.error("Failed to trigger evaluation run:", err);
    } finally {
      setIsTriggering(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedRunId || selectedRunId === "mock-baseline") {
      alert("CSV export is not available for mock baseline data.");
      return;
    }
    window.open(`${API_BASE_URL}/api/v1/evaluation/export/csv/${selectedRunId}`);
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!selectedRunId || selectedRunId === "mock-baseline") {
      alert("PDF export is not available for mock baseline data.");
      return;
    }
    window.open(`${API_BASE_URL}/api/v1/evaluation/export/pdf/${selectedRunId}`);
  };

  // Computed metrics
  const items = selectedRun?.items || [];
  const successRate = selectedRun?.success_rate ?? 0;
  const avgLatency = selectedRun?.avg_latency_ms ?? 0;
  const totalCost = selectedRun?.total_token_cost ?? 0;
  const completedRunsCount = items.length;
  const hasItems = items.length > 0;

  const totalRetries = items.reduce((acc, item) => acc + item.retries, 0);
  const failureCount = items.filter(item => item.status !== "success").length;
  
  const itemsWithRetries = items.filter(item => item.retries > 0);
  const repairedCount = itemsWithRetries.filter(item => item.repair_success).length;
  const repairSuccessRate = itemsWithRetries.length > 0 
    ? (repairedCount / itemsWithRetries.length) * 100 
    : 100;

  // Leaderboard data
  const leaderboard = [...items].sort((a, b) => {
    if (a.status === "success" && b.status !== "success") return -1;
    if (a.status !== "success" && b.status === "success") return 1;
    if (a.retries !== b.retries) return a.retries - b.retries;
    if (a.validation_errors !== b.validation_errors) return a.validation_errors - b.validation_errors;
    return a.latency_ms - b.latency_ms;
  });

  // Top 3 and Bottom 3 reliability prompts
  const topPrompts = leaderboard.slice(0, 3);
  const bottomPrompts = leaderboard.filter(i => i.status !== "success" || i.retries > 0).slice(-3).reverse();

  // Charts mapping
  const latencyTrendData = items.map(item => ({
    name: item.prompt_name,
    "Latency (s)": Number((item.latency_ms / 1000).toFixed(1)),
    "Validation Errors": item.validation_errors,
  }));

  const costVsQualityData = items.map(item => ({
    name: item.prompt_name,
    "Est. Cost ($)": item.token_cost,
    "Retries": item.retries,
  }));

  // Categories grouping
  const productItems = items.filter(i => i.prompt_type === "product");
  const edgeItems = items.filter(i => i.prompt_type === "edge_case");

  const categoryComparisonData = [
    {
      category: "Product Prompts",
      "Success Rate %": productItems.length > 0 ? (productItems.filter(i => i.status === "success").length / productItems.length) * 100 : 0,
      "Avg Latency (s)": productItems.length > 0 ? (productItems.reduce((acc, i) => acc + i.latency_ms, 0) / productItems.length) / 1000 : 0,
      "Avg Retries": productItems.length > 0 ? productItems.reduce((acc, i) => acc + i.retries, 0) / productItems.length : 0,
    },
    {
      category: "Edge Cases",
      "Success Rate %": edgeItems.length > 0 ? (edgeItems.filter(i => i.status === "success").length / edgeItems.length) * 100 : 0,
      "Avg Latency (s)": edgeItems.length > 0 ? (edgeItems.reduce((acc, i) => acc + i.latency_ms, 0) / edgeItems.length) / 1000 : 0,
      "Avg Retries": edgeItems.length > 0 ? edgeItems.reduce((acc, i) => acc + i.retries, 0) / edgeItems.length : 0,
    }
  ];

  // Custom tooltips
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-surface-2)] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs shadow-xl backdrop-blur-md">
          <p className="text-[var(--color-text-secondary)] font-semibold mb-1.5">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color || "var(--color-brand-400)" }} className="font-medium">
              {p.name}: {typeof p.value === "number" && p.name.includes("Cost") ? `$${p.value.toFixed(6)}` : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const metricCards = [
    { label: "Success Rate", value: `${successRate.toFixed(1)}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30", desc: "Benchmarks passed" },
    { label: "Avg Latency", value: formatDuration(avgLatency), icon: Zap, color: "text-[var(--color-brand-400)]", bg: "bg-[var(--color-brand-500)]/5 border-[var(--color-brand-500)]/15 hover:border-[var(--color-brand-500)]/30", desc: "Per pipeline run" },
    { label: "Total Retries", value: totalRetries, icon: RefreshCw, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/15 hover:border-amber-500/30", desc: "Repair cycles triggered" },
    { label: "Failed Runs", value: failureCount, icon: XCircle, color: "text-red-400", bg: "bg-red-500/5 border-red-500/15 hover:border-red-500/30", desc: "Unrecovered errors" },
    { label: "Repair Rate", value: `${repairSuccessRate.toFixed(1)}%`, icon: Wrench, color: "text-purple-400", bg: "bg-purple-500/5 border-purple-500/15 hover:border-purple-500/30", desc: "Successfully resolved" },
    { label: "Token Cost", value: `$${totalCost.toFixed(6)}`, icon: DollarSign, color: "text-teal-400", bg: "bg-teal-500/5 border-teal-500/15 hover:border-teal-500/30", desc: "Estimated suite cost" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Evaluation Dashboard"
        description="Comprehensive quality metrics, latency analysis, and auto-repair benchmark monitoring"
        badge={selectedRun?.status ? <StatusBadge status={selectedRun.status as any} /> : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Run selector dropdown */}
            <div className="relative">
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                disabled={loadingList}
                className="appearance-none bg-[var(--color-surface-2)] border border-white/[0.08] hover:border-white/[0.15] text-[var(--color-text-secondary)] text-xs rounded-lg pl-3 pr-8 py-2 font-medium focus:outline-none transition-all cursor-pointer disabled:opacity-50"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.success_rate.toFixed(0)}% Success)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            </div>

            {/* Run benchmark button */}
            <button
              onClick={handleTriggerRun}
              disabled={isTriggering || selectedRun?.status === "running"}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-brand-500)] hover:bg-[var(--color-brand-600)] text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-[var(--color-brand-500)]/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isTriggering ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Benchmark
                </>
              )}
            </button>

            {/* Export buttons */}
            <div className="flex items-center rounded-lg bg-[var(--color-surface-2)] border border-white/[0.08] p-0.5 shrink-0">
              <button
                onClick={handleExportCSV}
                title="Export report to CSV"
                disabled={!selectedRunId || selectedRunId === "mock-baseline" || selectedRun?.status === "running"}
                className="p-1.5 hover:bg-white/[0.04] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <FileText className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-white/[0.08]" />
              <button
                onClick={handleExportPDF}
                title="Export report to PDF"
                disabled={!selectedRunId || selectedRunId === "mock-baseline" || selectedRun?.status === "running"}
                className="p-1.5 hover:bg-white/[0.04] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* Live active progress bar */}
      <AnimatePresence>
        {selectedRun && selectedRun.status === "running" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/5 p-5 space-y-4 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-brand-400)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-brand-500)]"></span>
                    </span>
                    Evaluation benchmark suite execution is active
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Compiling 20 prompts (10 products, 10 edge cases) and measuring reliability profiles
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-semibold text-[var(--color-brand-400)]">
                    {completedRunsCount} / 20 Complete
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-white/[0.04] border border-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-brand rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedRunsCount / 20) * 100}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>

              {/* Console logs */}
              {hasItems && (
                <div className="bg-black/40 border border-white/[0.06] rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex justify-between items-center text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[var(--color-text-disabled)]">[{idx + 1}]</span>
                        <span className="text-[var(--color-text-secondary)] font-medium">{item.prompt_name}</span>
                        <span className="text-[var(--color-text-disabled)]">({item.prompt_type === "product" ? "Product" : "Edge"})</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span>{(item.latency_ms / 1000).toFixed(1)}s</span>
                        <span className={item.status === "success" ? "text-emerald-400" : "text-red-400"}>
                          {item.status.toUpperCase()}
                        </span>
                      </span>
                    </div>
                  ))}
                  {completedRunsCount < 20 && (
                    <div className="text-[var(--color-brand-400)] animate-pulse flex items-center gap-1 mt-1">
                      <span>&gt;</span>
                      <span>Compiling next benchmark prompt...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-xl border bg-[var(--color-surface-1)] transition-all ${card.bg}`}
            >
              <Icon className={`w-4 h-4 mb-2.5 ${card.color}`} />
              <div className={`text-xl font-bold tracking-tight ${card.color}`}>{card.value}</div>
              <div className="text-[10px] font-semibold text-[var(--color-text-secondary)] mt-1.5">{card.label}</div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{card.desc}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Middle row: Reliability Leaderboard */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Detailed Table Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Reliability Leaderboard</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Ranking prompt templates by success, repairs, and code quality</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-md border border-white/[0.04]">
              <Award className="w-3.5 h-3.5 text-yellow-500" />
              <span>Full Benchmark List</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.04] text-[var(--color-text-muted)]">
                  <th className="py-2.5 font-semibold">Rank</th>
                  <th className="py-2.5 font-semibold">Benchmark Name</th>
                  <th className="py-2.5 font-semibold">Type</th>
                  <th className="py-2.5 font-semibold text-center">Status</th>
                  <th className="py-2.5 font-semibold text-center">Repairs</th>
                  <th className="py-2.5 font-semibold text-right">Latency</th>
                  <th className="py-2.5 font-semibold text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {leaderboard.length > 0 ? (
                  leaderboard.map((item, idx) => {
                    const isTop = idx < 3;
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-white/[0.01] transition-all ${
                          isTop ? "bg-[var(--color-brand-500)]/[0.01]" : ""
                        }`}
                      >
                        <td className="py-3 font-mono font-medium">
                          {isTop ? (
                            <span className="flex items-center gap-1 text-yellow-500">
                              ★ {idx + 1}
                            </span>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 font-medium text-[var(--color-text-secondary)]">{item.prompt_name}</td>
                        <td className="py-3 text-[var(--color-text-muted)] capitalize">{item.prompt_type.replace("_", " ")}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.status === "success" 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : "bg-red-500/10 text-red-400"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${item.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                            {item.status === "success" ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className="py-3 text-center font-mono">
                          {item.retries > 0 ? (
                            <span className={item.repair_success ? "text-purple-400" : "text-red-400"}>
                              {item.retries} ({item.repair_success ? "Fixed" : "Failed"})
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-disabled)]">0</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">{(item.latency_ms / 1000).toFixed(1)}s</td>
                        <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">${item.token_cost.toFixed(4)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--color-text-muted)] italic">
                      No evaluation records available. Run a benchmark suite to build leaderboard.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right 1 col: Top vs Bottom highlights */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-5 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] border-b border-white/[0.06] pb-3">Reliability Insights</h3>
            
            {/* Top Stable Prompts */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Most Reliable Prompts
              </div>
              <div className="space-y-2">
                {topPrompts.length > 0 ? (
                  topPrompts.map((p) => (
                    <div key={p.id} className="p-2.5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-lg">
                      <div className="flex justify-between items-center text-xs font-semibold text-[var(--color-text-secondary)]">
                        <span>{p.prompt_name}</span>
                        <span className="text-emerald-400 text-[10px]">{(p.latency_ms / 1000).toFixed(1)}s</span>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate">{p.prompt_text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] italic">Waiting for execution...</div>
                )}
              </div>
            </div>

            {/* Bottom/Fragile Prompts */}
            <div className="space-y-2.5 pt-4">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                High Risk / Complex Prompts
              </div>
              <div className="space-y-2">
                {bottomPrompts.length > 0 ? (
                  bottomPrompts.map((p) => (
                    <div key={p.id} className="p-2.5 bg-red-500/[0.02] border border-red-500/10 rounded-lg">
                      <div className="flex justify-between items-center text-xs font-semibold text-[var(--color-text-secondary)]">
                        <span>{p.prompt_name}</span>
                        <span className="text-red-400 text-[10px] font-mono">{p.retries} repairs</span>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate">{p.prompt_text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] italic">No unstable/error items recorded.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-[var(--color-surface-2)] border border-white/[0.04] rounded-lg text-[10px] text-[var(--color-text-muted)] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[var(--color-brand-400)] shrink-0 mt-0.5" />
            <p>Edge cases trigger cross-layer database validation and route verification errors, requiring automated self-repair mechanisms which account for additional tokens and processing latency.</p>
          </div>
        </motion.div>
      </div>

      {/* Visual Analytics Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Analytics & Correlation Analysis</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Explore latency versus errors, token cost ratios, and stage metrics</p>
          </div>

          {/* Tab selectors */}
          <div className="flex items-center rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] p-0.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("latency")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "latency" ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              Latency vs Quality
            </button>
            <button
              onClick={() => setActiveTab("cost")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "cost" ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              Cost vs Repairs
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "categories" ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              Category Breakdown
            </button>
          </div>
        </div>

        {/* Dynamic Chart viewport */}
        <div className="min-h-[260px] flex items-center justify-center">
          {items.length === 0 ? (
            <div className="text-xs text-[var(--color-text-muted)] italic">
              Awaiting data to render charts. Start an evaluation benchmark.
            </div>
          ) : (
            <div className="w-full">
              {activeTab === "latency" && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-4">
                    Latency VS Validation Errors (Higher errors require self-repair, which expands generation latency)
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={latencyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" name="Latency" unit="s" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" name="Errors" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar yAxisId="left" dataKey="Latency (s)" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} opacity={0.8} />
                      <Line yAxisId="right" type="monotone" dataKey="Validation Errors" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: "#f59e0b" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === "cost" && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-4">
                    Estimated Token Cost VS Repair Cycles (Multiple self-repair attempts drive up token expenditure)
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={costVsQualityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" name="Cost" unit="$" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(4)}`} />
                      <YAxis yAxisId="right" orientation="right" name="Retries" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar yAxisId="left" dataKey="Est. Cost ($)" fill="#14b8a6" radius={[4, 4, 0, 0]} opacity={0.8} />
                      <Line yAxisId="right" type="monotone" dataKey="Retries" stroke="#a855f7" strokeWidth={2} dot={{ r: 4, fill: "#a855f7" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === "categories" && (
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-4">
                      Success Rates & Retries Comparison (Products VS Edge Cases)
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={categoryComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                        <YAxis name="Success Rate" unit="%" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Success Rate %" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={60} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-4">
                      Average Generation Latency Comparison (Products VS Edge Cases)
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={categoryComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                        <YAxis name="Latency" unit="s" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Avg Latency (s)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={60} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
