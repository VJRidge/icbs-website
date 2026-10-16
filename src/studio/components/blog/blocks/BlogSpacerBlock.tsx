import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

function spacerHeight(block: BlogBlock): number {
  return Math.max(8, Math.min(480, Number(block.data.height) || 48));
}

export default function BlogSpacerBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const height = spacerHeight(block);

  if (!isEditing) {
    return <div style={{ height }} aria-hidden className="shrink-0" />;
  }

  return (
    <div className="blog-spacer-edit" style={{ height: Math.max(height, 36) }} title="Spacer">
      <span>Spacer · {height}px</span>
      <input
        type="range"
        min={8}
        max={480}
        step={8}
        value={height}
        aria-label="Spacer height"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => updateBlock(block.id, { height: Number(event.target.value) || 48 })}
        className="ml-3 w-28 accent-brand-blue"
      />
    </div>
  );
}
