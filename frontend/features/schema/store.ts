/**
 * Schema feature slice — Phase 4 will replace mock with real API calls
 */
import { create } from "zustand";
import type { GeneratedSchemas } from "@/types/pipeline";
import { mockGeneratedSchemas } from "@/lib/mock-data";

interface SchemaState {
  schemas: GeneratedSchemas | null;
  isLoading: boolean;
  error: string | null;
  // Phase 4: call POST /api/schema/generate
  generate: (runId: string) => Promise<void>;
  reset: () => void;
}

export const useSchemaStore = create<SchemaState>()((set) => ({
  schemas: null,
  isLoading: false,
  error: null,

  generate: async (_runId: string) => {
    set({ isLoading: true, error: null });
    // Phase 4: await apiClient.post("/schema/generate", { runId })
    await new Promise((r) => setTimeout(r, 1000));
    set({ schemas: mockGeneratedSchemas, isLoading: false });
  },

  reset: () => set({ schemas: null, error: null }),
}));
