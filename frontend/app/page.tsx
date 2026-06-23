"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Layers,
  FileJson,
  ShieldCheck,
  Wrench,
  Zap,
  ChevronRight,
  GitBranch,
  Star,
} from "lucide-react";
import { PIPELINE_STAGES, APP_NAME } from "@/lib/constants";

const iconMap: Record<string, React.ElementType> = {
  Sparkles, Layers, FileJson, ShieldCheck, Wrench, Zap,
};

const features = [
  {
    icon: Sparkles,
    title: "Natural Language Input",
    description:
      "Describe your application in plain English. Our AI extracts intent, entities, and constraints with high precision.",
  },
  {
    icon: Layers,
    title: "Deterministic Pipeline",
    description:
      "Every stage is isolated, traceable, and reproducible. No black box — full visibility into every decision.",
  },
  {
    icon: ShieldCheck,
    title: "Cross-Layer Validation",
    description:
      "Automatically validates consistency across UI, API, database, and auth schemas before generating any code.",
  },
  {
    icon: Wrench,
    title: "Self-Healing Repair",
    description:
      "The repair engine auto-fixes schema mismatches and missing fields without requiring manual intervention.",
  },
  {
    icon: Zap,
    title: "Instant Runtime",
    description:
      "Generates a fully structured, executable application with pages, APIs, database models, and config files.",
  },
  {
    icon: FileJson,
    title: "Schema-First Design",
    description:
      "Every component is driven by a validated JSON schema, making the output predictable and version-controllable.",
  },
];

const stats = [
  { value: "94%", label: "Repair success rate" },
  { value: "<30s", label: "Avg. generation time" },
  { value: "6", label: "Pipeline stages" },
  { value: "5×", label: "Faster than manual" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-0)] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 h-14 border-b border-white/[0.06] glass">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">{APP_NAME}</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pipeline" className="hover:text-white transition-colors">Pipeline</a>
          <a href="#stats" className="hover:text-white transition-colors">Metrics</a>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Star on GitHub</span>
          </a>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg gradient-brand text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Start Building <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center pt-40 pb-28 px-6">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[var(--color-brand-600)]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/20 text-[var(--color-brand-400)] text-xs font-medium mb-8"
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          AI-Powered Software Compiler — Phase 1 Preview
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.08]"
        >
          Natural Language{" "}
          <span className="gradient-text">→ Working App</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 text-lg text-[var(--color-text-secondary)] max-w-2xl leading-relaxed"
        >
          Describe your application in plain English. CompilerAI runs it through a
          deterministic 6-stage pipeline — extracting intent, designing architecture,
          generating schemas, validating, repairing, and producing a fully executable app.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3 mt-10"
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-medium text-sm hover:opacity-90 transition-all glow-brand"
          >
            Start Building <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pipeline"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[var(--color-text-secondary)] font-medium text-sm hover:bg-white/[0.08] hover:text-white transition-all"
          >
            View Pipeline Demo
          </Link>
        </motion.div>

        {/* Pipeline Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-20 w-full max-w-4xl"
        >
          <div className="relative rounded-2xl glass border border-white/[0.08] p-6 overflow-hidden">
            {/* Grid bg */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="relative z-10">
              <p className="text-xs text-[var(--color-text-muted)] mb-5 font-mono">
                $ compilerai generate "Build an e-commerce platform with Stripe and admin dashboard"
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
                {PIPELINE_STAGES.map((stage, i) => {
                  const Icon = iconMap[stage.icon];
                  const isLast = i === PIPELINE_STAGES.length - 1;
                  const statuses = ["success", "success", "success", "success", "running", "pending"];
                  const status = statuses[i];
                  return (
                    <div key={stage.id} className="flex items-center gap-0 flex-1 min-w-0">
                      <motion.div
                        custom={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        className={`flex flex-col items-center gap-2 flex-1 min-w-0 px-2`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                            status === "success"
                              ? "bg-emerald-500/15 border-emerald-500/30"
                              : status === "running"
                              ? "bg-[var(--color-brand-500)]/15 border-[var(--color-brand-500)]/30 glow-brand"
                              : "bg-white/[0.04] border-white/[0.08]"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${
                              status === "success"
                                ? "text-emerald-400"
                                : status === "running"
                                ? "text-[var(--color-brand-400)] animate-pulse"
                                : "text-[var(--color-text-muted)]"
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] text-center leading-tight hidden sm:block">
                          {stage.label}
                        </span>
                      </motion.div>
                      {!isLast && (
                        <div className="w-8 h-px bg-gradient-to-r from-white/[0.15] to-white/[0.06] shrink-0 hidden sm:block" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    4 stages complete
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--color-brand-400)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-400)] animate-pulse" />
                    Schema generating...
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)] font-mono">12.4s elapsed</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-6 border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-[var(--color-text-muted)]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Built like a compiler, not a chatbot
            </h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">
              Every generation is deterministic, traceable, and repairable — giving you
              the reliability of a compiler with the expressiveness of AI.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="p-5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] hover:border-[var(--color-brand-500)]/30 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/20 flex items-center justify-center mb-4 group-hover:bg-[var(--color-brand-500)]/15 transition-colors">
                    <Icon className="w-4.5 h-4.5 text-[var(--color-brand-400)]" />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--color-text-primary)] mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pipeline overview */}
      <section id="pipeline" className="py-24 px-6 bg-[var(--color-surface-1)]/40">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-3">6-Stage Pipeline</h2>
            <p className="text-[var(--color-text-secondary)]">
              Every stage is independent, observable, and replaceable.
            </p>
          </motion.div>

          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage, i) => {
              const Icon = iconMap[stage.icon];
              return (
                <motion.div
                  key={stage.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] hover:border-[var(--color-brand-500)]/20 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-3)] border border-white/[0.06] flex items-center justify-center shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-400)] group-hover:bg-[var(--color-brand-500)]/10 transition-all">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--color-text-disabled)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {stage.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {stage.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)] group-hover:text-[var(--color-brand-400)] transition-colors shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/20 text-[var(--color-brand-400)] text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Ready to compile?
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Build your first app in{" "}
            <span className="gradient-text">30 seconds</span>
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8">
            No setup. No configuration. Just describe what you want.
          </p>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-all glow-brand"
          >
            Open Prompt Workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <div className="w-5 h-5 rounded-md gradient-brand flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            <span>{APP_NAME} — Phase 1</span>
          </div>
          <p className="text-xs text-[var(--color-text-disabled)]">
            AI-powered software compiler. Built with Next.js + FastAPI.
          </p>
        </div>
      </footer>
    </div>
  );
}
