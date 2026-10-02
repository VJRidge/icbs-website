import type { CSSProperties } from 'react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const VARIANTS = ['fade-up', 'gradient', 'underline'] as const;

export default function BlogAnimatedHeadlineBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const text = String(block.data.text ?? '');
  const variantRaw = String(block.data.variant ?? 'fade-up');
  const variant = VARIANTS.includes(variantRaw as (typeof VARIANTS)[number]) ? variantRaw : 'fade-up';
  const level = Math.min(3, Math.max(1, Number(block.data.level) || 2));
  const Tag = (level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2') as 'h1' | 'h2' | 'h3';

  const words = text.trim().split(/\s+/).filter(Boolean);

  const preview =
    variant === 'gradient' ? (
      <Tag className="blog-animated-headline blog-ah-gradient font-black tracking-tight text-brand-blue">
        <span className="blog-ah-gradient-inner">{text.trim() || 'Your headline'}</span>
      </Tag>
    ) : variant === 'underline' ? (
      <Tag className="blog-animated-headline blog-ah-underline font-black tracking-tight text-brand-blue">
        <span className="blog-ah-underline-inner">{text.trim() || 'Your headline'}</span>
      </Tag>
    ) : (
      <Tag className="blog-animated-headline blog-ah-fade-up font-black tracking-tight text-brand-blue">
        {words.length === 0 ? (
          <span className="text-slate-300">Add headline text…</span>
        ) : (
          words.map((w, i) => (
            <span key={`${w}-${i}`}>
              {i > 0 ? <span className="blog-ah-space"> </span> : null}
              <span className="blog-ah-word" style={{ ['--i']: i } as CSSProperties}>
                {w}
              </span>
            </span>
          ))
        )}
      </Tag>
    );

  if (!isEditing) {
    return <div className="my-6">{preview}</div>;
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] text-slate-500">
        CSS-only animation on load (no JavaScript). Pick a style and heading level; published articles use the same markup.
      </p>
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => updateBlock(block.id, { variant: v })}
            className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase ${variant === v ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {([1, 2, 3] as const).map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => updateBlock(block.id, { level: lv })}
            className={`rounded-lg px-3 py-1.5 text-xs font-black ${level === lv ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600'}`}
          >
            H{lv}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
        placeholder="Headline text"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-lg font-black text-slate-800"
      />
      <div className="rounded-xl border border-dashed border-slate-200 bg-[#fafafa] px-4 py-6">{preview}</div>
    </div>
  );
}
