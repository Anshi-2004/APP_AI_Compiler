import { useCompilerStore } from "@/store/compilerStore";
import { PIPELINE_STAGES } from "@/lib/constants";

/**
 * Custom hook for pipeline state — abstracts store access
 * Phase 2: This will also subscribe to SSE for live stage updates
 */
export function usePipeline() {
  const { activeRun, isGenerating, startGeneration, updateStageStatus, resetRun } =
    useCompilerStore();

  const stages = PIPELINE_STAGES.map((s) => ({
    ...s,
    ...(activeRun?.stages[s.id] ?? {
      status: "idle" as const,
      durationMs: undefined,
    }),
  }));

  const successCount = stages.filter((s) => s.status === "success").length;
  const totalStages = stages.length;
  const progressPercent = Math.round((successCount / totalStages) * 100);
  const isRunning = stages.some((s) => s.status === "running");
  const hasError = stages.some((s) => s.status === "error");
  const isComplete = stages.every((s) => s.status === "success");

  return {
    stages,
    activeRun,
    isGenerating,
    isRunning,
    hasError,
    isComplete,
    successCount,
    totalStages,
    progressPercent,
    startGeneration,
    updateStageStatus,
    resetRun,
  };
}
