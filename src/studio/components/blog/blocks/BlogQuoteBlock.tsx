import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const STYLES: Record<string, string> = {
  pullquote: 'border-l-4 border-brand-yellow pl-6 italic',
  blockquote: 'border-l-4 border-brand-blue pl-6',
  highlight: 'rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-6',
};

export default function BlogQuoteBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const text = String(block.data.text ?? '');
  const attribution = String(block.data.attribution ?? '');
  const style = String(block.data.style ?? 'pullquote');
  const cls = STYLES[style] ?? STYLES.pullquote;

  if (!isEditing) {
    return (
      <blockquote className={`my-4 ${cls}`}>
        <p className="text-lg font-medium leading-relaxed text-slate-700">{text}</p>
        {attribution.trim() ? <footer className="mt-2 text-sm not-italic text-slate-500">— {attribution}</footer> : null}
      </blockquote>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {(['pullquote', 'blockquote', 'highlight'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateBlock(block.id, { style: s })}
            className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
              style === s ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
        placeholder="Quote text"
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm italic"
      />
      <input
        value={attribution}
        onChange={(e) => updateBlock(block.id, { attribution: e.target.value })}
        placeholder="Attribution (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}
