'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Circle, CircleDot, CheckCircle2, User, Calendar, MessageSquare, Send, Flag } from 'lucide-react';
import { users, projects } from '@/lib/mock-data';
import { Comment, Issue } from '@/lib/types';
import { IssueStatus, IssuePriority } from '@/lib/types';
import { getInitials, formatDate, formatRelativeTime } from '@/lib/utils';

const STATUS_FLOW: Array<{ key: IssueStatus; label: string; Icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>; bg: string; text: string; ring: string }> = [
  { key: 'todo', label: 'To Do', Icon: Circle, bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300' },
  { key: 'in_progress', label: 'In Progress', Icon: CircleDot, bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-300' },
  { key: 'done', label: 'Done', Icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-300' },
];

const PRIORITY_CONFIG: Record<IssuePriority, { label: string; bg: string; text: string; dot: string }> = {
  high: { label: 'High', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-8 w-8 text-[11px]' : 'h-6 w-6 text-[9px]';
  return (
    <div className={`${sizeClass} shrink-0 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700`}>
      {getInitials(name)}
    </div>
  );
}

export default function IssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const router = useRouter();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [currentStatus, setCurrentStatus] = useState<IssueStatus | null>(null);
  const [currentPriority, setCurrentPriority] = useState<IssuePriority | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  useEffect(() => {
    fetch(`/api/issues?id=${issueId}`).then((r) => r.json()).then((items: Issue[]) => setIssue(items[0] ?? null)).catch(() => {});
    fetch(`/api/comments?issueId=${issueId}`).then((r) => r.json()).then((items: Comment[]) => setLocalComments(items)).catch(() => {});
  }, [issueId]);

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-4xl mb-3">🔍</span>
        <p className="font-semibold text-slate-700">Issue not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm font-medium text-indigo-600">
          Go back
        </button>
      </div>
    );
  }

  const status = currentStatus ?? issue.status;
  const priority = currentPriority ?? issue.priority;
  const priorityConf = PRIORITY_CONFIG[priority];
  const assignee = issue.assigneeId ? users.find((u) => u.id === issue.assigneeId) : null;
  const creator = users.find((u) => u.id === issue.creatorId);
  const project = projects.find((p) => p.id === issue.projectId);
  const issueKey = `${project?.key ?? 'AG'}-${issue.id.replace(/\D/g, '')}`;

  async function updateStatus(newStatus: IssueStatus) {
    setCurrentStatus(newStatus);
    fetch('/api/issues', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: issueId, status: newStatus }),
    }).catch(() => {});
  }

  async function updatePriority(newPriority: IssuePriority) {
    setCurrentPriority(newPriority);
    fetch('/api/issues', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: issueId, priority: newPriority }),
    }).catch(() => {});
  }

  async function submitComment() {
    if (!commentBody.trim()) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const optimistic = { id: `local-${Date.now()}`, issueId: issueId!, authorId: 'u1', body: commentBody.trim(), createdAt: now };
    setLocalComments((prev) => [...prev, optimistic]);
    setCommentBody('');
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ issueId, authorId: 'u1', body: optimistic.body }),
    }).catch(() => {});
    setSubmitting(false);
  }

  return (
    <div className="-mx-4 -mt-4">
      {/* Sticky sub-header */}
      <div className="sticky top-[57px] z-20 bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-600">
          <ArrowLeft size={16} />
          Back
        </button>
        <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{issueKey}</span>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Status flow */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {STATUS_FLOW.map(({ key, label, Icon, bg, text, ring }) => {
            const isActive = status === key;
            return (
              <button
                key={key}
                onClick={() => updateStatus(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  isActive ? `${bg} ${text} ring-2 ${ring}` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Icon size={13} strokeWidth={isActive ? 2.5 : 1.75} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Title block */}
        <div>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityConf.bg} ${priorityConf.text} mb-2.5`}>
            <span className={`h-1.5 w-1.5 rounded-full ${priorityConf.dot}`} />
            <Flag size={10} />
            {priorityConf.label} Priority
          </div>
          <div className="mb-2.5 flex gap-2 overflow-x-auto no-scrollbar">
            {(['high', 'medium', 'low'] as IssuePriority[]).map((p) => {
              const conf = PRIORITY_CONFIG[p];
              const isActive = priority === p;
              return (
                <button
                  key={p}
                  onClick={() => updatePriority(p)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    isActive ? `${conf.bg} ${conf.text} ring-2 ring-offset-1 ring-slate-300` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                  {conf.label}
                </button>
              );
            })}
          </div>
          <h1 className="text-xl font-bold text-slate-900 leading-snug">{issue.title}</h1>
        </div>

        {/* Description */}
        {issue.description ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[14px] text-slate-700 leading-relaxed">{issue.description}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-400">No description provided</p>
          </div>
        )}

        {/* Metadata card */}
        <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
          {[
            {
              icon: <User size={14} className="text-slate-400" />,
              label: 'Assignee',
              value: assignee ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={assignee.name} />
                  <span className="text-[14px] font-medium text-slate-900">{assignee.name}</span>
                </div>
              ) : <span className="text-sm text-slate-400">Unassigned</span>,
            },
            {
              icon: <User size={14} className="text-slate-400" />,
              label: 'Reporter',
              value: creator ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={creator.name} />
                  <span className="text-[14px] font-medium text-slate-900">{creator.name}</span>
                </div>
              ) : null,
            },
            {
              icon: <Calendar size={14} className="text-slate-400" />,
              label: 'Created',
              value: <span className="text-[14px] text-slate-700">{formatDate(issue.createdAt)}</span>,
            },
            {
              icon: <Calendar size={14} className="text-slate-400" />,
              label: 'Updated',
              value: <span className="text-[14px] text-slate-700">{formatRelativeTime(issue.updatedAt)}</span>,
            },
          ].map(({ icon, label, value }, idx, arr) => (
            <div
              key={label}
              className={`flex items-center px-4 py-3 gap-3 ${idx < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              {icon}
              <span className="text-xs text-slate-400 w-[72px] shrink-0">{label}</span>
              <div className="flex-1">{value}</div>
            </div>
          ))}
        </div>

        {/* Comments */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">
              Comments <span className="text-slate-400 font-normal">({localComments.length})</span>
            </h2>
          </div>

          {localComments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center mb-3">
              <p className="text-sm text-slate-400">No comments yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-4 mb-4">
              {localComments.map((c) => {
                const author = users.find((u) => u.id === c.authorId);
                return (
                  <div key={c.id} className="flex gap-2.5">
                    {author ? (
                      <UserAvatar name={author.name} size="md" />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-slate-800">{author?.name ?? 'Unknown'}</span>
                        <span className="text-[10px] text-slate-400">{formatRelativeTime(c.createdAt)}</span>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-3 py-2 shadow-sm">
                        <p className="text-[13px] text-slate-700 leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20 transition">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment…"
                rows={1}
                className="w-full resize-none text-[14px] text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
                }}
              />
            </div>
            <button
              onClick={submitComment}
              disabled={!commentBody.trim() || submitting}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm disabled:opacity-40 transition"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
