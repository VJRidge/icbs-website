import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Options = {
  initial: number;
  min: number;
  max: number;
  /** Positive delta moves handle to the right (widens a left-side panel). */
  invertDelta?: boolean;
};

/** Drag-to-resize panel width (pointer-driven). */
export function useHorizontalPanelResize({ initial, min, max, invertDelta = false }: Options) {
  const [width, setWidth] = useState(initial);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: width };
    },
    [width],
  );

  const onPointerMove = useCallback((_e: ReactPointerEvent) => {}, []);

  const onPointerUp = useCallback((_e: ReactPointerEvent) => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const raw = e.clientX - drag.startX;
      const delta = invertDelta ? -raw : raw;
      const next = Math.min(max, Math.max(min, drag.startWidth + delta));
      setWidth(next);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    const stop = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('blur', stop);
    };
  }, [invertDelta, max, min]);

  return { width, setWidth, onPointerDown, onPointerMove, onPointerUp };
}
