import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const aligns = ['left', 'center', 'right'] as const;

export default function BlogBannerBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const text = String(block.data.text ?? '');
  const subtext = String(block.data.subtext ?? '');
  const bgColor = String(block.data.bgColor ?? '#072a1b');
  const textColor = String(block.data.textColor ?? '#FFFFFF');
  const align = String(block.data.align ?? 'center');
  const textAlign = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  if (!isEditing) {
    return (
      <section
        className={`my-8 rounded-2xl px-6 py-10 shadow-lg ${textAlign}`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <h2 className="text-2xl font-black tracking-tight md:text-3xl">{text}</h2>
        {subtext ? <p className="mt-3 text-sm font-medium opacity-90 md:text-base">{subtext}</p> : null}
      </section>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {aligns.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => updateBlock(block.id, { align: a })}
            className={`rounded-lg px-2 py-1 text-xs capitalize ${align === a ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
        placeholder="Banner headline"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      <input
        value={subtext}
        onChange={(e) => updateBlock(block.id, { subtext: e.target.value })}
        placeholder="Subtext (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-[10px] font-black uppercase text-slate-400">
          Background
          <input
            type="color"
            value={bgColor.length === 7 ? bgColor : '#072a1b'}
            onChange={(e) => updateBlock(block.id, { bgColor: e.target.value })}
            className="h-10 w-full cursor-pointer rounded border border-slate-200"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[10px] font-black uppercase text-slate-400">
          Text
          <input
            type="color"
            value={textColor.length === 7 ? textColor : '#FFFFFF'}
            onChange={(e) => updateBlock(block.id, { textColor: e.target.value })}
            className="h-10 w-full cursor-pointer rounded border border-slate-200"
          />
        </label>
      </div>
      <div className={`rounded-xl px-4 py-6 ${textAlign}`} style={{ backgroundColor: bgColor, color: textColor }}>
        <p className="text-lg font-black">{text || 'Headline'}</p>
        {subtext ? <p className="mt-2 text-xs opacity-90">{subtext}</p> : null}
      </div>
    </div>
  );
}
