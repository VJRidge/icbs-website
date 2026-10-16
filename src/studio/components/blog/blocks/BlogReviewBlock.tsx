import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { quoteColumns, readQuoteCards, type QuoteCard } from '../../../lib/blog/marketingWidgets';

function Stars({ rating }: { rating: number }) {
  return (
    <p className="text-sm text-amber-400" aria-label={`${rating} of 5 stars`}>
      {'★'.repeat(rating)}
      <span className="text-slate-300">{'☆'.repeat(5 - rating)}</span>
    </p>
  );
}

function ReviewCard({ item }: { item: QuoteCard }) {
  const dark = item.emphasis || item.cardColor;
  return (
    <article
      className={`flex h-full flex-col items-center rounded-2xl px-6 py-8 text-center shadow-sm ${
        dark ? 'text-white' : 'border border-slate-200 bg-white text-slate-800'
      }`}
      style={item.cardColor ? { backgroundColor: item.cardColor } : item.emphasis ? { backgroundColor: '#1f2937' } : undefined}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="mb-4 h-16 w-16 rounded-full object-cover" loading="lazy" />
      ) : (
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-lg font-black">
          {(item.name || '?').slice(0, 1)}
        </span>
      )}
      <h3 className="font-black">{item.name}</h3>
      {item.role ? <p className={`mt-1 text-xs ${dark ? 'text-white/70' : 'text-slate-500'}`}>{item.role}</p> : null}
      <div className="mt-2">
        <Stars rating={item.rating} />
      </div>
      {item.quote ? <p className={`mt-4 text-sm leading-relaxed ${dark ? 'text-white/80' : 'text-slate-600'}`}>{item.quote}</p> : null}
    </article>
  );
}

export default function BlogReviewBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const items = readQuoteCards(block.data as Record<string, unknown>);
  const columns = quoteColumns(block.data as Record<string, unknown>, items.length);
  const grid = (
    <section className="blog-review-grid my-8 grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((item, index) => (
        <ReviewCard key={`${item.name}-${index}`} item={item} />
      ))}
    </section>
  );

  if (!isEditing) return grid;

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Columns
        <select
          value={columns}
          onChange={(event) => updateBlock(block.id, { columns: Number(event.target.value) })}
          className="rounded border border-slate-200 px-2 py-1"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      {items.map((item, index) => (
        <div key={`rev-${index}`} className="space-y-2 rounded-xl border border-slate-200 p-3">
          <textarea
            value={item.quote}
            onChange={(event) => {
              const next = items.map((row, i) => (i === index ? { ...row, quote: event.target.value } : row));
              updateBlock(block.id, { items: next });
            }}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={item.name}
              onChange={(event) => {
                const next = items.map((row, i) => (i === index ? { ...row, name: event.target.value } : row));
                updateBlock(block.id, { items: next });
              }}
              placeholder="Name"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
            />
            <input
              value={item.role}
              onChange={(event) => {
                const next = items.map((row, i) => (i === index ? { ...row, role: event.target.value } : row));
                updateBlock(block.id, { items: next });
              }}
              placeholder="Role"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={item.imageUrl}
              onChange={(event) => {
                const next = items.map((row, i) => (i === index ? { ...row, imageUrl: event.target.value } : row));
                updateBlock(block.id, { items: next });
              }}
              placeholder="Photo URL"
              className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs sm:col-span-2"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={item.emphasis}
              onChange={(event) => {
                const next = items.map((row, i) => (i === index ? { ...row, emphasis: event.target.checked } : row));
                updateBlock(block.id, { items: next });
              }}
            />
            Dark card
          </label>
        </div>
      ))}
      <button
        type="button"
        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold"
        onClick={() =>
          updateBlock(block.id, {
            items: [...items, { quote: '', name: 'Name', role: '', imageUrl: '', rating: 5, emphasis: false, cardColor: '' }],
          })
        }
      >
        Add review
      </button>
      {grid}
    </div>
  );
}
