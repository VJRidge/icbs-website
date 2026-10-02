import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { safeHref } from '../../../lib/blog/safeHref';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogContactCtaBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const title = String(block.data.title ?? '');
  const body = String(block.data.body ?? '');
  const email = String(block.data.email ?? '').trim();
  const buttonLabel = String(block.data.buttonLabel ?? 'Email us');
  const href = safeHref(email ? `mailto:${email}` : '') ?? '#';

  if (!isEditing) {
    return (
      <section className="my-8 rounded-2xl border-2 border-brand-blue/30 bg-brand-blue/5 px-6 py-8 text-center">
        <h3 className="text-xl font-black text-brand-blue">{title}</h3>
        {body.trim() ? <p className="mt-3 text-sm font-medium text-slate-600">{body}</p> : null}
        <a
          href={href}
          className="mt-6 inline-flex rounded-xl bg-brand-blue px-8 py-3 text-xs font-black uppercase tracking-widest text-brand-yellow shadow-md hover:brightness-105"
        >
          {buttonLabel}
        </a>
      </section>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <input
        value={title}
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
        placeholder="Heading"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      <textarea
        value={body}
        onChange={(e) => updateBlock(block.id, { body: e.target.value })}
        placeholder="Short message"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        value={email}
        onChange={(e) => updateBlock(block.id, { email: e.target.value })}
        placeholder="email@example.com"
        type="email"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
      />
      <input
        value={buttonLabel}
        onChange={(e) => updateBlock(block.id, { buttonLabel: e.target.value })}
        placeholder="Button label"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-black uppercase"
      />
    </div>
  );
}
