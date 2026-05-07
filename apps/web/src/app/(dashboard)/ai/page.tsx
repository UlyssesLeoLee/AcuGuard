'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, Square, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Issue, IssuePriority, Project } from '@/lib/types';

type ActionType = 'summary' | 'subtasks' | 'priority' | 'comment';
type ChatChannel = 'default' | 'smoke_test';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ActionType;
  applied?: boolean;
  error?: boolean;
}

const QUICK_ACTIONS: { label: string; action: ActionType; emoji: string }[] = [
  { label: 'Summary', action: 'summary', emoji: '📋' },
  { label: 'Subtasks', action: 'subtasks', emoji: '🔀' },
  { label: 'Priority', action: 'priority', emoji: '🎯' },
  { label: 'Comment', action: 'comment', emoji: '💬' },
];

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
};

const API_KEY_STORAGE_KEY = 'acuguard.user.nvidia_api_key';
const DEFAULT_NVIDIA_API_KEY = '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';

function parsePriority(text: string): IssuePriority | null {
  const lower = text.toLowerCase();
  if (/\bhigh\b/.test(lower)) return 'high';
  if (/\bmedium\b/.test(lower)) return 'medium';
  if (/\blow\b/.test(lower)) return 'low';
  return null;
}

function parseSubtasks(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AIPage() {
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [input, setInput] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(DEFAULT_NVIDIA_API_KEY);
  const [channel, setChannel] = useState<ChatChannel>('default');

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamTextRef = useRef('');

  const userApiKey = useMemo(() => apiKeyInput.trim() || DEFAULT_NVIDIA_API_KEY, [apiKeyInput]);

  const selectedIssue = useMemo(
    () => allIssues.find((i) => i.id === selectedIssueId),
    [allIssues, selectedIssueId],
  );
  const selectedProject = useMemo(
    () => (selectedIssue ? projects.find((p) => p.id === selectedIssue.projectId) : null),
    [projects, selectedIssue],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedKey = window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
    setApiKeyInput(storedKey || DEFAULT_NVIDIA_API_KEY);
  }, []);

  useEffect(() => {
    fetch('/api/issues')
      .then((r) => r.json())
      .then((data: Issue[]) => {
        const list = Array.isArray(data) ? data : [];
        setAllIssues(list);
        setSelectedIssueId((prev) => prev || list[0]?.id || '');
      })
      .catch(() => {});
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: Project[]) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Clear chat when switching issues
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreamText('');
    streamTextRef.current = '';
    setStreaming(false);
  }, [selectedIssueId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamText]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  async function sendMessage(content: string, action?: ActionType) {
    if (!selectedIssue || streaming) return;

    const userMsg: ChatMessage = { id: genId(), role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamText('');
    streamTextRef.current = '';

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(userApiKey ? { 'x-user-api-key': userApiKey } : {}),
        },
        body: JSON.stringify({
          action,
          channel,
          message: action ? undefined : content,
          title: selectedIssue.title,
          description: selectedIssue.description,
          status: selectedIssue.status,
          priority: selectedIssue.priority,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Stream request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break outer;
          try {
            const parsed = JSON.parse(raw) as { text?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              streamTextRef.current += parsed.text;
              setStreamText(streamTextRef.current);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      const finalContent = streamTextRef.current;
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: finalContent,
        action,
        error: !finalContent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong.',
          error: true,
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamText('');
      streamTextRef.current = '';
      abortRef.current = null;
    }
  }

  function cancelStream() {
    abortRef.current?.abort();
  }

  async function applyMessage(msg: ChatMessage) {
    if (!selectedIssue || msg.applied || applyingId) return;
    setApplyingId(msg.id);
    try {
      if (msg.action === 'priority') {
        const priority = parsePriority(msg.content);
        if (!priority) return;
        await fetch('/api/issues', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: selectedIssue.id, priority }),
        });
        setAllIssues((prev) =>
          prev.map((i) => (i.id === selectedIssue.id ? { ...i, priority } : i)),
        );
      } else if (msg.action === 'comment') {
        await fetch('/api/comments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ issueId: selectedIssue.id, body: msg.content, authorId: 'ai' }),
        });
      }
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, applied: true } : m)));
    } catch {
      // silent — user can retry
    } finally {
      setApplyingId(null);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      if (text) sendMessage(text);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100svh - 57px)' }}>
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <Sparkles size={17} className="text-white" />
          </div>

          {/* Issue picker */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowPicker((s) => !s)}
              className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-indigo-300 focus:outline-none"
            >
              {selectedIssue ? (
                <>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLORS[selectedIssue.priority]}`}
                  >
                    {selectedIssue.priority}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-800">
                    {selectedIssue.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {selectedProject?.name} · {STATUS_LABELS[selectedIssue.status] ?? selectedIssue.status}
                  </span>
                </>
              ) : (
                <span className="text-sm text-slate-400">Select an issue…</span>
              )}
              <ChevronDown
                size={14}
                className={`shrink-0 text-slate-400 transition-transform ${showPicker ? 'rotate-180' : ''}`}
              />
            </button>

            {showPicker && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                {allIssues.map((issue) => {
                  const proj = projects.find((p) => p.id === issue.projectId);
                  const sel = issue.id === selectedIssueId;
                  return (
                    <button
                      key={issue.id}
                      onClick={() => {
                        setSelectedIssueId(issue.id);
                        setShowPicker(false);
                      }}
                      className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 transition-colors ${
                        sel ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium ${sel ? 'text-indigo-700' : 'text-slate-800'}`}
                        >
                          {issue.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {proj?.name} · {STATUS_LABELS[issue.status] ?? issue.status} · {issue.priority}
                        </p>
                      </div>
                      {sel && <Check size={14} className="shrink-0 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100">
              <Sparkles size={28} className="text-indigo-500" />
            </div>
            <p className="text-base font-semibold text-slate-700">AI Copilot</p>
            <p className="mt-1.5 max-w-xs text-sm text-slate-400 leading-relaxed">
              Use the quick actions below or ask anything about the selected issue.
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm text-white leading-relaxed">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <div
                className={`max-w-[90%] rounded-2xl rounded-tl-sm border px-4 py-3 shadow-sm ${
                  msg.error
                    ? 'border-red-100 bg-red-50'
                    : 'border-slate-100 bg-white'
                }`}
              >
                {msg.action === 'subtasks' ? (
                  <ol className="space-y-2">
                    {parseSubtasks(msg.content).map((task, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-700">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{task}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p
                    className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      msg.error ? 'text-red-600' : 'text-slate-700'
                    }`}
                  >
                    {msg.content}
                  </p>
                )}

                {/* Apply buttons */}
                {!msg.error && msg.action === 'priority' && parsePriority(msg.content) && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {msg.applied ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <Check size={12} /> Priority updated
                      </span>
                    ) : (
                      <button
                        onClick={() => applyMessage(msg)}
                        disabled={!!applyingId}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {applyingId === msg.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : null}
                        Set priority to {parsePriority(msg.content)}
                      </button>
                    )}
                  </div>
                )}

                {!msg.error && msg.action === 'comment' && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {msg.applied ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <Check size={12} /> Comment posted
                      </span>
                    ) : (
                      <button
                        onClick={() => applyMessage(msg)}
                        disabled={!!applyingId}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {applyingId === msg.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : null}
                        Post comment
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {/* Streaming bubble */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
              {streamText ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {streamText}
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-500 align-text-bottom" />
                </p>
              ) : (
                <div className="flex h-5 items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-4 pt-3">
        {/* Quick action chips */}
        <div className="mb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {QUICK_ACTIONS.map(({ label, action, emoji }) => (
            <button
              key={action}
              onClick={() => sendMessage(`${emoji} ${label}`, action)}
              disabled={streaming || !selectedIssueId}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">Chat Channel</label>
          <div className="flex gap-2">
            <button
              onClick={() => setChannel('default')}
              className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                channel === 'default'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setChannel('smoke_test')}
              className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                channel === 'smoke_test'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Smoke Test
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Smoke Test channel is for early AI feature sanity checks.
          </p>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">NVIDIA API Key</label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-300 focus:outline-none"
            placeholder="nvapi-..."
          />
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => {
                const value = apiKeyInput.trim();
                if (value) {
                  window.localStorage.setItem(API_KEY_STORAGE_KEY, value);
                } else {
                  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
                  setApiKeyInput(DEFAULT_NVIDIA_API_KEY);
                }
              }}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            >
              Save key
            </button>
            <button
              onClick={() => {
                window.localStorage.removeItem(API_KEY_STORAGE_KEY);
                setApiKeyInput(DEFAULT_NVIDIA_API_KEY);
              }}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            >
              Use default key
            </button>
          </div>
        </div>

        {/* Text input row */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedIssueId}
            rows={1}
            placeholder={
              selectedIssue ? `Ask about "${selectedIssue.title}"…` : 'Select an issue to start…'
            }
            className="flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-colors focus:border-indigo-300 focus:outline-none disabled:opacity-50"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />

          {streaming ? (
            <button
              onClick={cancelStream}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-100"
              title="Stop"
            >
              <Square size={15} />
            </button>
          ) : (
            <button
              onClick={() => {
                const text = input.trim();
                if (text) sendMessage(text);
              }}
              disabled={!input.trim() || !selectedIssueId}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              title="Send (Enter)"
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
