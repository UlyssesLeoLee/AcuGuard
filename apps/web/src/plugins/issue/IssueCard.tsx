'use client';

import type React from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Minus, Clock, CheckCircle2 } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import { EventBus } from '@/framework/events/bus';
import { E } from '@/framework/events/events';
import { mockUsers } from '@/lib/mock-data';
import type { Issue, IssueStatus, IssuePriority } from '@/lib/types';

interface IssueCardProps {
  issue: Issue;
  selectable?: boolean;
}

const STATUS_CONFIG: Record<IssueStatus, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  todo: { icon: Clock, color: 'text-slate-400', label: 'To Do' },
  in_progress: { icon: AlertCircle, color: 'text-indigo-400', label: 'In Progress' },
  done: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Done' },
};

const PRIORITY_CONFIG: Record<IssuePriority, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  high: { icon: AlertTriangle, color: 'text-red-400', label: 'High' },
  medium: { icon: AlertCircle, color: 'text-amber-400', label: 'Medium' },
  low: { icon: Minus, color: 'text-slate-400', label: 'Low' },
};

const STATUS_BADGE: Record<IssueStatus, string> = {
  todo: 'bg-slate-700/60 text-slate-300',
  in_progress: 'bg-indigo-900/60 text-indigo-300',
  done: 'bg-emerald-900/60 text-emerald-300',
};

function IssueCardContent({ issue }: { issue: Issue }) {
  const status = STATUS_CONFIG[issue.status];
  const priority = PRIORITY_CONFIG[issue.priority];
  const StatusIcon = status.icon;
  const PriorityIcon = priority.icon;
  const assignee = issue.assigneeId ? mockUsers.find((u) => u.id === issue.assigneeId) : null;

  return (
    <div className="px-4 py-3.5 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <StatusIcon className={cn('w-4 h-4 mt-0.5 shrink-0', status.color)} />
        <p className="text-sm text-white leading-snug font-medium line-clamp-2 flex-1">
          {issue.title}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 ml-6.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              STATUS_BADGE[issue.status]
            )}
          >
            {status.label}
          </span>
          <span className={cn('inline-flex items-center gap-1 text-xs', priority.color)}>
            <PriorityIcon className="w-3 h-3" />
            {priority.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {formatRelativeTime(issue.updatedAt)}
          </span>
          {assignee && (
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {assignee.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IssueCard({ issue, selectable }: IssueCardProps) {
  if (selectable) {
    return (
      <button
        onClick={() => EventBus.emit(E.ISSUE_SELECTED, { issueId: issue.id })}
        className="w-full text-left bg-slate-800/60 hover:bg-slate-700/60 rounded-xl border border-slate-700/50 hover:border-indigo-500/40 transition-all active:scale-[0.99]"
      >
        <IssueCardContent issue={issue} />
      </button>
    );
  }

  return (
    <Link
      href={`/issues/${issue.id}`}
      className="block bg-slate-800/60 hover:bg-slate-700/60 rounded-xl border border-slate-700/50 hover:border-indigo-500/40 transition-all active:scale-[0.99]"
    >
      <IssueCardContent issue={issue} />
    </Link>
  );
}
