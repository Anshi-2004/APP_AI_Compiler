/**
 * Runtime feature slice — Phase 7 will wire real API calls
 */
import { create } from "zustand";
import type { RuntimeResult } from "@/types/pipeline";
import { mockRuntimeResult } from "@/lib/mock-data";

interface RuntimeState {
  result: RuntimeResult | null;
  isLoading: boolean;
  error: string | null;
  // Phase 7: call POST /api/runtime/execute
  execute: (runId: string) => Promise<void>;
  reset: () => void;
}

export const useRuntimeStore = create<RuntimeState>()((set) => ({
  result: null,
  isLoading: false,
  error: null,

  execute: async (_runId: string) => {
    set({ isLoading: true, error: null });
    await new Promise((r) => setTimeout(r, 1000));
    set({ result: mockRuntimeResult, isLoading: false });
  },

  reset: () => set({ result: null, error: null }),
}));
