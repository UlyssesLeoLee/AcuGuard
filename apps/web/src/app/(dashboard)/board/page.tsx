'use client';

import { useEffect, useMemo, useState } from 'react';
import { BoardPluginGroup, Plugin } from '@/components/plugins/PluginGroups';
import { Issue } from '@/lib/types';

const columns: Array<{ key: Issue['status']; title: string; tone: string }> = [
  { key: 'todo', title: 'To do', tone: 'from-cyan-400/30 to-blue-500/20' },
  { key: 'in_progress', title: 'In progress', tone: 'from-fuchsia-400/30 to-violet-500/20' },
  { key: 'done', title: 'Done', tone: 'from-emerald-400/30 to-teal-500/20' },
];

const priorityWeight: Record<Issue['priority'], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const timelineSlots = 16;

export default function BoardPage() {
  const [data, setData] = useState<Issue[]>([]);
  const [view, setView] = useState<'kanban' | 'gantt'>('kanban');

  useEffect(() => {
    fetch('/api/issues')
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  const grouped = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      items: data.filter((issue) => issue.status === column.key),
    }));
  }, [data]);

  const ganttRows = useMemo(() => {
    return [...data]
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
      .map((issue, index) => {
        const span = Math.max(3, 8 - priorityWeight[issue.priority]);
        const safeStart = (index * 2 + priorityWeight[issue.priority]) % (timelineSlots - span);

        return {
          ...issue,
          start: safeStart,
          span,
        };
      });
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/30 bg-white/20 p-2 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
        <div className="inline-flex rounded-xl bg-slate-950/80 p-1 text-xs font-semibold text-white/90">
          <button
            onClick={() => setView('kanban')}
            className={`rounded-lg px-3 py-1.5 transition ${
              view === 'kanban' ? 'bg-white text-slate-900 shadow-md' : 'hover:bg-white/20'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView('gantt')}
            className={`rounded-lg px-3 py-1.5 transition ${
              view === 'gantt' ? 'bg-white text-slate-900 shadow-md' : 'hover:bg-white/20'
            }`}
          >
            Gantt
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <BoardPluginGroup>
          {grouped.map((column) => (
            <Plugin key={column.key} title={`${column.title} (${column.items.length})`}>
              <div className="space-y-2">
                {column.items.map((issue) => (
                  <article
                    key={issue.id}
                    className="rounded-xl border border-white/40 bg-gradient-to-br from-white/80 to-white/20 p-3 shadow-md shadow-slate-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className={`mb-2 h-1.5 rounded-full bg-gradient-to-r ${column.tone}`} />
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{issue.priority}</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-800">{issue.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{issue.description}</p>
                  </article>
                ))}
              </div>
            </Plugin>
          ))}
        </BoardPluginGroup>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-white/30 bg-white/20 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-2xl">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Delivery timeline</h2>
            <p className="text-xs text-slate-500">即时渲染 · 优先级驱动</p>
          </header>

          <div className="grid grid-cols-[180px_1fr] gap-y-2 text-xs text-slate-600">
            {ganttRows.map((row) => (
              <div key={row.id} className="contents">
                <div className="truncate pr-2 font-medium text-slate-700">
                  {row.title}
                </div>
                <div className="relative h-8 rounded-lg bg-white/40">
                  <div
                    className="absolute top-1 h-6 rounded-md bg-gradient-to-r from-cyan-500/70 via-violet-500/70 to-fuchsia-500/70 shadow-sm shadow-cyan-900/30"
                    style={{
                      left: `${(row.start / timelineSlots) * 100}%`,
                      width: `${(row.span / timelineSlots) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
