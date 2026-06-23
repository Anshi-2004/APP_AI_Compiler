/**
 * Validation feature slice — Phase 5 will wire real API calls
 */
import { create } from "zustand";
import type { ValidationReport } from "@/types/pipeline";
import { mockValidationReport } from "@/lib/mock-data";

interface ValidationState {
  report: ValidationReport | null;
  isLoading: boolean;
  error: string | null;
  // Phase 5: call POST /api/validation/run
  validate: (runId: string) => Promise<void>;
  reset: () => void;
}

export const useValidationStore = create<ValidationState>()((set) => ({
  report: null,
  isLoading: false,
  error: null,

  validate: async (_runId: string) => {
    set({ isLoading: true, error: null });
    await new Promise((r) => setTimeout(r, 1000));
    set({ report: mockValidationReport, isLoading: false });
  },

  reset: () => set({ report: null, error: null }),
}));
