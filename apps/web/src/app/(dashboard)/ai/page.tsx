'use client';

import { FormEvent, useState } from 'react';
import { Sparkles, ChevronDown, Check, X, Loader2, Zap, KeyRound } from 'lucide-react';
import { issues as allIssues, projects } from '@/lib/mock-data';

interface ActionDef {
  key: string;
  label: string;
  description: string;
  emoji: string;
  gradient: string;
  accentBorder: string;
}

const AI_ACTIONS: ActionDef[] = [
  { key: 'summary', label: 'Summarize', description: 'Generate a delivery-risk–aware summary', emoji: '📋', gradient: 'from-indigo-50 to-violet-50', accentBorder: 'border-indigo-200' },
  { key: 'subtasks', label: 'Break into Subtasks', description: 'Auto-propose actionable subtasks', emoji: '🔀', gradient: 'from-violet-50 to-fuchsia-50', accentBorder: 'border-violet-200' },
  { key: 'priority', label: 'Suggest Priority', description: 'Analyze impact and recommend priority', emoji: '🎯', gradient: 'from-amber-50 to-orange-50', accentBorder: 'border-amber-200' },
  { key: 'comment', label: 'Draft Comment', description: 'Generate a professional status update', emoji: '💬', gradient: 'from-emerald-50 to-teal-50', accentBorder: 'border-emerald-200' },
];

const API_KEY_STORAGE_KEY = 'acuguard.user.nvidia_api_key';

export default function AIPage() {
  const [selectedIssueId, setSelectedIssueId] = useState(allIssues[0]?.id ?? '');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ actionKey: string; text: string } | null>(null);

  const [chatCommand, setChatCommand] = useState('/summary');
  const [chatResult, setChatResult] = useState<string | null>(null);

  const [userApiKey, setUserApiKey] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
  });

  const selectedIssue = allIssues.find((i) => i.id === selectedIssueId);
  const selectedProject = selectedIssue ? projects.find((p) => p.id === selectedIssue.projectId) : null;

  function updateApiKey(value: string) {
    setUserApiKey(value);
    const trimmed = value.trim();
    if (trimmed) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }

  async function runAction(actionKey: string) {
    if (!selectedIssue) return;
    setLoading(actionKey);
    setResult(null);
    try {
      const res = await fetch(`/api/ai/${actionKey}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(userApiKey.trim() ? { 'x-user-api-key': userApiKey.trim() } : {}),
        },
        body: JSON.stringify({ title: selectedIssue.title, description: selectedIssue.description }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI request failed.');
      }

      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [data.suggestions ?? 'No suggestions returned.'];
      setResult({ actionKey, text: suggestions.join('\n\n') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch AI suggestion. Please try again.';
      setResult({ actionKey, text: message });
    } finally {
      setLoading(null);
    }
  }


  async function runChatCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedIssue || !chatCommand.trim()) return;
    setLoading('chat');
    setChatResult(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(userApiKey.trim() ? { 'x-user-api-key': userApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          command: chatCommand.trim(),
          payload: { title: selectedIssue.title, description: selectedIssue.description },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI command failed.');
      }

      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      setChatResult(suggestions.join('\n\n'));
    } catch (error) {
      setChatResult(error instanceof Error ? error.message : 'Failed to run command.');
    } finally {
      setLoading(null);
    }
  }

  const resultAction = result ? AI_ACTIONS.find((a) => a.key === result.actionKey) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm"><Sparkles size={19} className="text-white" /></div>
        <div><h1 className="text-xl font-bold text-slate-900">AI Copilot</h1><p className="text-xs text-slate-400">Human-in-the-loop · confirms before writing</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><KeyRound size={15} className="text-indigo-600" /><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">API Key (Optional)</p></div>
        <input
          value={userApiKey}
          onChange={(e) => updateApiKey(e.target.value)}
          placeholder="nvapi-..."
          type="password"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-400">Use your own NVIDIA API key for this browser. It is stored locally and sent only with AI requests.</p>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chat Commands</p>
        <p className="mt-1 text-[11px] text-slate-400">Use /summary, /subtasks, /priority, /comment to trigger AI actions via chat.</p>
        <form onSubmit={runChatCommand} className="mt-3 flex gap-2">
          <input
            value={chatCommand}
            onChange={(e) => setChatCommand(e.target.value)}
            placeholder="/summary"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading === 'chat' || !selectedIssueId}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading === 'chat' ? 'Running…' : 'Send'}
          </button>
        </form>
        {chatResult && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{chatResult}</p>}
      </div>


      <div>{/* selector */}
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Analyzing Issue</p>
        <button onClick={() => setShowPicker(!showPicker)} className="w-full flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3.5 text-left shadow-sm">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-indigo-100 flex items-center justify-center"><Zap size={15} className="text-indigo-600" /></div>
          <div className="flex-1 min-w-0"><p className="text-[14px] font-semibold text-slate-900 truncate leading-tight">{selectedIssue?.title ?? 'Select an issue'}</p><p className="text-[11px] text-slate-400 mt-0.5">{selectedProject?.name ?? ''} · {selectedIssue?.status?.replace('_', ' ') ?? ''}</p></div>
          <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
        </button>
        {showPicker && <div className="mt-1 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden max-h-60 overflow-y-auto">{allIssues.map((issue) => { const proj = projects.find((p) => p.id === issue.projectId); const isSelected = issue.id === selectedIssueId; return <button key={issue.id} onClick={() => { setSelectedIssueId(issue.id); setShowPicker(false); setResult(null); }} className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}><div className="min-w-0"><p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{issue.title}</p><p className="text-[10px] text-slate-400 mt-0.5">{proj?.name} · {issue.status.replace('_', ' ')}</p></div>{isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}</button>; })}</div>}
      </div>

      <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Actions</p><div className="grid grid-cols-2 gap-3">{AI_ACTIONS.map((action) => { const isLoading = loading === action.key; return <button key={action.key} onClick={() => runAction(action.key)} disabled={!!loading || !selectedIssueId} className={`bg-gradient-to-br ${action.gradient} border ${action.accentBorder} rounded-2xl p-4 text-left transition active:scale-[0.97] disabled:opacity-50`}><span className="text-2xl">{action.emoji}</span><p className="mt-2 text-[13px] font-bold text-slate-800">{action.label}</p><p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{action.description}</p>{isLoading && <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500"><Loader2 size={11} className="animate-spin" /><span>Thinking…</span></div>}</button>; })}</div></div>

      {result && resultAction && <div className="rounded-2xl bg-white border border-indigo-200 shadow-sm overflow-hidden"><div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100"><div className="flex items-center gap-2"><Sparkles size={14} className="text-indigo-600" /><span className="text-[13px] font-bold text-indigo-800">{resultAction.emoji} {resultAction.label}</span></div><button onClick={() => setResult(null)} className="text-slate-400 hover:text-slate-600 transition"><X size={15} /></button></div><div className="px-4 py-4"><p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed">{result.text}</p></div><div className="flex border-t border-slate-100 divide-x divide-slate-100"><button onClick={() => setResult(null)} className="flex-1 py-3 text-sm text-slate-500 hover:bg-slate-50 transition font-medium">Dismiss</button><button className="flex-1 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition">Apply to Issue</button></div></div>}

      {!result && !loading && <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-6 text-center"><p className="text-2xl mb-2">✨</p><p className="text-sm font-medium text-slate-700">Select an issue and run an action</p><p className="text-xs text-slate-400 mt-1">AI suggestions require your review before any changes are saved</p></div>}
    </div>
  );
}
