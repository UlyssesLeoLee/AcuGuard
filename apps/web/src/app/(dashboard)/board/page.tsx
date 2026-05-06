'use client';

import { useEffect, useMemo, useState } from 'react';
import { BoardPluginGroup, Plugin } from '@/components/plugins/PluginGroups';
import { Issue } from '@/lib/types';

const columns: Array<{ key: Issue['status']; title: string }> = [
  { key: 'todo', title: 'To do' },
  { key: 'in_progress', title: 'In progress' },
  { key: 'done', title: 'Done' },
];

export default function BoardPage() {
  const [data, setData] = useState<Issue[]>([]);

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

  return (
    <BoardPluginGroup>
      {grouped.map((column) => (
        <Plugin key={column.key} title={`${column.title} (${column.items.length})`}>
          <div className="space-y-2">
            {column.items.map((issue) => (
              <article key={issue.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{issue.priority}</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-800">{issue.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{issue.description}</p>
              </article>
            ))}
          </div>
        </Plugin>
      ))}
    </BoardPluginGroup>
  );
}
