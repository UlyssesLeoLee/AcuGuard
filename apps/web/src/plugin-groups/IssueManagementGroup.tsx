'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Issue, IssueStatus } from '@/lib/types';
import { projects } from '@/lib/mock-data';
import { IssueService } from '@/services/issue.service';
import { getProjectColor } from '@/lib/utils';
import { useEvent } from '@/framework/events/useEvent';
import { E } from '@/framework/events/events';

// Atomic plugins
import { IssueFilterBar } from '@/plugins/issue/IssueFilterBar';
import { IssueCard } from '@/plugins/issue/IssueCard';
import { IssueCreateDialog } from '@/plugins/issue/IssueCreateDialog';

type FilterStatus = IssueStatus | 'all';

export interface IssueManagementGroupProps {
  projectId: string;
}

/**
 * PluginGroup: IssueManagementGroup
 * Composes: IssueFilterBar + IssueCard list + IssueCreateDialog
 * Manages: issue list state, filter state, create dialog
 */
export function IssueManagementGroup({ projectId }: IssueManagementGroupProps) {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showCreate, setShowCreate] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const projectColor = project ? getProjectColor(project.key) : '#4f46e5';

  useEffect(() => {
    IssueService.list({ projectId }).then(setIssues);
  }, [projectId]);

  // Live-update: add new issues when created via the dialog or any other source
  useEvent<{ issue: Issue }>(E.ISSUE_CREATED, ({ issue }) => {
    if (issue.projectId === projectId) {
      setIssues((prev) => [issue, ...prev]);
    }
  });

  // Live-update: reflect status changes from board drag-drop or detail panel
  useEvent<{ issueId: string; to: IssueStatus }>(E.ISSUE_STATUS_CHANGED, ({ issueId, to }) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: to } : i)),
    );
  });

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [issues, search, statusFilter]);

  const counts = useMemo(() => ({
    all: issues.length,
    todo: issues.filter((i) => i.status === 'todo').length,
    in_progress: issues.filter((i) => i.status === 'in_progress').length,
    done: issues.filter((i) => i.status === 'done').length,
  }), [issues]);

  return (
    <div className="-mx-4 -mt-4">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-2 pb-3">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 mb-2.5">
          <ArrowLeft size={15} />
          Projects
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: projectColor }}>
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

        {/* IssueFilterBar plugin */}
        <IssueFilterBar
          search={search}
          status={statusFilter}
          counts={counts}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Issue list — IssueCard plugins */}
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
          filtered.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </div>

      {/* IssueCreateDialog plugin */}
      <IssueCreateDialog
        projectId={projectId}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
