import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

function popoverSafeId(blockId: string): string {
  return `blog-pop-${blockId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

const aligns = ['left', 'center', 'right'] as const;

export default function BlogModalPopupBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const triggerLabel = String(block.data.triggerLabel ?? 'Open');
  const title = String(block.data.title ?? '');
  const body = String(block.data.body ?? '');
  const alignTrigger = ['left', 'center', 'right'].includes(String(block.data.alignTrigger))
    ? String(block.data.alignTrigger)
    : 'left';
  const justify = alignTrigger === 'center' ? 'justify-center' : alignTrigger === 'right' ? 'justify-end' : 'justify-start';
  const popId = popoverSafeId(block.id);

  if (!isEditing) {
    return (
      <>
        <div className={`my-6 flex ${justify}`}>
          <button
            type="button"
            className="blog-modal-trigger inline-flex items-center justify-center rounded-xl bg-brand-blue px-6 py-3 text-xs font-black uppercase tracking-widest text-brand-yellow shadow-md transition hover:brightness-105"
            popoverTarget={popId}
            popoverTargetAction="toggle"
          >
            {triggerLabel}
          </button>
        </div>
        <div id={popId} popover="auto" className="blog-modal-popover max-h-[min(90vh,560px)] w-[min(32rem,92vw)] overflow-auto border-0 bg-transparent p-0 shadow-none">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            {title.trim() ? <h3 className="text-xl font-black text-brand-blue">{title}</h3> : null}
            <div className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">{body}</div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-xl border-2 border-brand-blue bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-blue hover:bg-slate-50"
                popoverTarget={popId}
                popoverTargetAction="hide"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[11px] leading-snug text-slate-500">
        Uses the browser <strong className="text-slate-700">Popover API</strong> (no scripts). Readers tap the button to open; backdrop tap closes in supporting browsers.
      </p>
      <div className="flex flex-wrap gap-2">
        {aligns.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => updateBlock(block.id, { alignTrigger: a })}
            className={`rounded-lg px-2 py-1 text-xs capitalize ${alignTrigger === a ? 'bg-brand-blue text-brand-yellow' : 'bg-white text-slate-600'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <input
        value={triggerLabel}
        onChange={(e) => updateBlock(block.id, { triggerLabel: e.target.value })}
        placeholder="Button label"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      <input
        value={title}
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
        placeholder="Popup title (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      <textarea
        value={body}
        onChange={(e) => updateBlock(block.id, { body: e.target.value })}
        placeholder="Popup body text"
        rows={5}
        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <div className={`flex ${justify} border-t border-slate-200 pt-4`}>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-6 py-3 text-xs font-black uppercase tracking-widest text-brand-yellow shadow-md"
          popoverTarget={popId}
          popoverTargetAction="toggle"
        >
          {triggerLabel || 'Preview'}
        </button>
      </div>
      <div id={popId} popover="auto" className="blog-modal-popover max-h-[min(85vh,480px)] w-[min(28rem,94vw)] overflow-auto border-0 bg-transparent p-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          {title.trim() ? <h3 className="text-lg font-black text-brand-blue">{title}</h3> : null}
          <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{body || '…'}</div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase text-slate-600"
              popoverTarget={popId}
              popoverTargetAction="hide"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
