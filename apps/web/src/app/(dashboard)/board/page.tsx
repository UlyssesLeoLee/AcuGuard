'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

const PRIORITY_HEX: Record<Issue['priority'], string> = {
  high: '#f43f5e',
  medium: '#fbbf24',
  low: '#cbd5e1',
};

const STATUS_ICON_COLOR: Record<IssueStatus, string> = {
  todo: 'text-slate-400',
  in_progress: 'text-blue-500',
  done: 'text-emerald-500',
};

// Physics constants
const REPULSION_RADIUS = 120;
const REPULSION_STRENGTH = 18;
const SPRING_K = 0.13;
const DAMPING = 0.74;

export default function BoardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('kanban');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<IssueStatus | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{ targetId: string; placeAfter: boolean } | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, IssueStatus>>({});

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDraggingId = useRef<string | null>(null);
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null);
  const [touchGhost, setTouchGhost] = useState<{ x: number; y: number } | null>(null);
  const touchGhostRef = useRef<HTMLDivElement | null>(null);
  const touchGhostOffset = useRef<{ x: number; y: number }>({ x: 16, y: 16 });
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollFrame = useRef<number | null>(null);
  const autoScrollVelocity = useRef(0);

  // FLIP animation state
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevPositions = useRef<Map<string, DOMRect>>(new Map());
  const draggingCardHeight = useRef<number>(80);

  // Physics state — inner wrapper refs separate from FLIP outer wrappers
  const physicsWrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const draggingIdRef = useRef<string | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const physicsSpring = useRef<Map<string, { y: number; vy: number }>>(new Map());
  const physicsRafId = useRef<number | null>(null);

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

  const grouped = useMemo(() => {
    const visibleIssues = draggingId ? displayIssues.filter((i) => i.id !== draggingId) : displayIssues;
    const issuesWithPreviewOrder = [...visibleIssues];
    if (draggingId && hoverTarget) {
      const draggingIssue = displayIssues.find((item) => item.id === draggingId);
      const targetIndex = issuesWithPreviewOrder.findIndex((item) => item.id === hoverTarget.targetId);
      if (draggingIssue && targetIndex !== -1) {
        const insertAt = hoverTarget.placeAfter ? targetIndex + 1 : targetIndex;
        issuesWithPreviewOrder.splice(insertAt, 0, draggingIssue);
      }
    }
    return COLUMNS.map((col) => ({ ...col, items: issuesWithPreviewOrder.filter((i) => i.status === col.key) }));
  }, [displayIssues, draggingId, hoverTarget]);

  function snapshotPositions() {
    cardRefs.current.forEach((el, id) => {
      prevPositions.current.set(id, el.getBoundingClientRect());
    });
  }

  // FLIP: animate cards from previous layout positions to new ones
  useLayoutEffect(() => {
    const toAnimate: [HTMLDivElement, number][] = [];

    cardRefs.current.forEach((el, id) => {
      const prev = prevPositions.current.get(id);
      const next = el.getBoundingClientRect();
      prevPositions.current.set(id, next);
      if (!prev) return;
      const dy = prev.top - next.top;
      if (Math.abs(dy) >= 1) toAnimate.push([el, dy]);
    });

    toAnimate.forEach(([el, dy]) => {
      el.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0px)' }],
        { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'none' },
      );
    });
  }, [grouped]);

  // Physics loop — applies spring-based repulsion to inner wrappers while dragging
  function physicsLoop() {
    let anyActive = false;

    physicsWrapperRefs.current.forEach((el, id) => {
      if (id === draggingIdRef.current) return;
      const state = physicsSpring.current.get(id) ?? { y: 0, vy: 0 };

      let targetY = 0;
      const cursor = cursorRef.current;
      if (draggingIdRef.current !== null && cursor !== null) {
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const centerX = rect.left + rect.width / 2;
        // Blend X distance at half weight so only same-column cards are strongly repelled
        const dist = Math.hypot((centerX - cursor.x) * 0.4, centerY - cursor.y);
        if (dist < REPULSION_RADIUS) {
          const t = 1 - dist / REPULSION_RADIUS;
          targetY = Math.sign(centerY - cursor.y) * t * t * REPULSION_STRENGTH;
        }
      }

      state.vy = state.vy * DAMPING + (targetY - state.y) * SPRING_K;
      state.y += state.vy;
      physicsSpring.current.set(id, state);

      if (Math.abs(state.y) > 0.05 || Math.abs(state.vy) > 0.05) {
        anyActive = true;
        el.style.transform = `translateY(${state.y.toFixed(2)}px)`;
      } else if (el.style.transform) {
        el.style.transform = '';
        state.y = 0;
        state.vy = 0;
      }
    });

    if (anyActive || draggingIdRef.current !== null) {
      physicsRafId.current = requestAnimationFrame(physicsLoop);
    } else {
      physicsRafId.current = null;
    }
  }

  function startPhysics() {
    if (physicsRafId.current !== null) return;
    physicsRafId.current = requestAnimationFrame(physicsLoop);
  }

  function clearAllPhysicsTransforms() {
    physicsWrapperRefs.current.forEach((el) => {
      el.style.transition = '';
      el.style.transform = '';
      el.style.boxShadow = '';
    });
    physicsSpring.current.clear();
  }

  function applyCardTilt(id: string, e: React.MouseEvent) {
    const el = physicsWrapperRefs.current.get(id);
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - rect.left) / rect.width * 2 - 1;
    const dy = (e.clientY - rect.top) / rect.height * 2 - 1;
    el.style.transition = 'none';
    el.style.transform = `perspective(500px) rotateX(${(-dy * 5).toFixed(1)}deg) rotateY(${(dx * 5).toFixed(1)}deg) translateY(-3px) scale(1.02)`;
    el.style.boxShadow = `${(dx * 6).toFixed(1)}px ${(dy * 6 - 14).toFixed(1)}px 28px rgba(0,0,0,0.14)`;
  }

  function resetCardTilt(id: string) {
    const el = physicsWrapperRefs.current.get(id);
    if (!el) return;
    el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease';
    el.style.transform = '';
    el.style.boxShadow = '';
  }

  function stopAutoScroll() {
    if (autoScrollFrame.current !== null) {
      cancelAnimationFrame(autoScrollFrame.current);
      autoScrollFrame.current = null;
    }
    autoScrollVelocity.current = 0;
  }

  function startAutoScroll() {
    if (autoScrollFrame.current !== null) return;
    const tick = () => {
      const container = boardScrollRef.current;
      if (!container) { stopAutoScroll(); return; }
      const velocity = autoScrollVelocity.current;
      if (velocity === 0) { autoScrollFrame.current = null; return; }
      container.scrollLeft += velocity;
      autoScrollFrame.current = requestAnimationFrame(tick);
    };
    autoScrollFrame.current = requestAnimationFrame(tick);
  }

  function updateAutoScroll(clientX: number) {
    const container = boardScrollRef.current;
    if (!container) return;
    const edgeThreshold = 72;
    const maxVelocity = 16;
    const rect = container.getBoundingClientRect();
    const leftDistance = clientX - rect.left;
    const rightDistance = rect.right - clientX;
    let velocity = 0;
    if (leftDistance < edgeThreshold) velocity = -((edgeThreshold - leftDistance) / edgeThreshold) * maxVelocity;
    else if (rightDistance < edgeThreshold) velocity = ((edgeThreshold - rightDistance) / edgeThreshold) * maxVelocity;
    if (velocity < 0 && container.scrollLeft <= 0) velocity = 0;
    if (velocity > 0 && container.scrollLeft + container.clientWidth >= container.scrollWidth) velocity = 0;
    autoScrollVelocity.current = velocity;
    if (velocity === 0) { stopAutoScroll(); return; }
    startAutoScroll();
  }

  useEffect(() => () => { stopAutoScroll(); draggingIdRef.current = null; }, []);

  function onDragStart(id: string, e: React.DragEvent) {
    const cardEl = cardRefs.current.get(id);
    if (cardEl) draggingCardHeight.current = cardEl.getBoundingClientRect().height;
    snapshotPositions();
    // Clear any tilt state before physics takes over
    clearAllPhysicsTransforms();
    draggingIdRef.current = id;
    setDraggingId(id);
    autoScrollVelocity.current = 0;
    startPhysics();

    const issue = issues.find((i) => i.id === id);
    if (issue) {
      const color = PRIORITY_HEX[issue.priority];
      const ghost = document.createElement('div');
      ghost.style.cssText =
        'position:fixed;top:-1000px;left:0;border-radius:12px;background:white;border:1px solid #e2e8f0;border-left:3px solid #6366f1;padding:12px 14px;width:210px;box-shadow:0 20px 40px -10px rgba(0,0,0,0.2);transform:rotate(2deg);';
      ghost.innerHTML = `<div style="display:flex;align-items:flex-start;gap:8px"><div style="margin-top:3px;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div><p style="margin:0;font-size:12px;font-weight:600;color:#1e293b;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${issue.title}</p></div>`;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 105, 24);
      setTimeout(() => { if (document.body.contains(ghost)) document.body.removeChild(ghost); }, 0);
    }
  }

  function onDragOver(e: React.DragEvent, colKey: IssueStatus) {
    e.preventDefault();
    cursorRef.current = { x: e.clientX, y: e.clientY };
    setDragOverCol(colKey);
    if (draggingId) updateAutoScroll(e.clientX);
  }

  function onDrop(colKey: IssueStatus) {
    if (!draggingId) return;
    snapshotPositions();
    draggingIdRef.current = null;
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
    stopAutoScroll();
    snapshotPositions();
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverCol(null);
    setHoverTarget(null);
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
      } else {
        const baseIndex = list.indexOf(targetId);
        if (baseIndex === -1) list.push(sourceId);
        else list.splice(placeAfter ? baseIndex + 1 : baseIndex, 0, sourceId);
      }
      fetch('/api/issues', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: sourceId, orderedIds: list }),
      }).catch(() => {});
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
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    touchStartPoint.current = { x: touch.clientX, y: touch.clientY };
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      const cardEl = cardRefs.current.get(id);
      if (cardEl) draggingCardHeight.current = cardEl.getBoundingClientRect().height;
      snapshotPositions();
      clearAllPhysicsTransforms();
      draggingIdRef.current = id;
      touchDraggingId.current = id;
      setDraggingId(id);
      const rect = cardEl?.getBoundingClientRect();
      touchGhostOffset.current = rect
        ? { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
        : { x: 16, y: 16 };
      setTouchGhost({ x: touch.clientX - touchGhostOffset.current.x, y: touch.clientY - touchGhostOffset.current.y });
      cursorRef.current = { x: touch.clientX, y: touch.clientY };
      startPhysics();
      const col = detectColumnFromPoint(touch.clientX, touch.clientY);
      if (col) setDragOverCol(col);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
    }, 300);
  }

  function handleTouchMove(touch: Touch, preventDefault?: () => void) {
    if (!touch) return;
    const activeId = touchDraggingId.current;
    const start = touchStartPoint.current;
    if (!activeId && start) {
      const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
      if (moved > 8) clearLongPressTimer();
    }
    if (!activeId) return;
    preventDefault?.();
    cursorRef.current = { x: touch.clientX, y: touch.clientY };
    updateAutoScroll(touch.clientX);
    if (touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX - touchGhostOffset.current.x}px`;
      touchGhostRef.current.style.top = `${touch.clientY - touchGhostOffset.current.y}px`;
    }
    setDragOverCol(detectColumnFromPoint(touch.clientX, touch.clientY));

    const hoverEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLElement>('[data-issue-id]');
    if (hoverEl && hoverEl.dataset.issueId && hoverEl.dataset.issueId !== activeId) {
      const rect = hoverEl.getBoundingClientRect();
      const newTarget = { targetId: hoverEl.dataset.issueId, placeAfter: touch.clientY > rect.top + rect.height / 2 };
      if (!hoverTarget || hoverTarget.targetId !== newTarget.targetId || hoverTarget.placeAfter !== newTarget.placeAfter) {
        snapshotPositions();
        setHoverTarget(newTarget);
      }
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    handleTouchMove(touch, () => e.preventDefault());
  }

  function finishTouchDrag(touch?: Touch) {
    clearLongPressTimer();
    const activeId = touchDraggingId.current;
    if (!activeId) return;
    const dropElement = touch
      ? document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLElement>('[data-issue-id]')
      : null;
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
    stopAutoScroll();
    snapshotPositions();
    draggingIdRef.current = null;
    touchDraggingId.current = null;
    touchStartPoint.current = null;
    setTouchGhost(null);
    setDraggingId(null);
    setDragOverCol(null);
    setHoverTarget(null);
  }

  function onTouchEnd(e: React.TouchEvent) {
    finishTouchDrag(e.changedTouches[0]);
  }

  useEffect(() => {
    if (!draggingId || !touchDraggingId.current) return;
    const onWindowTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      handleTouchMove(touch);
    };
    const onWindowTouchEnd = (event: TouchEvent) => {
      finishTouchDrag(event.changedTouches[0]);
    };
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: false });
    return () => {
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
    };
  }, [draggingId, dragOverCol, hoverTarget]);

  const touchGhostIssue = touchGhost && draggingId
    ? displayIssues.find((item) => item.id === draggingId)
    : null;
  const touchGhostAssignee = touchGhostIssue?.assigneeId
    ? users.find((u) => u.id === touchGhostIssue.assigneeId)
    : null;

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
        <div
          ref={boardScrollRef}
          onDragOver={(e) => { if (draggingId) { cursorRef.current = { x: e.clientX, y: e.clientY }; updateAutoScroll(e.clientX); } }}
          onDrop={stopAutoScroll}
          className="flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar snap-x snap-mandatory"
        >
          {grouped.map((col) => {
            const ColIcon = col.Icon;
            const isDragTarget = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                data-col-key={col.key}
                className={`shrink-0 w-[78vw] max-w-[300px] snap-center rounded-2xl border-2 transition-all duration-200 ${
                  isDragTarget
                    ? 'border-indigo-400 bg-indigo-50/60 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]'
                    : 'border-slate-200 bg-white/60'
                }`}
                onDragOver={(e) => onDragOver(e, col.key)}
                onDrop={() => onDrop(col.key)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null);
                }}
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

                    if (isDragging) {
                      return (
                        <div
                          key={issue.id}
                          data-issue-id={issue.id}
                          className="rounded-xl border-2 border-dashed border-indigo-300/70 bg-indigo-50/40"
                          style={{ height: draggingCardHeight.current }}
                        />
                      );
                    }

                    return (
                      // Outer layout shell: FLIP target, drag handlers, cursor
                      <div
                        key={issue.id}
                        data-issue-id={issue.id}
                        draggable
                        ref={(el) => {
                          if (el) cardRefs.current.set(issue.id, el);
                          else cardRefs.current.delete(issue.id);
                        }}
                        onDragStart={(e) => onDragStart(issue.id, e)}
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
                        onDragEnter={(e) => {
                          if (!draggingId || draggingId === issue.id) return;
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          const placeAfter = e.clientY > rect.top + rect.height / 2;
                          snapshotPositions();
                          setHoverTarget({ targetId: issue.id, placeAfter });
                        }}
                        onMouseMove={(e) => {
                          if (draggingId) return;
                          applyCardTilt(issue.id, e);
                        }}
                        onMouseLeave={() => {
                          if (draggingId) return;
                          resetCardTilt(issue.id);
                        }}
                        className="touch-none select-none [-webkit-touch-callout:none] cursor-grab active:cursor-grabbing"
                      >
                        {/* Inner visual card: physics repulsion + tilt transforms applied here */}
                        <div
                          ref={(el) => {
                            if (el) physicsWrapperRefs.current.set(issue.id, el);
                            else physicsWrapperRefs.current.delete(issue.id);
                          }}
                          className={`rounded-xl bg-white border border-slate-100 border-l-2 ${col.accentBorder} p-3 shadow-sm`}
                          style={{ willChange: 'transform', transformStyle: 'preserve-3d' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[issue.priority]}`} />
                            <GripVertical size={13} className="text-slate-300 -mr-0.5" />
                          </div>
                          <Link href={`/issues/${issue.id}`} draggable={false}>
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
                <div className="flex items-center gap-2 mb-2.5">
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

      {/* Touch drag ghost */}
      {touchGhost && touchGhostIssue && (
        <div
          ref={touchGhostRef}
          className="pointer-events-none fixed z-50 rounded-xl bg-white p-3 shadow-2xl opacity-[0.97]"
          style={{
            left: touchGhost.x,
            top: touchGhost.y,
            width: 230,
            transform: 'rotate(3deg)',
            border: '1px solid #e2e8f0',
            borderLeft: '3px solid #6366f1',
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[touchGhostIssue.priority]}`} />
            <GripVertical size={13} className="text-slate-300 -mr-0.5" />
          </div>
          <p className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2">
            {touchGhostIssue.title}
          </p>
          {touchGhostAssignee && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-700">
                {getInitials(touchGhostAssignee.name)}
              </div>
              <span className="text-[10px] text-slate-500 truncate">{touchGhostAssignee.name.split(' ')[0]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
