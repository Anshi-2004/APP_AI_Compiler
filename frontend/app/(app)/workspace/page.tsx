"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine, Sparkles, ArrowRight, ChevronDown, ChevronUp,
  Wand2, FileText, Zap, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import { useCompilerStore } from "@/store/compilerStore";
import { promptTemplates, examplePrompts } from "@/lib/mock-data";
import { MAX_PROMPT_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

const templateIconMap: Record<string, React.ElementType> = {
  ShoppingCart: Zap, LayoutDashboard: Zap, FileText, Users: Sparkles, Heart: Sparkles,
};

export default function WorkspacePage() {
  const { currentPrompt, setCurrentPrompt, isGenerating, startGeneration } = useCompilerStore();
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const charsLeft = MAX_PROMPT_LENGTH - currentPrompt.length;
  const canGenerate = currentPrompt.trim().length > 10 && !isGenerating;

  const handleTemplate = (templateId: string, prompt: string) => {
    setSelectedTemplate(templateId);
    setCurrentPrompt(prompt);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await startGeneration(currentPrompt);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={PenLine}
        title="Prompt Workspace"
        description="Describe your application in natural language and let the compiler do the rest"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Prompt textarea */}
          <div className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden focus-within:border-[var(--color-brand-500)]/50 transition-all">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <Wand2 className="w-4 h-4 text-[var(--color-brand-400)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                Describe your application
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-mono",
                    charsLeft < 200
                      ? "text-amber-400"
                      : "text-[var(--color-text-disabled)]"
                  )}
                >
                  {charsLeft.toLocaleString()} left
                </span>
              </div>
            </div>

            <textarea
              id="prompt-input"
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
              placeholder="Build an e-commerce platform with product listings, shopping cart, user authentication, Stripe payments, and an admin dashboard to manage inventory and orders..."
              className="w-full min-h-[280px] bg-transparent px-4 py-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] resize-none outline-none leading-relaxed"
              spellCheck
            />

            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-[var(--color-surface-2)]/40">
              <button
                onClick={() => { setCurrentPrompt(""); setSelectedTemplate(null); }}
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear
              </button>

              <Link href="/pipeline" onClick={handleGenerate}>
                <button
                  disabled={!canGenerate}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all",
                    canGenerate
                      ? "gradient-brand text-white hover:opacity-90 glow-brand"
                      : "bg-[var(--color-surface-3)] text-[var(--color-text-disabled)] cursor-not-allowed"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Compiling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate App
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </Link>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-400)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                Example prompts — click to use
              </span>
            </div>
            <div className="space-y-2">
              {examplePrompts.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setCurrentPrompt(prompt)}
                  className="w-full text-left text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] px-3 py-2.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all flex items-start gap-2 group"
                >
                  <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-[var(--color-text-disabled)] group-hover:text-[var(--color-brand-400)] transition-colors" />
                  {prompt}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Prompt Templates
                </span>
              </div>
              {showTemplates ? (
                <ChevronUp className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              )}
            </button>

            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    {promptTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplate(template.id, template.prompt)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg transition-all group",
                          selectedTemplate === template.id
                            ? "bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/20"
                            : "hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]"
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-medium block",
                            selectedTemplate === template.id
                              ? "text-[var(--color-brand-400)]"
                              : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
                          )}
                        >
                          {template.label}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                          {template.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-[var(--color-brand-500)]/5 border border-[var(--color-brand-500)]/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-400)]" />
              <span className="text-xs font-semibold text-[var(--color-brand-400)]">
                Tips for better results
              </span>
            </div>
            <ul className="space-y-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
              {[
                "Mention specific features (auth, payments, notifications)",
                "Name the type of users and their roles",
                "Describe the main workflows, not just the UI",
                "Include constraints (HIPAA, real-time, offline)",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-brand-500)]/50 mt-1.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Character counter visual */}
          <div className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-text-muted)]">Prompt length</span>
              <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                {currentPrompt.length} / {MAX_PROMPT_LENGTH}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-colors",
                  currentPrompt.length / MAX_PROMPT_LENGTH > 0.9
                    ? "bg-red-500"
                    : currentPrompt.length / MAX_PROMPT_LENGTH > 0.7
                    ? "bg-amber-500"
                    : "gradient-brand"
                )}
                animate={{ width: `${(currentPrompt.length / MAX_PROMPT_LENGTH) * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
