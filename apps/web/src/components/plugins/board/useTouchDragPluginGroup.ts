import { useCallback, useEffect, useRef, useState } from 'react';
import { IssueStatus } from '@/lib/types';

interface Point { x: number; y: number }

interface UseTouchDragPluginGroupParams {
  detectColumnFromPoint: (x: number, y: number) => IssueStatus | null;
  onDragStart: (id: string, touch: Point) => { ghostOffset: Point };
  onDragMove: (id: string, touch: Point) => void;
  onDragReorderPreview: (id: string, touch: Point) => void;
  onDragEnd: (id: string, touch?: Point) => void;
  onDragCancel: () => void;
}

export function useTouchDragPluginGroup(params: UseTouchDragPluginGroupParams) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const ghostOffsetRef = useRef<Point>({ x: 16, y: 16 });
  const [touchGhost, setTouchGhost] = useState<Point | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const beginTouch = useCallback((id: string, touch: Pick<Touch, 'clientX' | 'clientY'>) => {
    startPointRef.current = { x: touch.clientX, y: touch.clientY };
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      const { ghostOffset } = params.onDragStart(id, { x: touch.clientX, y: touch.clientY });
      activeIdRef.current = id;
      ghostOffsetRef.current = ghostOffset;
      setTouchGhost({ x: touch.clientX - ghostOffset.x, y: touch.clientY - ghostOffset.y });
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
    }, 300);
  }, [clearLongPressTimer, params]);

  const moveTouch = useCallback((touch: Pick<Touch, 'clientX' | 'clientY'>, preventDefault?: () => void) => {
    const activeId = activeIdRef.current;
    const start = startPointRef.current;
    if (!activeId && start) {
      const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
      if (moved > 8) clearLongPressTimer();
    }
    if (!activeId) return;
    preventDefault?.();
    const point = { x: touch.clientX, y: touch.clientY };
    params.onDragMove(activeId, point);
    setTouchGhost({ x: touch.clientX - ghostOffsetRef.current.x, y: touch.clientY - ghostOffsetRef.current.y });
    params.onDragReorderPreview(activeId, point);
  }, [clearLongPressTimer, params]);

  const finishTouch = useCallback((touch?: Pick<Touch, 'clientX' | 'clientY'>) => {
    clearLongPressTimer();
    const activeId = activeIdRef.current;
    if (!activeId) {
      params.onDragCancel();
      return;
    }
    const point = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
    params.onDragEnd(activeId, point);
    activeIdRef.current = null;
    startPointRef.current = null;
    setTouchGhost(null);
  }, [clearLongPressTimer, params]);

  useEffect(() => () => {
    clearLongPressTimer();
    activeIdRef.current = null;
  }, [clearLongPressTimer]);

  return {
    touchGhost,
    onTouchStartCard: beginTouch,
    onTouchMoveCard: moveTouch,
    onTouchEndCard: finishTouch,
  };
}
