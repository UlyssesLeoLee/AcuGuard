'use client';

import { useEffect, useRef } from 'react';
import { EventBus } from './bus';

export function useEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return EventBus.on<T>(event, (payload) => handlerRef.current(payload));
  }, [event]);
}
