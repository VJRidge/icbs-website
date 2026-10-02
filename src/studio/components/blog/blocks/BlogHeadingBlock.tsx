import { createElement } from 'react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const SIZES: Record<number, string> = {
  1: 'text-4xl font-black',
  2: 'text-3xl font-bold',
  3: 'text-2xl font-bold',
  4: 'text-xl font-semibold',
  5: 'text-lg font-semibold',
  6: 'text-base font-semibold',
};

export default function BlogHeadingBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const level = Math.min(6, Math.max(1, Number(block.data.level) || 2));
  const text = String(block.data.text ?? '');
  const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  if (!isEditing) {
    return createElement(
      tag,
      { className: `${SIZES[level]} leading-tight text-brand-blue` },
      text,
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {[1, 2, 3, 4, 5, 6].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => updateBlock(block.id, { level: l })}
            className={`rounded px-2 py-1 text-xs font-bold transition-colors ${
              level === l ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            H{l}
          </button>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
        placeholder={`Heading ${level}…`}
        className={`w-full border-b-2 border-transparent bg-transparent py-1 font-bold text-brand-blue outline-none transition-colors focus:border-brand-yellow ${SIZES[level]} placeholder:text-slate-300`}
      />
    </div>
  );
}
