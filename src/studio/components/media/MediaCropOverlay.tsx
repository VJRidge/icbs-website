import { useRef } from 'react';
import { clampCrop, type Size } from '../../lib/media/imageEditOps';

type Rect = { x: number; y: number; width: number; height: number };

export function MediaCropOverlay({
  imageSize,
  selection,
  onChange,
}: {
  imageSize: Size;
  selection: Rect;
  onChange: (next: Rect) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: 'draw' | 'move'; startX: number; startY: number; orig: Rect } | null>(null);

  const toImage = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width < 1 || rect.height < 1) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * imageSize.width,
      y: ((clientY - rect.top) / rect.height) * imageSize.height,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toImage(event.clientX, event.clientY);
    const inside =
      point.x >= selection.x &&
      point.x <= selection.x + selection.width &&
      point.y >= selection.y &&
      point.y <= selection.y + selection.height;
    dragRef.current = {
      mode: inside ? 'move' : 'draw',
      startX: point.x,
      startY: point.y,
      orig: selection,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toImage(event.clientX, event.clientY);
    if (drag.mode === 'move') {
      onChange(
        clampCrop(
          {
            x: drag.orig.x + (point.x - drag.startX),
            y: drag.orig.y + (point.y - drag.startY),
            width: drag.orig.width,
            height: drag.orig.height,
          },
          imageSize,
        ),
      );
      return;
    }
    const x = Math.min(drag.startX, point.x);
    const y = Math.min(drag.startY, point.y);
    onChange(
      clampCrop(
        {
          x,
          y,
          width: Math.abs(point.x - drag.startX),
          height: Math.abs(point.y - drag.startY),
        },
        imageSize,
      ),
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const left = `${(selection.x / imageSize.width) * 100}%`;
  const top = `${(selection.y / imageSize.height) * 100}%`;
  const width = `${(selection.width / imageSize.width) * 100}%`;
  const height = `${(selection.height / imageSize.height) * 100}%`;

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="pointer-events-none absolute overflow-hidden border-2 border-white"
        style={{ left, top, width, height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
      />
    </div>
  );
}
