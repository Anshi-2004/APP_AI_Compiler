/**
 * System Design feature slice — Phase 3 will wire real API calls
 */
import { create } from "zustand";
import type { SystemDesignResult } from "@/types/pipeline";

const mockDesign: SystemDesignResult = {
  nodes: [
    { id: "frontend", type: "ui", label: "Next.js Frontend", x: 100, y: 200 },
    { id: "api", type: "api", label: "FastAPI Backend", x: 400, y: 200 },
    { id: "db", type: "database", label: "PostgreSQL", x: 700, y: 200 },
    { id: "auth", type: "auth", label: "Auth Service", x: 400, y: 400 },
    { id: "stripe", type: "service", label: "Stripe", x: 700, y: 400 },
  ],
  edges: [
    { id: "e1", source: "frontend", target: "api", label: "REST" },
    { id: "e2", source: "api", target: "db", label: "Prisma ORM" },
    { id: "e3", source: "api", target: "auth", label: "JWT" },
    { id: "e4", source: "api", target: "stripe", label: "Webhook" },
  ],
};

interface DesignState {
  result: SystemDesignResult | null;
  isLoading: boolean;
  error: string | null;
  // Phase 3: call POST /api/design/generate
  generate: (runId: string) => Promise<void>;
  reset: () => void;
}

export const useDesignStore = create<DesignState>()((set) => ({
  result: null,
  isLoading: false,
  error: null,

  generate: async (_runId: string) => {
    set({ isLoading: true, error: null });
    await new Promise((r) => setTimeout(r, 1000));
    set({ result: mockDesign, isLoading: false });
  },

  reset: () => set({ result: null, error: null }),
}));
