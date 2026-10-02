import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

/** Visual-only signup strip (wire to your ESP later). */
export default function BlogNewsletterBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const title = String(block.data.title ?? '');
  const subtitle = String(block.data.subtitle ?? '');
  const placeholder = String(block.data.placeholder ?? '');
  const buttonText = String(block.data.buttonText ?? '');

  if (!isEditing) {
    return (
      <section className="my-8 rounded-2xl bg-slate-900 px-6 py-10 text-center text-white">
        <h3 className="text-xl font-black text-brand-yellow">{title}</h3>
        {subtitle.trim() ? <p className="mt-2 text-sm text-white/80">{subtitle}</p> : null}
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            type="email"
            name="newsletter-email"
            placeholder={placeholder}
            readOnly
            className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50"
          />
          <button
            type="button"
            disabled
            className="rounded-xl bg-brand-yellow px-6 py-3 text-xs font-black uppercase tracking-widest text-brand-blue opacity-70"
          >
            {buttonText}
          </button>
        </div>
        <p className="mt-3 text-[10px] text-white/40">Connect your email provider in a future update to collect signups.</p>
      </section>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <input
        value={title}
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
        placeholder="Title"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      <textarea
        value={subtitle}
        onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
        placeholder="Subtitle"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        value={placeholder}
        onChange={(e) => updateBlock(block.id, { placeholder: e.target.value })}
        placeholder="Input placeholder"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
      />
      <input
        value={buttonText}
        onChange={(e) => updateBlock(block.id, { buttonText: e.target.value })}
        placeholder="Button text"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-black uppercase"
      />
    </div>
  );
}
