'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { projects, issues, users } from '@/lib/mock-data';
import { getProjectColor, getInitials } from '@/lib/utils';

function ProjectCard({ project }: { project: typeof projects[0] }) {
  const projectIssues = issues.filter((i) => i.projectId === project.id);
  const done = projectIssues.filter((i) => i.status === 'done').length;
  const inProgress = projectIssues.filter((i) => i.status === 'in_progress').length;
  const todo = projectIssues.filter((i) => i.status === 'todo').length;
  const total = projectIssues.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const memberIds = [...new Set(projectIssues.flatMap((i) => [i.creatorId, i.assigneeId].filter(Boolean) as string[]))].slice(0, 4);
  const members = memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as typeof users;

  const color = getProjectColor(project.id);

  return (
    <Link
      href={`/projects/${project.id}/issues`}
      className="block rounded-2xl bg-white p-4 shadow-sm border border-slate-100 active:scale-[0.99] transition-all"
    >
      <div className="flex items-start gap-3.5">
        {/* Project icon */}
        <div className={`${color} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm`}>
          <span className="text-[13px] font-bold text-white tracking-wide">{project.key}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900 text-[15px] leading-snug">{project.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{total} issues</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 mt-0.5 shrink-0" />
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-400">Progress</span>
              <span className="text-[11px] font-semibold text-slate-600">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status pills + team */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5 flex-wrap">
              {todo > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {todo} todo
                </span>
              )}
              {inProgress > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  {inProgress} active
                </span>
              )}
              {done > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {done} done
                </span>
              )}
            </div>

            {/* Team avatars */}
            {members.length > 0 && (
              <div className="flex -space-x-1.5">
                {members.map((m) => (
                  <div
                    key={m.id}
                    title={m.name}
                    className="h-5 w-5 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-indigo-700"
                  >
                    {getInitials(m.name)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.key.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const totalIssues = issues.length;
  const doneIssues = issues.filter((i) => i.status === 'done').length;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-400 mt-0.5">{projects.length} projects · {doneIssues}/{totalIssues} issues done</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full rounded-xl bg-white border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition"
        />
      </div>

      {/* Project cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-2">🗂️</p>
            <p className="font-medium text-slate-700">No projects found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          filtered.map((project) => <ProjectCard key={project.id} project={project} />)
        )}
      </div>
    </div>
  );
}
