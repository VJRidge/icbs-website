import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const STYLES: Record<string, string> = {
  line: 'border-t-2',
  dashed: 'border-t-2 border-dashed',
  dotted: 'border-t-2 border-dotted',
  thick: 'border-t-4',
  double: 'border-t-4 border-double',
};

export default function BlogDividerBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const style = String(block.data.style ?? 'line');
  const color = String(block.data.color ?? '#E8B800');
  const cls = STYLES[style] ?? STYLES.line;

  if (!isEditing) {
    return <hr className={`my-6 ${cls}`} style={{ borderColor: color }} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {Object.keys(STYLES).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateBlock(block.id, { style: s })}
            className={`rounded px-2 py-1 text-xs capitalize ${
              style === s ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500">Color</span>
        <input
          type="color"
          value={color}
          onChange={(e) => updateBlock(block.id, { color: e.target.value })}
          className="h-8 w-8 cursor-pointer rounded border border-slate-200"
        />
      </div>
      <hr className={`mt-2 ${cls}`} style={{ borderColor: color }} />
    </div>
  );
}
