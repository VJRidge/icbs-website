import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogSpacerBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const height = Number(block.data.height) || 48;

  if (!isEditing) {
    return <div style={{ height }} aria-hidden className="shrink-0" />;
  }

  return (
    <div className="flex items-center gap-4 py-2">
      <div
        className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400"
        style={{ height }}
      >
        Spacer · {height}px
      </div>
      <input
        type="range"
        min={8}
        max={240}
        step={8}
        value={height}
        onChange={(e) => updateBlock(block.id, { height: +e.target.value })}
        className="w-32 accent-brand-blue"
      />
    </div>
  );
}
