/**
 * Repair feature slice — Phase 6 will wire real API calls
 */
import { create } from "zustand";
import type { RepairReport } from "@/types/pipeline";
import { mockRepairReport } from "@/lib/mock-data";

interface RepairState {
  report: RepairReport | null;
  isLoading: boolean;
  error: string | null;
  // Phase 6: call POST /api/repair/run
  repair: (runId: string) => Promise<void>;
  reset: () => void;
}

export const useRepairStore = create<RepairState>()((set) => ({
  report: null,
  isLoading: false,
  error: null,

  repair: async (_runId: string) => {
    set({ isLoading: true, error: null });
    await new Promise((r) => setTimeout(r, 1000));
    set({ report: mockRepairReport, isLoading: false });
  },

  reset: () => set({ report: null, error: null }),
}));
