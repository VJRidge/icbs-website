import type { PointerEvent as ReactPointerEvent } from 'react';

type Props = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  side: 'left' | 'right';
  label?: string;
};

/** Draggable divider between editor panels. */
export default function CarouselPanelResizeHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  side,
  label = 'Drag to resize',
}: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`group absolute top-0 z-30 flex h-full w-2 shrink-0 cursor-col-resize touch-none items-center justify-center ${
        side === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
      }`}
    >
      <div className="h-12 w-1 rounded-full bg-slate-300 transition group-hover:bg-brand-blue group-active:bg-brand-blue" />
    </div>
  );
}
