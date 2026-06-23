import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PipelineRun,
  Project,
  StageStatus,
  PipelineStageId,
  PipelineStage,
} from "@/types/pipeline";
import { mockPipelineRun, mockProjects } from "@/lib/mock-data";
import { API_BASE_URL } from "@/lib/constants";

interface CompilerState {
  // Active project & run
  activeProject: Project | null;
  activeRun: PipelineRun | null;
  projects: Project[];

  // Prompt
  currentPrompt: string;
  isGenerating: boolean;

  // UI state
  sidebarOpen: boolean;
  theme: "dark" | "light";

  // Actions
  setActiveProject: (project: Project | null) => Promise<void>;
  setCurrentPrompt: (prompt: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light") => void;

  startGeneration: (prompt: string) => Promise<void>;

  updateStageStatus: (
    stageId: PipelineStageId,
    status: StageStatus
  ) => void;

  resetRun: () => void;
  loadRunDetails: (runId: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
}

export const useCompilerStore = create<CompilerState>()(
  persist(
    (set, get) => ({
      activeProject: mockProjects[0],
      activeRun: null,
      projects: mockProjects,
      currentPrompt: "",
      isGenerating: false,
      sidebarOpen: true,
      theme: "dark",

      setActiveProject: async (project) => {
        set({ activeProject: project });
        if (project && project.lastRunId) {
          await get().loadRunDetails(project.lastRunId);
        } else {
          set({ activeRun: null });
        }
      },

      setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setTheme: (theme) => set({ theme }),

      startGeneration: async (prompt: string) => {
        set({ isGenerating: true, currentPrompt: prompt });

        const initialStages: Record<PipelineStageId, PipelineStage> = {
          intent: { id: "intent", label: "Intent Extraction", description: "Parse natural language into structured intent", status: "pending" },
          design: { id: "design", label: "System Design", description: "Generate architecture and component graph", status: "idle" },
          schema: { id: "schema", label: "Schema Generation", description: "Produce UI, API, DB, and Auth schemas", status: "idle" },
          validation: { id: "validation", label: "Validation", description: "Cross-layer validation and constraint checks", status: "idle" },
          repair: { id: "repair", label: "Repair Engine", description: "Auto-fix schema errors and mismatches", status: "idle" },
          runtime: { id: "runtime", label: "Runtime", description: "Execute and generate the application files", status: "idle" },
        };

        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/pipeline/run-stream`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          if (!response.body) {
            throw new Error("Response body is null");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            
            // Keep the last partial line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                try {
                  const eventData = JSON.parse(trimmed.slice(6));
                  
                  if (eventData.event === "run_start") {
                    const newProjId = eventData.run_id;
                    const newProject = {
                      id: newProjId,
                      name: prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt,
                      description: prompt,
                      createdAt: eventData.created_at || new Date().toISOString(),
                      updatedAt: eventData.created_at || new Date().toISOString(),
                      lastRunId: eventData.run_id,
                      status: "running" as const,
                    };
                    
                    set((state) => {
                      const exists = state.projects.some((p) => p.id === newProjId);
                      const updatedProjects = exists
                        ? state.projects.map((p) => (p.id === newProjId ? newProject : p))
                        : [newProject, ...state.projects];
                      return {
                        activeProject: newProject,
                        projects: updatedProjects,
                        activeRun: {
                          id: eventData.run_id,
                          projectId: newProjId,
                          prompt,
                          createdAt: eventData.created_at || new Date().toISOString(),
                          status: "running",
                          stages: initialStages,
                        },
                      };
                    });
                  } else if (eventData.event === "stage_start") {
                    const stageId = eventData.stage as PipelineStageId;
                    set((state) => {
                      if (!state.activeRun) return {};
                      const updatedStages = { ...state.activeRun.stages };
                      // Set previous stages to success if they were running/pending/idle
                      Object.keys(updatedStages).forEach((key) => {
                        const curId = key as PipelineStageId;
                        if (
                          (curId === "intent" && stageId !== "intent") ||
                          (curId === "design" && ["schema", "validation", "repair", "runtime"].includes(stageId)) ||
                          (curId === "schema" && ["validation", "repair", "runtime"].includes(stageId)) ||
                          (curId === "validation" && ["runtime"].includes(stageId))
                        ) {
                          if (updatedStages[curId].status !== "success") {
                            updatedStages[curId].status = "success";
                          }
                        }
                      });

                      updatedStages[stageId] = {
                        ...updatedStages[stageId],
                        status: "running",
                        startedAt: new Date().toISOString(),
                      };
                      return {
                        activeRun: {
                          ...state.activeRun,
                          stages: updatedStages,
                        },
                      };
                    });
                  } else if (eventData.event === "stage_success") {
                    const stageId = eventData.stage as PipelineStageId;
                    set((state) => {
                      if (!state.activeRun) return {};
                      const updatedStages = { ...state.activeRun.stages };
                      updatedStages[stageId] = {
                        ...updatedStages[stageId],
                        status: "success",
                        durationMs: eventData.execution_ms,
                        completedAt: new Date().toISOString(),
                        output: eventData.output,
                      };
                      return {
                        activeRun: {
                          ...state.activeRun,
                          stages: updatedStages,
                        },
                      };
                    });
                  } else if (eventData.event === "stage_error") {
                    const stageId = eventData.stage as PipelineStageId;
                    set((state) => {
                      if (!state.activeRun) return {};
                      const updatedStages = { ...state.activeRun.stages };
                      updatedStages[stageId] = {
                        ...updatedStages[stageId],
                        status: "error",
                        errorMessage: eventData.error,
                        completedAt: new Date().toISOString(),
                      };
                      return {
                        activeRun: {
                          ...state.activeRun,
                          status: "error",
                          stages: updatedStages,
                        },
                      };
                    });
                  } else if (eventData.event === "run_complete") {
                    set((state) => {
                      if (!state.activeRun) return { isGenerating: false };
                      const finalStages = { ...state.activeRun.stages };
                      
                      if (eventData.outputs) {
                        Object.keys(eventData.outputs).forEach((key) => {
                          const stageId = (key === "schemas" ? "schema" : key) as PipelineStageId;
                          if (finalStages[stageId]) {
                            finalStages[stageId].output = eventData.outputs[key];
                            if (eventData.outputs[key] && finalStages[stageId].status !== "success" && finalStages[stageId].status !== "error") {
                              finalStages[stageId].status = "success";
                            }
                          }
                        });
                      }

                      // Ensure repair is marked skipped or success if it wasn't executed
                      if (finalStages.repair && finalStages.repair.status === "idle") {
                        finalStages.repair.status = "success";
                      }

                      const updatedProject = state.activeProject
                        ? {
                            ...state.activeProject,
                            status: eventData.status === "success" ? ("success" as const) : ("error" as const),
                            updatedAt: eventData.completed_at || new Date().toISOString(),
                          }
                        : null;

                      setTimeout(() => {
                        get().fetchProjects();
                      }, 100);

                      return {
                        isGenerating: false,
                        activeProject: updatedProject,
                        activeRun: {
                          ...state.activeRun,
                          status: eventData.status === "success" ? "success" : "error",
                          completedAt: eventData.completed_at || new Date().toISOString(),
                          stages: finalStages,
                        },
                      };
                    });
                  }
                } catch (e) {
                  console.error("Error parsing event line:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("Compilation failed:", error);
          set({ isGenerating: false });
          set((state) => {
            if (!state.activeRun) return {};
            const finalStages = { ...state.activeRun.stages };
            Object.keys(finalStages).forEach((key) => {
              const stageId = key as PipelineStageId;
              if (finalStages[stageId].status === "running" || finalStages[stageId].status === "pending") {
                finalStages[stageId].status = "error";
                finalStages[stageId].errorMessage = String(error);
              }
            });
            return {
              activeRun: {
                ...state.activeRun,
                status: "error",
                stages: finalStages,
              },
            };
          });
        }
      },

      updateStageStatus: (stageId, status) => {
        const { activeRun } = get();
        if (!activeRun) return;
        set({
          activeRun: {
            ...activeRun,
            stages: {
              ...activeRun.stages,
              [stageId]: { ...activeRun.stages[stageId], status },
            },
          },
        });
      },

      resetRun: () => set({ activeRun: null, currentPrompt: "" }),

      loadRunDetails: async (runId) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/logs/${runId}`);
          if (!response.ok) throw new Error("Failed to fetch run logs");
          const res = await response.json();
          if (res.success && res.data) {
            const data = res.data;
            const initialStages: Record<PipelineStageId, PipelineStage> = {
              intent: { id: "intent", label: "Intent Extraction", description: "Parse natural language into structured intent", status: "idle" },
              design: { id: "design", label: "System Design", description: "Generate architecture and component graph", status: "idle" },
              schema: { id: "schema", label: "Schema Generation", description: "Produce UI, API, DB, and Auth schemas", status: "idle" },
              validation: { id: "validation", label: "Validation", description: "Cross-layer validation and constraint checks", status: "idle" },
              repair: { id: "repair", label: "Repair Engine", description: "Auto-fix schema errors and mismatches", status: "idle" },
              runtime: { id: "runtime", label: "Runtime", description: "Execute and generate the application files", status: "idle" },
            };

            const stages = { ...initialStages };
            (data.logs || []).forEach((log: any) => {
              const stageId = log.stage as PipelineStageId;
              if (stages[stageId]) {
                stages[stageId].status = log.status;
                stages[stageId].durationMs = log.execution_ms;
                stages[stageId].output = log.output_data;
                stages[stageId].errorMessage = log.error_message;
                stages[stageId].completedAt = log.created_at;
              }
            });

            if (stages.repair && stages.repair.status === "idle" && stages.validation.status === "success") {
              stages.repair.status = "success";
            }

            set({
              activeRun: {
                id: data.run_id,
                projectId: get().activeProject?.id || "project-01",
                prompt: data.prompt || "",
                createdAt: data.created_at || new Date().toISOString(),
                completedAt: data.completed_at || undefined,
                status: data.status || "success",
                stages,
              },
            });
          }
        } catch (error) {
          console.error("Failed to load run details:", error);
        }
      },

      fetchProjects: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/logs`);
          if (!response.ok) throw new Error("Failed to fetch runs");
          const res = await response.json();
          if (res.success && Array.isArray(res.data)) {
            const dbProjects = res.data.map((run: any) => {
              let name = run.prompt.trim();
              if (name.length > 40) {
                name = name.slice(0, 40) + "...";
              }
              const firstLine = name.split("\n")[0];
              name = firstLine || name;

              return {
                id: run.run_id,
                name: name || "Untitled Project",
                description: run.prompt,
                createdAt: run.created_at,
                updatedAt: run.completed_at || run.created_at,
                lastRunId: run.run_id,
                status: run.status,
              };
            });

            const merged = [...dbProjects];
            mockProjects.forEach((mockProj) => {
              if (!merged.some((p) => p.id === mockProj.id)) {
                merged.push(mockProj);
              }
            });

            set({ projects: merged });
          }
        } catch (error) {
          console.error("Failed to fetch projects:", error);
          set({ projects: mockProjects });
        }
      },
    }),
    {
      name: "compiler-store",
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        activeProject: state.activeProject,
        activeRun: state.activeRun,
        projects: state.projects,
      }),
    }
  )
);

