'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Circle, CircleDot, CheckCircle2, GripVertical, List, LayoutGrid } from 'lucide-react';
import { Issue, IssueStatus } from '@/lib/types';
import { users } from '@/lib/mock-data';
import { getInitials, formatRelativeTime } from '@/lib/utils';

type ViewMode = 'kanban' | 'list';

interface ColumnDef {
  key: IssueStatus;
  title: string;
  Icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  headerBg: string;
  headerText: string;
  accentBorder: string;
  emptyText: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'todo',
    title: 'To Do',
    Icon: Circle,
    headerBg: 'bg-slate-50',
    headerText: 'text-slate-600',
    accentBorder: 'border-l-slate-300',
    emptyText: 'No pending issues',
  },
  {
    key: 'in_progress',
    title: 'In Progress',
    Icon: CircleDot,
    headerBg: 'bg-blue-50',
    headerText: 'text-blue-700',
    accentBorder: 'border-l-blue-500',
    emptyText: 'Nothing in progress',
  },
  {
    key: 'done',
    title: 'Done',
    Icon: CheckCircle2,
    headerBg: 'bg-emerald-50',
    headerText: 'text-emerald-700',
    accentBorder: 'border-l-emerald-500',
    emptyText: 'No completed issues',
  },
];

const PRIORITY_DOT: Record<Issue['priority'], string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-300',
};

const STATUS_ICON_COLOR: Record<IssueStatus, string> = {
  todo: 'text-slate-400',
  in_progress: 'text-blue-500',
  done: 'text-emerald-500',
};

