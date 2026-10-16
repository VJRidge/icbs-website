import {
  BLOG_BLOCK_LABELS,
  BLOG_EDITOR_PICKER_CATEGORIES,
  BLOG_EDITOR_PICKER_TYPES,
  type BlogBlockType,
} from '../studio/lib/blog/blogBlockTypes'

const NESTABLE = new Set(BLOG_EDITOR_PICKER_TYPES.filter((type) => type !== 'columns'))

/** Same categorized add-block list the column `+` used before the flat layout-chooser grid. */
export default function ColumnWidgetPicker({
  columnLabel,
  onPick,
  onClose,
}: {
  columnLabel: string
  onPick: (type: BlogBlockType, preset?: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">Add block to {columnLabel}</p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {Object.entries(BLOG_EDITOR_PICKER_CATEGORIES).map(([cat, types]) => {
            const filtered = types.filter((type) => NESTABLE.has(type))
            if (!filtered.length) return null
            return (
              <div key={cat} className="mb-4">
                <p className="mb-2 text-[10px] font-black uppercase text-slate-400">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {filtered.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onPick(type)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold hover:border-brand-blue"
                    >
                      {BLOG_BLOCK_LABELS[type]}
                    </button>
                  ))}
                  {cat === 'Media' ? (
                    <button
                      type="button"
                      onClick={() => onPick('carousel', 'image')}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold hover:border-brand-blue"
                    >
                      Image carousel
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
