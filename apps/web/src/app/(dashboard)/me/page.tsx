'use client';

import Link from 'next/link';
import { Circle, CircleDot, CheckCircle2, User, Briefcase, TrendingUp } from 'lucide-react';
import { issues as allIssues, users, projects } from '@/lib/mock-data';
import { IssueStatus } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';

const ME_ID = 'u1';

const STATUS_ICON: Record<IssueStatus, React.FC<{ size?: number; className?: string; strokeWidth?: number }>> = {
  todo: Circle,
  in_progress: CircleDot,
  done: CheckCircle2,
};
const STATUS_COLOR: Record<IssueStatus, string> = {
  todo: 'text-slate-400',
  in_progress: 'text-blue-500',
  done: 'text-emerald-500',
};
const STATUS_LABEL: Record<IssueStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};
const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-300',
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-indigo-600 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

export default function MePage() {
  const me = users.find((u) => u.id === ME_ID)!;
  const assigned = allIssues.filter((i) => i.assigneeId === ME_ID);
  const created = allIssues.filter((i) => i.creatorId === ME_ID);
  const activeIssues = assigned.filter((i) => i.status !== 'done');
  const doneIssues = assigned.filter((i) => i.status === 'done');
  const completionRate = assigned.length > 0 ? Math.round((doneIssues.length / assigned.length) * 100) : 0;

  const recentActivity = [...assigned]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Profile banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xl font-bold backdrop-blur-sm">
            {me.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold leading-tight">{me.name}</h1>
            <p className="text-sm text-white/70 mt-0.5">{me.email}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs font-medium bg-white/20 rounded-full px-2.5 py-0.5">
                {assigned.length} assigned
              </span>
              <span className="text-xs font-medium bg-white/20 rounded-full px-2.5 py-0.5">
                {created.length} created
              </span>
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/70">Completion rate</span>
            <span className="text-xs font-bold">{completionRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp size={18} className="text-indigo-600" />}
          label="Active Issues"
          value={activeIssues.length}
          sub={activeIssues.length > 0 ? 'Need attention' : 'All clear!'}
        />
        <StatCard
          icon={<Briefcase size={18} className="text-indigo-600" />}
          label="Completed"
          value={doneIssues.length}
        />
      </div>

      {/* Active issues */}
      {activeIssues.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-2.5">
            Active Issues <span className="font-normal text-slate-400">({activeIssues.length})</span>
          </h2>
          <div className="space-y-2">
            {activeIssues.map((issue) => {
              const StatusIcon = STATUS_ICON[issue.status];
              const proj = projects.find((p) => p.id === issue.projectId);
              return (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm active:scale-[0.99] transition-all"
                >
                  <StatusIcon size={17} className={STATUS_COLOR[issue.status]} strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-slate-900 truncate">{issue.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400">{proj?.name}</span>
                      <span className="text-slate-300 text-[10px]">·</span>
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(issue.updatedAt)}</span>
                    </div>
                  </div>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority]}`} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently updated */}
      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-2.5">Recent Activity</h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            {recentActivity.map((issue, idx, arr) => {
              const StatusIcon = STATUS_ICON[issue.status];
              return (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  className={`flex items-center gap-3 px-4 py-3 ${idx < arr.length - 1 ? 'border-b border-slate-50' : ''} active:bg-slate-50`}
                >
                  <StatusIcon size={15} className={STATUS_COLOR[issue.status]} strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 truncate">{issue.title}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(issue.updatedAt)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {assigned.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="text-4xl mb-3">🎉</span>
          <p className="font-semibold text-slate-700">You&apos;re all caught up!</p>
          <p className="text-sm text-slate-400 mt-1">No issues assigned to you right now</p>
        </div>
      )}
    </div>
  );
}
