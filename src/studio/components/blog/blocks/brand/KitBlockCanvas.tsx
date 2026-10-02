import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BlogBlock } from '../../../../lib/blog/blogBlockTypes';
import { useBlogEditorStore } from '../../../../lib/blog/useBlogEditorStore';
import { useBlogAdminMediaLibrary } from '../../../../contexts/BlogAdminMediaLibraryContext';
import { KitBlockView, KitEditContext, type KitEditApi } from './KitBlocks';

const DESKTOP_WIDTH = 1280;

/** Scales a desktop-width render down to the canvas so the editor shows the real layout. */
function KitCanvasFrame({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const s = Math.min(1, o.clientWidth / DESKTOP_WIDTH);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="overflow-hidden rounded-lg" style={{ height: height ?? undefined }}>
      <div
        ref={inner}
        style={{ width: DESKTOP_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left', fontFamily: 'var(--serif)', color: 'var(--ink)' }}
      >
        {children}
      </div>
    </div>
  );
}

function EditableKitBlock({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const blockRef = useRef(block);
  blockRef.current = block;

  const api = useMemo<KitEditApi>(
    () => ({
      setField: (key, value) => updateBlock(blockRef.current.id, { [key]: value }),
      setRowField: (list, index, field, value) => {
        const current = blockRef.current.data[list];
        const next = Array.isArray(current) ? [...(current as Record<string, string>[])] : [];
        next[index] = { ...(next[index] ?? {}), [field]: value };
        updateBlock(blockRef.current.id, { [list]: next });
      },
      pickImage: (onPick) => openMediaLibrary(onPick),
    }),
    [updateBlock, openMediaLibrary],
  );

  return (
    <KitEditContext.Provider value={api}>
      <KitCanvasFrame>
        <KitBlockView block={block} />
      </KitCanvasFrame>
    </KitEditContext.Provider>
  );
}

export default function KitBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  if (!isEditing) return <KitBlockView block={block} />;
  return <EditableKitBlock block={block} />;
}
