import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { safeHref } from '../../../lib/blog/safeHref';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogCardBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const title = String(block.data.title ?? '');
  const body = String(block.data.body ?? '');
  const image = String(block.data.image ?? '');
  const link = String(block.data.link ?? '');
  const linkText = String(block.data.linkText ?? 'Learn more');
  const href = safeHref(link);

  if (!isEditing) {
    return (
      <article className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {image.trim() ? (
          <img src={image.trim()} alt="" className="aspect-video w-full object-cover" loading="lazy" />
        ) : null}
        <div className="p-5">
          <h3 className="text-lg font-black text-brand-blue">{title}</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{body}</p>
          {href ? (
            <a href={href} className="mt-4 inline-block text-xs font-black uppercase tracking-widest text-brand-blue underline" rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
              {linkText}
            </a>
          ) : null}
        </div>
      </article>
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
        value={body}
        onChange={(e) => updateBlock(block.id, { body: e.target.value })}
        placeholder="Body"
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        value={image}
        onChange={(e) => updateBlock(block.id, { image: e.target.value })}
        placeholder="Image URL"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
      />
      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => updateBlock(block.id, { link: e.target.value })}
          placeholder="Link URL"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
        />
        <input
          value={linkText}
          onChange={(e) => updateBlock(block.id, { linkText: e.target.value })}
          placeholder="Link label"
          className="w-32 rounded-lg border border-slate-200 px-2 py-2 text-xs"
        />
      </div>
    </div>
  );
}
