import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const VARIANTS: Record<string, { bg: string; border: string; text: string; defaultIcon: string }> = {
  info: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-900', defaultIcon: '💡' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', defaultIcon: '⚠️' },
  success: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-900', defaultIcon: '✅' },
  error: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900', defaultIcon: '🚫' },
  navy: { bg: 'bg-brand-blue/5', border: 'border-brand-blue/40', text: 'text-brand-blue', defaultIcon: '📌' },
};

export default function BlogCalloutBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const text = String(block.data.text ?? '');
  const icon = String(block.data.icon ?? '');
  const variant = String(block.data.variant ?? 'info');
  const v = VARIANTS[variant] ?? VARIANTS.info;

  if (!isEditing) {
    return (
      <div className={`my-4 flex gap-3 rounded-xl border p-4 ${v.bg} ${v.border}`}>
        <span className="mt-0.5 shrink-0 text-xl">{icon || v.defaultIcon}</span>
        <p className={`text-sm font-medium leading-relaxed ${v.text}`}>{text}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {Object.keys(VARIANTS).map((vk) => (
          <button
            key={vk}
            type="button"
            onClick={() => updateBlock(block.id, { variant: vk })}
            className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
              variant === vk ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {VARIANTS[vk]?.defaultIcon} {vk}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={icon}
          onChange={(e) => updateBlock(block.id, { icon: e.target.value })}
          placeholder="Emoji"
          className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-lg"
        />
        <textarea
          value={text}
          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
          placeholder="Callout text"
          rows={2}
          className="min-w-0 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
