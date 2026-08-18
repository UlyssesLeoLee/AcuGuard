'use client';

import { cn } from '@/lib/utils';
import { IssueService } from '@/services/issue.service';
import type { IssueStatus } from '@/lib/types';
import type { OperationSource } from '@/framework/events/events';

interface WorkflowStatusBarProps {
  issueId: string;
  currentStatus: IssueStatus;
  onStatusChange?: (status: IssueStatus) => void;
  source?: OperationSource;
}

const STATUSES: { value: IssueStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const STATUS_STYLES: Record<IssueStatus, { active: string; inactive: string }> = {
  todo: {
    active: 'bg-slate-700 text-white border-slate-600',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-700/50',
  },
  in_progress: {
    active: 'bg-indigo-600 text-white border-indigo-500',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-700/50',
  },
  done: {
    active: 'bg-emerald-600 text-white border-emerald-500',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-700/50',
  },
};

export function WorkflowStatusBar({
  issueId,
  currentStatus,
  onStatusChange,
  source = 'user',
}: WorkflowStatusBarProps) {
  async function handleClick(status: IssueStatus) {
    if (status === currentStatus) return;
    await IssueService.update({ id: issueId, status }, source);
    onStatusChange?.(status);
  }

  return (
    <div className="flex gap-1.5">
      {STATUSES.map(({ value, label }) => {
        const isActive = currentStatus === value;
        const styles = STATUS_STYLES[value];
        return (
          <button
            key={value}
            onClick={() => handleClick(value)}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all',
              isActive ? styles.active : styles.inactive,
              !isActive && 'hover:bg-slate-700/60 hover:text-slate-300'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
