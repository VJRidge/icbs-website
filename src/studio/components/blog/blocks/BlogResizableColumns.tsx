import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { adjustAdjacentColumnWidths } from '../../../lib/blog/columnLayouts';

type Props = {
  widths: number[];
  gap: number;
  onWidthsChange?: (widths: number[]) => void;
  showHandles: boolean;
  children: ReactNode[];
};

export default function BlogResizableColumns({ widths, gap, onWidthsChange, showHandles, children }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; startX: number; startWidths: number[] } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      const row = rowRef.current;
      if (!drag || !row || !onWidthsChange) return;
      const w = row.getBoundingClientRect().width;
      if (w <= 0) return;
      const pairTotal = drag.startWidths[drag.index]! + drag.startWidths[drag.index + 1]!;
      const deltaWeight = ((e.clientX - drag.startX) / w) * pairTotal;
      onWidthsChange(adjustAdjacentColumnWidths(drag.startWidths, drag.index, deltaWeight));
    },
    [onWidthsChange],
  );

  const onUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, onMove, onUp]);

  const startDrag = (index: number, e: React.MouseEvent) => {
    if (!onWidthsChange || !showHandles) return;
    e.preventDefault();
    dragRef.current = { index, startX: e.clientX, startWidths: [...widths] };
    setDragging(true);
  };

  const n = children.length;

  return (
    <div
      ref={rowRef}
      className={`blog-resizable-columns flex w-full items-stretch ${dragging ? 'select-none' : ''}`}
      style={{ gap: showHandles ? 0 : `${gap}px` }}
    >
      {children.flatMap((child, i) => {
        const nodes = [
          <div key={`col-${i}`} className="min-w-0" style={{ flex: `${widths[i] ?? 1} 1 0` }}>
            {child}
          </div>,
        ];
        if (showHandles && i < n - 1) {
          nodes.push(
            <button
              key={`gutter-${i}`}
              type="button"
              aria-label={`Resize between column ${i + 1} and ${i + 2}`}
              onMouseDown={(e) => startDrag(i, e)}
              className={`group/gutter relative z-10 flex w-3 shrink-0 cursor-col-resize items-center justify-center self-stretch touch-none ${
                dragging ? 'bg-brand-blue/15' : ''
              }`}
            >
              <span
                className={`flex h-12 w-1.5 shrink-0 items-center justify-center rounded-full transition-colors ${
                  dragging ? 'bg-brand-blue' : 'bg-slate-300 group-hover/gutter:bg-brand-blue'
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 text-white opacity-80" strokeWidth={2.5} aria-hidden />
              </span>
            </button>,
          );
        }
        return nodes;
      })}
    </div>
  );
}
