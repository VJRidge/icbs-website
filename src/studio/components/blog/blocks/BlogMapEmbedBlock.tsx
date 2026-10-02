import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogMapEmbedBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const src = String(block.data.src ?? '').trim();
  const height = Math.min(1200, Math.max(200, Number(block.data.height) || 400));

  if (!isEditing) {
    if (!src) return <p className="text-sm text-slate-400">Map embed: add a Google Maps embed URL in the editor.</p>;
    return (
      <figure className="my-8 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <div style={{ height }} className="w-full bg-slate-100">
          <iframe title="Map" src={src} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      </figure>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[11px] leading-snug text-slate-500">
        Paste the iframe <code className="rounded bg-slate-200 px-1">src</code> from Google Maps → Share → Embed map (must start with{' '}
        <code className="rounded bg-slate-200 px-1">https://www.google.com/maps/embed</code>).
      </p>
      <input
        value={src}
        onChange={(e) => updateBlock(block.id, { src: e.target.value })}
        placeholder="https://www.google.com/maps/embed?pb=…"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
      />
      <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
        Height (px)
        <input
          type="number"
          min={200}
          max={1200}
          value={height}
          onChange={(e) => updateBlock(block.id, { height: Number(e.target.value) || 400 })}
          className="w-24 rounded border border-slate-200 px-2 py-1"
        />
      </label>
    </div>
  );
}
