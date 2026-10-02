import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogTestimonialBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const quote = String(block.data.quote ?? '');
  const name = String(block.data.name ?? '');
  const role = String(block.data.role ?? '');
  const imageUrl = String(block.data.imageUrl ?? '');
  const rating = Math.min(5, Math.max(0, Number(block.data.rating) || 5));

  if (!isEditing) {
    return (
      <blockquote className="my-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          {imageUrl.trim() ? (
            <img src={imageUrl.trim()} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-brand-yellow/40" loading="lazy" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-medium italic leading-relaxed text-slate-800">&ldquo;{quote}&rdquo;</p>
            <footer className="mt-4">
              <cite className="not-italic text-sm font-black text-brand-blue">{name}</cite>
              {role.trim() ? <span className="mt-1 block text-xs font-bold uppercase tracking-widest text-slate-500">{role}</span> : null}
              <div className="mt-2 text-brand-yellow" aria-label={`${rating} of 5 stars`}>
                {'★'.repeat(rating)}
                <span className="text-slate-300">{'☆'.repeat(5 - rating)}</span>
              </div>
            </footer>
          </div>
        </div>
      </blockquote>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <textarea
        value={quote}
        onChange={(e) => updateBlock(block.id, { quote: e.target.value })}
        placeholder="Quote / review"
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        value={name}
        onChange={(e) => updateBlock(block.id, { name: e.target.value })}
        placeholder="Name"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      <input
        value={role}
        onChange={(e) => updateBlock(block.id, { role: e.target.value })}
        placeholder="Role or affiliation"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
      />
      <input
        value={imageUrl}
        onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
        placeholder="Portrait image URL (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
      />
      <label className="flex items-center gap-2 text-xs font-bold">
        Rating
        <input
          type="range"
          min={0}
          max={5}
          value={rating}
          onChange={(e) => updateBlock(block.id, { rating: Number(e.target.value) })}
        />
        <span>{rating}</span>
      </label>
    </div>
  );
}
