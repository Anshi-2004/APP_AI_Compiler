"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings, Moon, Sun, Monitor, Cpu, Sliders, ShieldCheck,
  Shuffle, ChevronDown, Save, RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useCompilerStore } from "@/store/compilerStore";
import { cn } from "@/lib/utils";

const models = [
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI", desc: "Most capable, balanced speed" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", desc: "Fast, cost-efficient" },
  { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic", desc: "Strong reasoning" },
  { id: "gemini-1-5-pro", label: "Gemini 1.5 Pro", provider: "Google", desc: "Long context window" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-all duration-200",
        checked ? "bg-[var(--color-brand-500)]" : "bg-[var(--color-surface-4)]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
          checked ? "left-5" : "left-0.5"
        )}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
      <div>
        <div className="text-sm font-medium text-[var(--color-text-primary)]">{label}</div>
        {description && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</div>}
      </div>
      <div className="ml-4 shrink-0">{children}</div>
    </div>
  );
}

function SettingSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
        <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </div>
      <div className="px-5">{children}</div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useCompilerStore();

  // Local settings state (Phase 2: persist to backend)
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.3);
  const [strictMode, setStrictMode] = useState(true);
  const [deterministicMode, setDeterministicMode] = useState(true);
  const [modelDropdown, setModelDropdown] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Phase 2: POST /api/settings
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedModelData = models.find((m) => m.id === selectedModel)!;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Configure the compiler behaviour, models, and appearance"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTemperature(0.3);
                setStrictMode(true);
                setDeterministicMode(true);
                setSelectedModel("gpt-4o");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg gradient-brand text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        }
      />

      {/* Appearance */}
      <SettingSection title="Appearance" icon={Moon}>
        <SettingRow label="Theme" description="Choose your preferred colour scheme">
          <div className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] p-0.5">
            {([
              { value: "dark", icon: Moon, label: "Dark" },
              { value: "light", icon: Sun, label: "Light" },
            ] as const).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    theme === t.value
                      ? "bg-[var(--color-surface-4)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
        </SettingRow>
      </SettingSection>

      {/* Model */}
      <SettingSection title="Model Selection" icon={Cpu}>
        <SettingRow label="Language Model" description="The AI model used across all pipeline stages">
          <div className="relative">
            <button
              onClick={() => setModelDropdown(!modelDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] hover:bg-[var(--color-surface-3)] transition-all text-xs"
            >
              <Cpu className="w-3.5 h-3.5 text-[var(--color-brand-400)]" />
              <span className="text-[var(--color-text-primary)] font-medium">{selectedModelData.label}</span>
              <span className="text-[var(--color-text-muted)]">({selectedModelData.provider})</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform", modelDropdown && "rotate-180")} />
            </button>
            {modelDropdown && (
              <div className="absolute right-0 mt-1 w-64 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.08] shadow-2xl z-10 overflow-hidden">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model.id); setModelDropdown(false); }}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.04]",
                      selectedModel === model.id && "bg-[var(--color-brand-500)]/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-medium", selectedModel === model.id ? "text-[var(--color-brand-400)]" : "text-[var(--color-text-primary)]")}>
                        {model.label}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">{model.provider}</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{model.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SettingRow>
      </SettingSection>

      {/* Generation */}
      <SettingSection title="Generation Parameters" icon={Sliders}>
        <SettingRow
          label="Temperature"
          description={`Controls output randomness. Current: ${temperature.toFixed(1)}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)] w-8">0.0</span>
            <div className="relative w-36">
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full bg-[var(--color-surface-3)] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-brand-500)] [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
            <span className="text-xs text-[var(--color-text-muted)] w-8">1.0</span>
            <span className="text-xs font-mono text-[var(--color-brand-400)] w-8">{temperature.toFixed(1)}</span>
          </div>
        </SettingRow>
      </SettingSection>

      {/* Compiler Flags */}
      <SettingSection title="Compiler Flags" icon={ShieldCheck}>
        <SettingRow
          label="Strict Mode"
          description="Treat all validation warnings as errors. Enforces stricter schema compliance."
        >
          <Toggle checked={strictMode} onChange={setStrictMode} />
        </SettingRow>
        <SettingRow
          label="Deterministic Mode"
          description="Lock temperature to 0 and use fixed seeds. Ensures identical output for identical input."
        >
          <Toggle checked={deterministicMode} onChange={setDeterministicMode} />
        </SettingRow>
        <SettingRow
          label="Auto-Repair"
          description="Automatically run the repair engine when validation fails."
        >
          <Toggle checked={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow
          label="Schema Caching"
          description="Cache intermediate schemas to speed up re-runs."
        >
          <Toggle checked={false} onChange={() => {}} />
        </SettingRow>
      </SettingSection>

      {/* Phase 2 placeholder */}
      <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center">
        <Shuffle className="w-5 h-5 text-[var(--color-text-disabled)] mx-auto mb-2" />
        <p className="text-xs text-[var(--color-text-muted)]">
          API Keys, Webhooks, and Team Settings will be available in Phase 2.
        </p>
      </div>
    </div>
  );
}
