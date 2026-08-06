'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown, Check, Loader2, Zap } from 'lucide-react';
import { mockIssues as allIssues, projects } from '@/lib/mock-data';
import { AIService, type AIActionType } from '@/services/ai.service';
import { useAIContext } from '@/framework/context/providers';

interface ActionDef {
  key: AIActionType;
  label: string;
  description: string;
  emoji: string;
  gradient: string;
  border: string;
}

const ACTIONS: ActionDef[] = [
  { key: 'summary',  label: 'Summarize',         description: 'Delivery-risk–aware summary',   emoji: '📋', gradient: 'from-indigo-50 to-violet-50', border: 'border-indigo-200' },
  { key: 'subtasks', label: 'Break into Subtasks',description: 'Auto-propose actionable steps', emoji: '🔀', gradient: 'from-violet-50 to-fuchsia-50', border: 'border-violet-200' },
  { key: 'priority', label: 'Suggest Priority',   description: 'Analyze impact & urgency',      emoji: '🎯', gradient: 'from-amber-50 to-orange-50',  border: 'border-amber-200' },
  { key: 'comment',  label: 'Draft Comment',      description: 'Professional status update',    emoji: '💬', gradient: 'from-emerald-50 to-teal-50',  border: 'border-emerald-200' },
];

export interface AIInsightPanelProps {
  /** Pre-select a specific issue (from parent context). */
  preselectedIssueId?: string;
}

/** Plugin: AIInsightPanel — AI action grid with issue selector. */
export function AIInsightPanel({ preselectedIssueId }: AIInsightPanelProps) {
  const { isProcessing, pendingAction } = useAIContext();
  const [selectedId, setSelectedId] = useState(preselectedIssueId ?? allIssues[0]?.id ?? '');
  const [showPicker, setShowPicker] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const selectedIssue = allIssues.find((i) => i.id === selectedId);
  const selectedProject = selectedIssue ? projects.find((p) => p.id === selectedIssue.projectId) : null;

  async function runAction(action: AIActionType) {
    if (!selectedIssue || isProcessing) return;
    setLoadingAction(action);
    await AIService.analyze(action, {
      issueId: selectedIssue.id,
      title: selectedIssue.title,
      description: selectedIssue.description,
    });
    setLoadingAction(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
          <Sparkles size={19} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Copilot</h1>
          <p className="text-xs text-slate-400">Human-in-the-loop · confirms before writing</p>
        </div>
      </div>

      {/* Issue selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Analyzing Issue</p>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-full flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3.5 text-left shadow-sm"
        >
          <div className="h-8 w-8 shrink-0 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Zap size={15} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate leading-tight">
              {selectedIssue?.title ?? 'Select an issue'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {selectedProject?.name ?? ''}{selectedProject ? ' · ' : ''}{selectedIssue?.status?.replace('_', ' ') ?? ''}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 shrink-0 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`}
          />
        </button>

        {showPicker && (
          <div className="mt-1 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
            {allIssues.map((issue) => {
              const proj = projects.find((p) => p.id === issue.projectId);
              const isSelected = issue.id === selectedId;
              return (
                <button
                  key={issue.id}
                  onClick={() => { setSelectedId(issue.id); setShowPicker(false); }}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                      {issue.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {proj?.name} · {issue.status.replace('_', ' ')}
                    </p>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action grid */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((action) => {
            const busy = loadingAction === action.key || (isProcessing && pendingAction?.action === action.key);
            return (
              <button
                key={action.key}
                onClick={() => runAction(action.key)}
                disabled={!!loadingAction || isProcessing || !selectedId}
                className={`bg-gradient-to-br ${action.gradient} border ${action.border} rounded-2xl p-4 text-left transition active:scale-[0.97] disabled:opacity-50`}
              >
                <span className="text-2xl">{action.emoji}</span>
                <p className="mt-2 text-[13px] font-bold text-slate-800">{action.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{action.description}</p>
                {busy && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Thinking…</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {!pendingAction && !loadingAction && !isProcessing && (
        <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-6 text-center">
          <p className="text-2xl mb-2">✨</p>
          <p className="text-sm font-medium text-slate-700">Select an issue and run an action</p>
          <p className="text-xs text-slate-400 mt-1">AI suggestions require your review before any changes are saved</p>
        </div>
      )}
    </div>
  );
}
