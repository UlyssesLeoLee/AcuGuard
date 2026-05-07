// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { useTouchDragPluginGroup } from '@/components/plugins/board/useTouchDragPluginGroup';

type TouchLike = { identifier: number; clientX: number; clientY: number };

type HookApi = ReturnType<typeof useTouchDragPluginGroup>;

function HookHarness({ onReady, params }: { onReady: (api: HookApi) => void; params: Parameters<typeof useTouchDragPluginGroup>[0] }) {
  const api = useTouchDragPluginGroup(params);
  useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe('useTouchDragPluginGroup', () => {
  it('updates touch ghost to follow finger after long press drag starts', () => {
    vi.useFakeTimers();
    const onDragStart = vi.fn(() => ({ ghostOffset: { x: 10, y: 20 } }));
    const onDragMove = vi.fn();
    const onDragReorderPreview = vi.fn();
    const onDragEnd = vi.fn();
    const onDragCancel = vi.fn();

    let api!: HookApi;
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <HookHarness
          params={{
            detectColumnFromPoint: () => null,
            onDragStart,
            onDragMove,
            onDragReorderPreview,
            onDragEnd,
            onDragCancel,
          }}
          onReady={(value) => {
            api = value;
          }}
        />,
      );
    });

    const startTouch: TouchLike = { identifier: 7, clientX: 120, clientY: 220 };
    act(() => {
      api.onTouchStartCard('issue-1', startTouch as Touch);
      vi.advanceTimersByTime(300);
    });

    expect(onDragStart).toHaveBeenCalledWith('issue-1', { x: 120, y: 220 });
    expect(api.touchGhost).toEqual({ x: 110, y: 200 });

    const movedTouch: TouchLike = { identifier: 7, clientX: 180, clientY: 250 };
    const preventDefault = vi.fn();
    act(() => {
      api.onTouchMoveCard(movedTouch as Touch, preventDefault);
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onDragMove).toHaveBeenCalledWith('issue-1', { x: 180, y: 250 });
    expect(onDragReorderPreview).toHaveBeenCalledWith('issue-1', { x: 180, y: 250 });
    expect(api.touchGhost).toEqual({ x: 170, y: 230 });

    act(() => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('cancels pending long press when finger moves too far before activation', () => {
    vi.useFakeTimers();
    const onDragStart = vi.fn(() => ({ ghostOffset: { x: 0, y: 0 } }));
    const onDragCancel = vi.fn();

    let api!: HookApi;
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <HookHarness
          params={{
            detectColumnFromPoint: () => null,
            onDragStart,
            onDragMove: vi.fn(),
            onDragReorderPreview: vi.fn(),
            onDragEnd: vi.fn(),
            onDragCancel,
          }}
          onReady={(value) => {
            api = value;
          }}
        />,
      );
    });

    act(() => {
      api.onTouchStartCard('issue-2', { identifier: 1, clientX: 0, clientY: 0 } as Touch);
      api.onTouchMoveCard({ identifier: 1, clientX: 20, clientY: 0 } as Touch);
      vi.advanceTimersByTime(300);
      api.onTouchEndCard({ identifier: 1, clientX: 20, clientY: 0 } as Touch);
    });

    expect(onDragStart).not.toHaveBeenCalled();
    expect(onDragCancel).toHaveBeenCalledOnce();

    act(() => {
      root.unmount();
    });
    vi.useRealTimers();
  });
});
