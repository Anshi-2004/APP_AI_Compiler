"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Folder, Search, Filter, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatRelativeTime } from "@/lib/utils";
import { useCompilerStore } from "@/store/compilerStore";
import type { StageStatus } from "@/types/pipeline";

export default function ProjectsPage() {
  const { setActiveProject, projects, fetchProjects } = useCompilerStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StageStatus | "all">("all");

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = projects.filter((project) => {
    const matchStatus = statusFilter === "all" || project.status === statusFilter;
    const matchSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={Folder}
        title="Projects"
        description="Browse and manage all compiled software projects"
        actions={
          <Link
            href="/workspace"
            className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name or description..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-brand-500)]/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-text-muted)] hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] text-xs text-[var(--color-text-secondary)] focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="running">Running</option>
            <option value="error">Error</option>
            <option value="idle">Idle</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      <div className="rounded-xl bg-[var(--color-surface-1)] border border-white/[0.06] overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href="/dashboard"
                  onClick={() => setActiveProject(project)}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-3)] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Folder className="w-5 h-5 text-[var(--color-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-400)] transition-colors truncate">
                      {project.name}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                      {project.description}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.04] shrink-0">
                    <StatusBadge status={project.status} size="sm" />
                    <span className="text-xs text-[var(--color-text-disabled)] min-w-[80px] text-right">
                      Updated {formatRelativeTime(project.updatedAt)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-disabled)] group-hover:text-[var(--color-brand-400)] transition-all transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
            No projects found matching search filter.
          </div>
        )}
      </div>
    </div>
  );
}