export default function BoardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('kanban');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<IssueStatus | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, IssueStatus>>({});
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDraggingId = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/issues')
      .then((r) => r.json())
      .then((data: Issue[]) => {
        setIssues(data);
        setOrderedIds(data.map((item) => item.id));
      })
      .catch(() => {});
  }, []);

  const displayIssues = useMemo(
    () => {
      const mapped = issues.map((i) => ({ ...i, status: localOverrides[i.id] ?? i.status }));
      const rank = new Map(orderedIds.map((id, index) => [id, index]));
      return [...mapped].sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    },
    [issues, localOverrides, orderedIds],
  );

  const grouped = useMemo(
    () => COLUMNS.map((col) => ({ ...col, items: displayIssues.filter((i) => i.status === col.key) })),
    [displayIssues],
  );

  function onDragStart(id: string) {
    setDraggingId(id);
  }

  function onDragOver(e: React.DragEvent, colKey: IssueStatus) {
    e.preventDefault();
    setDragOverCol(colKey);
  }

  function onDrop(colKey: IssueStatus) {
    if (!draggingId) return;
    setLocalOverrides((prev) => ({ ...prev, [draggingId]: colKey }));
    setDraggingId(null);
    setDragOverCol(null);
    fetch('/api/issues', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: draggingId, status: colKey }),
    }).catch(() => {});
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOverCol(null);
  }

  function detectColumnFromPoint(x: number, y: number): IssueStatus | null {
    if (typeof document === 'undefined') return null;
    const el = document.elementFromPoint(x, y)?.closest('[data-col-key]');
    const colKey = el?.getAttribute('data-col-key');
    return colKey === 'todo' || colKey === 'in_progress' || colKey === 'done' ? colKey : null;
  }

  function reorderByTarget(sourceId: string, targetId: string | null, placeAfter: boolean) {
    setOrderedIds((prev) => {
      const list = prev.length ? [...prev] : issues.map((item) => item.id);
      const from = list.indexOf(sourceId);
      if (from === -1) return prev;
      list.splice(from, 1);
      if (!targetId) {
        list.push(sourceId);
        return list;
      }
      const baseIndex = list.indexOf(targetId);
      if (baseIndex === -1) {
        list.push(sourceId);
        return list;
      }
      const insertAt = placeAfter ? baseIndex + 1 : baseIndex;
      list.splice(insertAt, 0, sourceId);
      return list;
    });
  }

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function onTouchStart(id: string, e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      touchDraggingId.current = id;
      setDraggingId(id);
      const col = detectColumnFromPoint(touch.clientX, touch.clientY);
      if (col) setDragOverCol(col);
    }, 300);
  }

  function onTouchMove(e: React.TouchEvent) {
    const activeId = touchDraggingId.current;
    if (!activeId) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    setDragOverCol(detectColumnFromPoint(touch.clientX, touch.clientY));
  }

  function onTouchEnd(e: React.TouchEvent) {
    clearLongPressTimer();
    const activeId = touchDraggingId.current;
    if (!activeId) return;
    const touch = e.changedTouches[0];
    const dropElement = touch ? document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLElement>('[data-issue-id]') : null;
    if (dropElement && dropElement.dataset.issueId !== activeId) {
      const rect = dropElement.getBoundingClientRect();
      reorderByTarget(activeId, dropElement.dataset.issueId ?? null, touch.clientY > rect.top + rect.height / 2);
    }
    const targetCol = touch ? detectColumnFromPoint(touch.clientX, touch.clientY) : dragOverCol;
    if (targetCol) {
      setLocalOverrides((prev) => ({ ...prev, [activeId]: targetCol }));
      fetch('/api/issues', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: activeId, status: targetCol }),
      }).catch(() => {});
    }
    touchDraggingId.current = null;
    setDraggingId(null);
    setDragOverCol(null);
  }

  return (
    <div className="-mx-4 -mt-4">
      {/* Toolbar */}
      <div className="sticky top-[57px] z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-[17px] font-bold text-slate-900">Board</h1>
        <div className="flex rounded-xl bg-slate-100 p-1 gap-0.5">
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <LayoutGrid size={13} />
            Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <List size={13} />
            List
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        /* ── Kanban view ─────────────────────────────── */
        <div className="flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {grouped.map((col) => {
            const ColIcon = col.Icon;
            const isDragTarget = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                data-col-key={col.key}
                className={`shrink-0 w-[78vw] max-w-[300px] snap-center rounded-2xl border-2 transition-colors ${
                  isDragTarget ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-white/60'
                }`}
                onDragOver={(e) => onDragOver(e, col.key)}
                onDrop={() => onDrop(col.key)}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between rounded-t-2xl px-3.5 py-3 ${col.headerBg}`}>
                  <div className="flex items-center gap-1.5">
                    <ColIcon size={14} className={col.headerText} strokeWidth={2} />
                    <span className={`text-xs font-bold ${col.headerText}`}>{col.title}</span>
                  </div>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/70 px-1.5 text-[10px] font-bold text-slate-600">
                    {col.items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 p-2.5 min-h-[120px]">
                  {col.items.map((issue) => {
                    const assignee = issue.assigneeId ? users.find((u) => u.id === issue.assigneeId) : null;
                    const isDragging = draggingId === issue.id;
                    return (
                      <div
                        key={issue.id}
                        data-issue-id={issue.id}
                        draggable
                        onDragStart={() => onDragStart(issue.id)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!draggingId || draggingId === issue.id) return;
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          reorderByTarget(draggingId, issue.id, e.clientY > rect.top + rect.height / 2);
                        }}
                        onTouchStart={(e) => onTouchStart(issue.id, e)}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        onTouchCancel={onTouchEnd}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`rounded-xl bg-white border border-slate-100 border-l-2 ${col.accentBorder} p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all touch-none ${
                          isDragging ? 'opacity-40 scale-95 rotate-1' : 'hover:-translate-y-0.5 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority]}`} />
                          <GripVertical size={13} className="text-slate-300 -mr-0.5" />
                        </div>
                        <Link href={`/issues/${issue.id}`}>
                          <p className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2 hover:text-indigo-600 transition-colors">
                            {issue.title}
                          </p>
                        </Link>
                        {assignee && (
                          <div className="mt-2.5 flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-700">
                              {getInitials(assignee.name)}
                            </div>
                            <span className="text-[10px] text-slate-500 truncate">{assignee.name.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {col.items.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs text-slate-400">{col.emptyText}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List view ───────────────────────────────── */
        <div className="px-4 py-3 space-y-5">
          {grouped.map((col) => {
            const ColIcon = col.Icon;
            if (col.items.length === 0) return null;
            return (
              <div key={col.key}>
                <div className={`flex items-center gap-2 mb-2.5`}>
                  <ColIcon size={14} className={STATUS_ICON_COLOR[col.key]} strokeWidth={2} />
                  <span className="text-xs font-bold text-slate-600">{col.title}</span>
                  <span className="text-xs text-slate-400">({col.items.length})</span>
                </div>
                <div className="space-y-2">
                  {col.items.map((issue) => {
                    const assignee = issue.assigneeId ? users.find((u) => u.id === issue.assigneeId) : null;
                    return (
                      <Link
                        key={issue.id}
                        href={`/issues/${issue.id}`}
                        className="flex items-center gap-3 rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm active:scale-[0.99] transition-all"
                      >
                        <div className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-slate-900 truncate">{issue.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatRelativeTime(issue.updatedAt)}</p>
                        </div>
                        {assignee && (
                          <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-700">
                            {getInitials(assignee.name)}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
