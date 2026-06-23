/**
 * Intent feature slice — Phase 2 will replace mock with real API calls
 */
import { create } from "zustand";
import type { IntentResult } from "@/types/pipeline";

interface IntentState {
  result: IntentResult | null;
  isLoading: boolean;
  error: string | null;
  // Phase 2: call POST /api/intent
  extract: (prompt: string) => Promise<void>;
  reset: () => void;
}

export const useIntentStore = create<IntentState>()((set) => ({
  result: null,
  isLoading: false,
  error: null,

  extract: async (_prompt: string) => {
    set({ isLoading: true, error: null });
    // Phase 2: await apiClient.post("/intent/extract", { prompt })
    await new Promise((r) => setTimeout(r, 1000));
    set({
      result: {
        entities: ["User", "Product", "Order", "Payment"],
        actions: ["list", "create", "update", "delete", "checkout"],
        constraints: ["authenticated", "role:admin for mutations"],
        appType: "e-commerce",
        confidence: 0.94,
      },
      isLoading: false,
    });
  },

  reset: () => set({ result: null, error: null }),
}));
