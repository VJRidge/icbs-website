import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogIconBoxBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const icon = String(block.data.icon ?? '⭐');
  const title = String(block.data.title ?? '');
  const body = String(block.data.body ?? '');

  if (!isEditing) {
    return (
      <aside className="my-6 flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="text-3xl leading-none" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="font-black text-brand-blue">{title}</h4>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{body}</p>
        </div>
      </aside>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <input
        value={icon}
        onChange={(e) => updateBlock(block.id, { icon: e.target.value })}
        className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-2xl"
        placeholder="🎓"
      />
      <div className="min-w-[12rem] flex-1 space-y-2">
        <input
          value={title}
          onChange={(e) => updateBlock(block.id, { title: e.target.value })}
          placeholder="Title"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
        />
        <textarea
          value={body}
          onChange={(e) => updateBlock(block.id, { body: e.target.value })}
          placeholder="Description"
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
