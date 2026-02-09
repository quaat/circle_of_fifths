import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SheetState = 'collapsed' | 'mid' | 'expanded';

interface BottomSheetRenderProps {
  headerProps: React.HTMLAttributes<HTMLDivElement>;
  contentProps: React.HTMLAttributes<HTMLDivElement>;
  contentRef: React.Ref<HTMLDivElement>;
}

interface BottomSheetProps {
  children: (props: BottomSheetRenderProps) => React.ReactNode;
  initialState?: SheetState;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const BottomSheet: React.FC<BottomSheetProps> = ({ children, initialState = 'collapsed' }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [sheetState, setSheetState] = useState<SheetState>(initialState);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const translateYRef = useRef(translateY);
  const sheetStateRef = useRef(sheetState);
  const dragState = useRef({
    pointerId: -1,
    origin: 'header' as 'header' | 'content',
    startY: 0,
    startTranslateY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    isDragging: false,
  });

  useEffect(() => {
    translateYRef.current = translateY;
  }, [translateY]);

  useEffect(() => {
    sheetStateRef.current = sheetState;
  }, [sheetState]);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const snapPoints = useMemo(() => {
    // Snap points are based on viewport height so the sheet feels natural on mobile.
    const collapsedVisible = Math.max(140, viewportHeight * 0.2);
    const midVisible = viewportHeight * 0.56;
    const expandedVisible = viewportHeight * 0.9;
    return {
      collapsed: viewportHeight - collapsedVisible,
      mid: viewportHeight - midVisible,
      expanded: viewportHeight - expandedVisible,
    } satisfies Record<SheetState, number>;
  }, [viewportHeight]);

  const snapToState = useCallback(
    (nextState: SheetState) => {
      setSheetState(nextState);
      setTranslateY(snapPoints[nextState]);
    },
    [snapPoints]
  );

  useEffect(() => {
    if (!isDragging) {
      setTranslateY(snapPoints[sheetState]);
    }
  }, [isDragging, sheetState, snapPoints]);

  const getNearestState = useCallback(
    (value: number) => {
      const entries = Object.entries(snapPoints) as Array<[SheetState, number]>;
      return entries.reduce((closest, [state, point]) => {
        if (!closest) return { state, point };
        return Math.abs(point - value) < Math.abs(closest.point - value) ? { state, point } : closest;
      }, null as null | { state: SheetState; point: number })!.state;
    },
    [snapPoints]
  );

  const getVelocitySnapState = useCallback(
    (value: number, velocity: number) => {
      const ordered: Array<[SheetState, number]> = [
        ['expanded', snapPoints.expanded],
        ['mid', snapPoints.mid],
        ['collapsed', snapPoints.collapsed],
      ];
      const nearestState = getNearestState(value);
      const currentIndex = ordered.findIndex(([state]) => state === nearestState);
      if (velocity < -0.6 && currentIndex > 0) {
        return ordered[currentIndex - 1][0];
      }
      if (velocity > 0.6 && currentIndex < ordered.length - 1) {
        return ordered[currentIndex + 1][0];
      }
      return nearestState;
    },
    [getNearestState, snapPoints]
  );

  const startDrag = useCallback((event: React.PointerEvent, origin: 'header' | 'content') => {
    const now = performance.now();
    dragState.current = {
      pointerId: event.pointerId,
      origin,
      startY: event.clientY,
      startTranslateY: translateYRef.current,
      lastY: event.clientY,
      lastTime: now,
      velocity: 0,
      isDragging: false,
    };
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragState.current;
      if (drag.pointerId !== event.pointerId) return;
      const currentY = event.clientY;
      const dy = currentY - drag.startY;
      const now = performance.now();
      const dt = now - drag.lastTime;
      if (dt > 0) {
        drag.velocity = (currentY - drag.lastY) / dt;
      }
      drag.lastY = currentY;
      drag.lastTime = now;

      if (!drag.isDragging) {
        if (drag.origin === 'content') {
          const content = contentRef.current;
          const isDraggingDown = dy > 6;
          const isDraggingUp = dy < -6;
          const canDragDown = content ? content.scrollTop <= 0 && isDraggingDown : false;
          const canDragUp = sheetStateRef.current !== 'expanded' && isDraggingUp;
          // Only start dragging from content if scroll is at top or we're expanding.
          if (canDragDown || canDragUp) {
            drag.isDragging = true;
            setIsDragging(true);
          } else {
            return;
          }
        } else if (Math.abs(dy) > 4) {
          drag.isDragging = true;
          setIsDragging(true);
        } else {
          return;
        }
      }

      if (drag.isDragging) {
        event.preventDefault();
        const minTranslate = snapPoints.expanded;
        const maxTranslate = snapPoints.collapsed;
        const nextTranslate = clamp(drag.startTranslateY + dy, minTranslate, maxTranslate);
        setTranslateY(nextTranslate);
      }
    },
    [snapPoints]
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragState.current;
    if (drag.pointerId === -1) return;
    if (drag.isDragging) {
      const targetState = getVelocitySnapState(translateYRef.current, drag.velocity);
      snapToState(targetState);
    }
    dragState.current.pointerId = -1;
    dragState.current.isDragging = false;
    setIsDragging(false);
  }, [getVelocitySnapState, snapToState]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const headerProps: React.HTMLAttributes<HTMLDivElement> = {
    onPointerDown: (event) => {
      startDrag(event, 'header');
    },
    className: 'touch-none',
  };

  const contentProps: React.HTMLAttributes<HTMLDivElement> = {
    onPointerDown: (event) => {
      startDrag(event, 'content');
    },
    className: 'touch-pan-y',
  };

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-20"
      style={{
        transform: `translateY(${translateY}px)`,
        transition: isDragging ? 'none' : 'transform 220ms ease-out',
        height: '100vh',
      }}
      aria-expanded={sheetState === 'expanded'}
      data-state={sheetState}
    >
      <div className="h-full bg-slate-900/70 backdrop-blur-xl border-t border-white/10 shadow-2xl ring-1 ring-white/10 rounded-t-[28px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="w-16" />
          <div
            className="h-1.5 w-12 rounded-full bg-slate-400/50 shadow-[0_0_6px_rgba(148,163,184,0.6)] touch-none"
            onPointerDown={(event) => startDrag(event, 'header')}
          />
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400">
            <button
              type="button"
              onClick={() => snapToState('expanded')}
              className="px-2 py-1 rounded-full border border-white/10 bg-slate-900/70 hover:text-slate-200"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={() => snapToState('collapsed')}
              className="px-2 py-1 rounded-full border border-white/10 bg-slate-900/70 hover:text-slate-200"
            >
              Collapse
            </button>
          </div>
        </div>
        {children({ headerProps, contentProps, contentRef })}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};
