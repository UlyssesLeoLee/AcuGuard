'use client';

import { useState, useCallback } from 'react';
import { User, Bot, Zap } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useEvent } from '@/framework/events/useEvent';
import { E } from '@/framework/events/events';
import { mockComments, mockUsers } from '@/lib/mock-data';
import type { OperationSource } from '@/framework/events/events';
import type {
  IssueStatusChangedPayload,
  CommentAddedPayload,
  AIActionConfirmedPayload,
} from '@/framework/events/events';

interface TimelineEntry {
  id: string;
  type: 'comment' | 'status_change' | 'ai_action';
  content: string;
  source: OperationSource;
  authorId?: string;
  createdAt: string;
}

interface ActivityTimelineProps {
  issueId: string;
}

const SOURCE_ICON: Record<OperationSource, React.ComponentType<{ className?: string }>> = {
  user: User,
  ai: Bot,
  automation: Zap,
  integration: Zap,
  system: Zap,
};

const SOURCE_BADGE: Record<OperationSource, { label: string; class: string }> = {
  user: { label: '', class: '' },
  ai: { label: 'AI Copilot', class: 'bg-violet-900/60 text-violet-300' },
  automation: { label: 'Automation', class: 'bg-blue-900/60 text-blue-300' },
  integration: { label: 'Integration', class: 'bg-cyan-900/60 text-cyan-300' },
  system: { label: 'System', class: 'bg-slate-700/60 text-slate-300' },
};

const SOURCE_ICON_BG: Record<OperationSource, string> = {
  user: 'bg-slate-700',
  ai: 'bg-violet-700',
  automation: 'bg-blue-700',
  integration: 'bg-cyan-700',
  system: 'bg-slate-600',
};

export function ActivityTimeline({ issueId }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>(() => {
    return mockComments
      .filter((c) => c.issueId === issueId)
      .map((c) => ({
        id: c.id,
        type: 'comment' as const,
        content: c.body,
        source: 'user' as OperationSource,
        authorId: c.authorId,
        createdAt: c.createdAt,
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  useEvent<IssueStatusChangedPayload>(E.ISSUE_STATUS_CHANGED, useCallback((payload) => {
    if (payload.issueId !== issueId) return;
    setEntries((prev) => [
      ...prev,
      {
        id: `sc-${Date.now()}`,
        type: 'status_change',
        content: `Status changed from ${payload.from.replace('_', ' ')} to ${payload.to.replace('_', ' ')}`,
        source: payload.source,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [issueId]));

  useEvent<CommentAddedPayload>(E.COMMENT_ADDED, useCallback((payload) => {
    if (payload.comment.issueId !== issueId) return;
    setEntries((prev) => [
      ...prev,
      {
        id: payload.comment.id,
        type: 'comment',
        content: payload.comment.body,
        source: payload.source,
        authorId: payload.comment.authorId,
        createdAt: payload.comment.createdAt,
      },
    ]);
  }, [issueId]));

  useEvent<AIActionConfirmedPayload>(E.AI_ACTION_CONFIRMED, useCallback((payload) => {
    if (payload.issueId !== issueId) return;
    setEntries((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        type: 'ai_action',
        content: `AI ${payload.action} applied: ${payload.suggestions[0]}`,
        source: 'ai',
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [issueId]));

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const Icon = SOURCE_ICON[entry.source];
        const badge = SOURCE_BADGE[entry.source];
        const author = entry.authorId ? mockUsers.find((u) => u.id === entry.authorId) : null;

        return (
          <div key={entry.id} className="flex gap-3 py-3 border-b border-slate-800/50 last:border-0">
            <div
              className={cn(
                'w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5',
                SOURCE_ICON_BG[entry.source]
              )}
            >
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {author && (
                  <span className="text-xs font-medium text-slate-300">{author.name}</span>
                )}
                {badge.label && (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', badge.class)}>
                    {badge.label}
                  </span>
                )}
                <span className="text-xs text-slate-500 ml-auto">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{entry.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
