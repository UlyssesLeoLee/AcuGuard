'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, MessageSquare, Activity } from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { IssueService } from '@/services/issue.service';
import { useEvent } from '@/framework/events/useEvent';
import { E } from '@/framework/events/events';
import { useUserContext } from '@/framework/context/providers';
import { WorkflowStatusBar } from '@/plugins/workflow/WorkflowStatusBar';
import { ActivityTimeline } from '@/plugins/activity/ActivityTimeline';
import { mockUsers } from '@/lib/mock-data';
import type { Issue, Comment, IssueStatus } from '@/lib/types';
import type { IssueStatusChangedPayload, CommentAddedPayload } from '@/framework/events/events';

interface IssueDetailPanelProps {
  issueId: string;
}

type TabValue = 'detail' | 'activity';

const PRIORITY_COLOR = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-slate-400',
};

export function IssueDetailPanel({ issueId }: IssueDetailPanelProps) {
  const { user } = useUserContext();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tab, setTab] = useState<TabValue>('detail');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    IssueService.get(issueId).then(setIssue);
    IssueService.getComments(issueId).then(setComments);
  }, [issueId]);

  useEvent<IssueStatusChangedPayload>(
    E.ISSUE_STATUS_CHANGED,
    useCallback(
      (payload) => {
        if (payload.issueId !== issueId) return;
        setIssue((prev) => prev ? { ...prev, status: payload.to } : prev);
      },
      [issueId]
    )
  );

  useEvent<CommentAddedPayload>(
    E.COMMENT_ADDED,
    useCallback(
      (payload) => {
        if (payload.comment.issueId !== issueId) return;
        setComments((prev) => [...prev, payload.comment]);
      },
      [issueId]
    )
  );

  async function handleSubmitComment() {
    if (!commentText.trim() || !user || !issue) return;
    setSubmitting(true);
    try {
      await IssueService.addComment(
        { issueId, authorId: user.id, body: commentText.trim() },
        'user'
      );
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  }

  if (!issue) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const assignee = issue.assigneeId ? mockUsers.find((u) => u.id === issue.assigneeId) : null;
  const reporter = mockUsers.find((u) => u.id === issue.reporterId);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-2 pb-3 border-b border-slate-800/60">
        <Link
          href={`/projects/${issue.projectId}/issues`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Issues
        </Link>

        <h1 className="text-base font-semibold text-white leading-snug mb-3">
          {issue.title}
        </h1>

        <WorkflowStatusBar
          issueId={issueId}
          currentStatus={issue.status}
          onStatusChange={(status: IssueStatus) =>
            setIssue((prev) => prev ? { ...prev, status } : prev)
          }
        />

        <div className="flex gap-1 mt-3">
          {(['detail', 'activity'] as TabValue[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition',
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              )}
            >
              {t === 'detail' ? <MessageSquare className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
              {t === 'detail' ? 'Detail' : 'Activity'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'detail' ? (
          <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-xl p-3.5 space-y-2.5 border border-slate-700/40">
              <Row label="Priority">
                <span className={cn('text-sm font-medium capitalize', PRIORITY_COLOR[issue.priority])}>
                  {issue.priority}
                </span>
              </Row>
              {assignee && (
                <Row label="Assignee">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{getInitials(assignee.name)}</span>
                    </div>
                    <span className="text-sm text-slate-300">{assignee.name}</span>
                  </div>
                </Row>
              )}
              {reporter && (
                <Row label="Reporter">
                  <span className="text-sm text-slate-300">{reporter.name}</span>
                </Row>
              )}
              <Row label="Created">
                <span className="text-sm text-slate-300">{formatDate(issue.createdAt)}</span>
              </Row>
              <Row label="Updated">
                <span className="text-sm text-slate-300">{formatDate(issue.updatedAt)}</span>
              </Row>
            </div>

            {issue.description && (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">{issue.description}</p>
              </div>
            )}

            {comments.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                  Comments ({comments.length})
                </p>
                <div className="space-y-3">
                  {comments.map((comment) => {
                    const author = mockUsers.find((u) => u.id === comment.authorId);
                    return (
                      <div key={comment.id} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-300">
                            {author ? getInitials(author.name) : '?'}
                          </span>
                        </div>
                        <div className="flex-1 bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
                          <p className="text-xs text-indigo-400 font-medium mb-1">
                            {author?.name ?? 'Unknown'}
                          </p>
                          <p className="text-sm text-slate-300 leading-relaxed">{comment.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ActivityTimeline issueId={issueId} />
        )}
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-slate-800/60">
        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      {children}
    </div>
  );
}
