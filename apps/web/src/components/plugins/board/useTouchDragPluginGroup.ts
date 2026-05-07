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

type TouchPoint = Pick<Touch, 'identifier' | 'clientX' | 'clientY'>;

export function useTouchDragPluginGroup(params: UseTouchDragPluginGroupParams) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const touchIdentifierRef = useRef<number | null>(null);
  const latestTouchPointRef = useRef<Point | null>(null);
  const ghostOffsetRef = useRef<Point>({ x: 16, y: 16 });
  const [touchGhost, setTouchGhost] = useState<Point | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const beginTouch = useCallback((id: string, touch: TouchPoint) => {
    startPointRef.current = { x: touch.clientX, y: touch.clientY };
    latestTouchPointRef.current = { x: touch.clientX, y: touch.clientY };
    touchIdentifierRef.current = touch.identifier;
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      const startPoint = latestTouchPointRef.current ?? { x: touch.clientX, y: touch.clientY };
      const { ghostOffset } = params.onDragStart(id, startPoint);
      activeIdRef.current = id;
      ghostOffsetRef.current = ghostOffset;
      setTouchGhost({ x: startPoint.x - ghostOffset.x, y: startPoint.y - ghostOffset.y });
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
    }, 300);
  }, [clearLongPressTimer, params]);

  const moveTouch = useCallback((touch: TouchPoint, preventDefault?: () => void) => {
    if (touchIdentifierRef.current !== null && touch.identifier !== touchIdentifierRef.current) return;
    latestTouchPointRef.current = { x: touch.clientX, y: touch.clientY };
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

  const finishTouch = useCallback((touch?: TouchPoint) => {
    if (touch && touchIdentifierRef.current !== null && touch.identifier !== touchIdentifierRef.current) return;
    clearLongPressTimer();
    const activeId = activeIdRef.current;
    if (!activeId) {
      startPointRef.current = null;
      latestTouchPointRef.current = null;
      touchIdentifierRef.current = null;
      params.onDragCancel();
      return;
    }
    const point = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
    params.onDragEnd(activeId, point);
    activeIdRef.current = null;
    startPointRef.current = null;
    latestTouchPointRef.current = null;
    touchIdentifierRef.current = null;
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
