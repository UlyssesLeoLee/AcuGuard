'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Circle, CircleDot, CheckCircle2, X } from 'lucide-react';
import { issues as allIssues, projects, users } from '@/lib/mock-data';
import { IssueStatus, IssuePriority } from '@/lib/types';
import { getInitials, formatRelativeTime, getProjectColor } from '@/lib/utils';

const STATUS_CONFIG: Record<IssueStatus, { label: string; Icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>; textColor: string; badgeBg: string; badgeText: string }> = {
  todo: { label: 'To Do', Icon: Circle, textColor: 'text-slate-400', badgeBg: 'bg-slate-100', badgeText: 'text-slate-600' },
  in_progress: { label: 'In Progress', Icon: CircleDot, textColor: 'text-blue-500', badgeBg: 'bg-blue-50', badgeText: 'text-blue-700' },
  done: { label: 'Done', Icon: CheckCircle2, textColor: 'text-emerald-500', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700' },
};

const PRIORITY_CONFIG: Record<IssuePriority, { label: string; dotColor: string; textColor: string }> = {
  high: { label: 'High', dotColor: 'bg-rose-500', textColor: 'text-rose-600' },
  medium: { label: 'Med', dotColor: 'bg-amber-500', textColor: 'text-amber-600' },
  low: { label: 'Low', dotColor: 'bg-slate-400', textColor: 'text-slate-500' },
};

type FilterKey = IssueStatus | 'all';

const FILTER_TABS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export default function IssueListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<IssuePriority>('medium');
  const [creating, setCreating] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const color = project ? getProjectColor(project.id) : 'bg-indigo-500';

  const filtered = useMemo(() => {
    return allIssues.filter((i) => {
      if (i.projectId !== projectId) return false;
      if (filter !== 'all' && i.status !== filter) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [projectId, filter, search]);

  const counts = useMemo(() => ({
    all: allIssues.filter((i) => i.projectId === projectId).length,
    todo: allIssues.filter((i) => i.projectId === projectId && i.status === 'todo').length,
    in_progress: allIssues.filter((i) => i.projectId === projectId && i.status === 'in_progress').length,
    done: allIssues.filter((i) => i.projectId === projectId && i.status === 'done').length,
  }), [projectId]);

  async function createIssue() {
    if (!newTitle.trim()) return;
    setCreating(true);
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, title: newTitle.trim(), description: '', status: 'todo', priority: newPriority, creatorId: 'u1' }),
    });
    setCreating(false);
    setNewTitle('');
    setShowCreate(false);
  }

  return (
    <div className="-mx-4 -mt-4">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-2 pb-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-500 mb-2.5"
        >
          <ArrowLeft size={15} />
          <span>Projects</span>
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className={`${color} h-9 w-9 rounded-lg flex items-center justify-center shrink-0`}>
            <span className="text-[11px] font-bold text-white">{project?.key ?? '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold text-slate-900 leading-tight">{project?.name ?? 'Project'}</h1>
            <p className="text-xs text-slate-400">{counts.all} issues</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm"
          >
            <Plus size={14} />
            New
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues…"
            className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:bg-white transition"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                filter === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.key in counts && (
                <span className={`ml-1 ${filter === tab.key ? 'text-white/70' : 'text-slate-400'}`}>
                  {counts[tab.key as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Issue list */}
      <div className="px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="text-4xl mb-3">📋</span>
            <p className="font-semibold text-slate-700">No issues found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? 'Try a different search term' : 'Tap "+ New" to create your first issue'}
            </p>
          </div>
        ) : (
          filtered.map((issue) => {
            const sc = STATUS_CONFIG[issue.status];
            const pc = PRIORITY_CONFIG[issue.priority];
            const assignee = issue.assigneeId ? users.find((u) => u.id === issue.assigneeId) : null;
            const StatusIcon = sc.Icon;

            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm border border-slate-100 active:scale-[0.99] transition-all"
              >
                <StatusIcon size={17} className={sc.textColor} strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-slate-900 truncate leading-snug">{issue.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${pc.textColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${pc.dotColor}`} />
                      {pc.label}
                    </span>
                    <span className="text-slate-300 text-[10px]">·</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${sc.badgeBg} ${sc.badgeText}`}>
                      {sc.label}
                    </span>
                    <span className="text-slate-300 text-[10px]">·</span>
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(issue.updatedAt)}</span>
                  </div>
                </div>
                {assignee && (
                  <div
                    title={assignee.name}
                    className="h-7 w-7 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700"
                  >
                    {getInitials(assignee.name)}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* Create Issue Bottom Sheet */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full rounded-t-2xl bg-white px-5 pt-5 pb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">New Issue</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400">
                <X size={18} />
              </button>
            </div>

            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createIssue()}
              placeholder="Issue title…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-[15px] text-slate-900 focus:outline-none focus:border-indigo-400 focus:bg-white transition mb-3"
            />

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Priority</p>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as IssuePriority[]).map((p) => {
                  const pc = PRIORITY_CONFIG[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                        newPriority === p
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${pc.dotColor}`} />
                      {pc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={createIssue}
                disabled={!newTitle.trim() || creating}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
