import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { safeHref } from '../../../lib/blog/safeHref';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const styles = ['primary', 'secondary', 'ghost'] as const;
const aligns = ['left', 'center', 'right'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

function btnClass(style: string, size: string): string {
  const base =
    'inline-flex items-center justify-center rounded-xl font-black uppercase tracking-widest transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-blue';
  const sz =
    size === 'sm' ? 'px-4 py-2 text-[10px]' : size === 'lg' ? 'px-8 py-4 text-sm' : 'px-6 py-3 text-xs';
  if (style === 'secondary') return `${base} ${sz} border-2 border-brand-blue bg-white text-brand-blue hover:bg-slate-50`;
  if (style === 'ghost') return `${base} ${sz} text-brand-blue underline-offset-4 hover:underline`;
  return `${base} ${sz} bg-brand-blue text-brand-yellow shadow-md hover:brightness-105`;
}

export default function BlogButtonBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const text = String(block.data.text ?? 'Click here');
  const url = String(block.data.url ?? '#');
  const href = safeHref(url) ?? '#';
  const style = String(block.data.style ?? 'primary');
  const align = String(block.data.align ?? 'left');
  const size = String(block.data.size ?? 'md');
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  if (!isEditing) {
    return (
      <div className={`my-6 flex ${justify}`}>
        <a href={href} className={btnClass(style, size)} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
          {text}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateBlock(block.id, { style: s })}
            className={`rounded-lg px-2 py-1 text-xs capitalize ${style === s ? 'bg-brand-blue text-brand-yellow' : 'bg-white text-slate-600'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {aligns.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => updateBlock(block.id, { align: a })}
            className={`rounded-lg px-2 py-1 text-xs capitalize ${align === a ? 'bg-brand-blue text-brand-yellow' : 'bg-white text-slate-600'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => updateBlock(block.id, { size: z })}
            className={`rounded-lg px-2 py-1 text-xs uppercase ${size === z ? 'bg-brand-blue text-brand-yellow' : 'bg-white text-slate-600'}`}
          >
            {z}
          </button>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
        placeholder="Button label"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
      />
      <input
        value={url}
        onChange={(e) => updateBlock(block.id, { url: e.target.value })}
        placeholder="https://… or /path"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
      />
      <div className={`flex ${justify} pt-1`}>
        <span className={btnClass(style, size)}>{text || 'Preview'}</span>
      </div>
    </div>
  );
}
