import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import {
  BLOG_BLOCK_ICONS,
  BLOG_BLOCK_LABELS,
  BLOG_EDITOR_PICKER_CATEGORIES,
  BLOG_EDITOR_PICKER_TYPES,
  type BlogBlockType,
} from '../../../lib/blog/blogBlockTypes';

const PICKER_SET = new Set<string>(BLOG_EDITOR_PICKER_TYPES);
const CATEGORY_NAMES = Object.keys(BLOG_EDITOR_PICKER_CATEGORIES);

export default function BlogBlockPicker({ afterId, onClose }: { afterId: string | null; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(CATEGORY_NAMES[0] ?? 'Text');
  const addBlock = useBlogEditorStore((s) => s.addBlock);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = (type: BlogBlockType) => {
    addBlock(type, afterId);
    onClose();
  };

  const labelEntries = Object.entries(BLOG_BLOCK_LABELS).filter(([t]) => PICKER_SET.has(t)) as [BlogBlockType, string][];

  const searchResults = search.trim()
    ? labelEntries.filter(([, label]) => label.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  const categoryBlocks = (BLOG_EDITOR_PICKER_CATEGORIES[active] ?? []).filter((t) => PICKER_SET.has(t));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks…"
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {!search.trim() ? (
          <div className="scrollbar-hide flex gap-1 overflow-x-auto px-4 pb-1 pt-3">
            {CATEGORY_NAMES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(cat)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active === cat ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-4">
          {(search.trim() ? searchResults : categoryBlocks.map((t) => [t, BLOG_BLOCK_LABELS[t]] as const)).map(([type, label]) => {
            const Icon = BLOG_BLOCK_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleAdd(type)}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-3 text-center transition hover:border-brand-blue/40 hover:bg-brand-blue/5"
              >
                <Icon className="h-5 w-5 text-slate-700" strokeWidth={1.75} aria-hidden />
                <span className="text-xs font-bold text-slate-800">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
