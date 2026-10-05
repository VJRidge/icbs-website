import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import {
  BLOG_BLOCK_ICONS,
  BLOG_BLOCK_LABELS,
  BLOG_EDITOR_PICKER_TYPES,
  type BlogBlockType,
} from '../../../lib/blog/blogBlockTypes';
import { carouselPreset } from '../../../lib/blog/mediaWidgetOptions';
import { BRAND_BLOCK_TYPES } from '../../../../brand/brandBlockTypes';

const PICKER_SET = new Set<string>(BLOG_EDITOR_PICKER_TYPES);
const ELEMENT_LABELS: Partial<Record<BlogBlockType, string>> = {
  slideshow: 'Media Slider',
  carousel: 'Media carousel',
  columns: 'Container',
  paragraph: 'Text',
  icon_box: 'Icon',
};
const ELEMENT_GROUPS: { title: string; types: BlogBlockType[] }[] = [
  { title: 'Basic', types: ['heading', 'image', 'paragraph', 'video', 'button', 'divider', 'spacer', 'icon_box'] },
  { title: 'Media', types: ['slideshow', 'carousel', 'gallery', 'youtube'] },
  { title: 'Layout', types: ['columns'] },
  { title: 'Content', types: ['accordion'] },
  { title: 'VettaJimale', types: [...BRAND_BLOCK_TYPES] },
];

function elementLabel(type: BlogBlockType): string {
  return ELEMENT_LABELS[type] ?? BLOG_BLOCK_LABELS[type] ?? type;
}

export default function BlogBlockPicker({ afterId, onClose }: { afterId: string | null; onClose: () => void }) {
  const addBlock = useBlogEditorStore((s) => s.addBlock);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = (type: BlogBlockType, preset?: string) => {
    addBlock(type, afterId, carouselPreset(preset ?? (type === 'carousel' ? 'media' : undefined)));
    onClose();
  };

  const labelEntries = Object.entries(BLOG_BLOCK_LABELS).filter(([t]) => PICKER_SET.has(t)) as [BlogBlockType, string][];

  const searchResults = search.trim()
    ? labelEntries.filter(([type, label]) => {
        const q = search.trim().toLowerCase();
        return label.toLowerCase().includes(q) || elementLabel(type).toLowerCase().includes(q);
      })
    : [];

  const groups = ELEMENT_GROUPS.map((group) => ({
    title: group.title,
    types: group.types.filter((type) => PICKER_SET.has(type)),
  })).filter((group) => group.types.length > 0);

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

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {search.trim() ? (
            <div className="space-y-1">
              {searchResults.map(([type]) => {
                const Icon = BLOG_BLOCK_ICONS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAdd(type)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                  >
                    <Icon className="h-4 w-4 text-slate-600" strokeWidth={1.75} aria-hidden />
                    <span className="text-sm text-slate-800">{elementLabel(type)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{group.title}</h3>
                <div className="grid grid-cols-2 gap-1">
                  {group.types.map((type) => {
                    const Icon = BLOG_BLOCK_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAdd(type)}
                        className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-2 text-left hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-600" strokeWidth={1.75} aria-hidden />
                        <span className="text-xs font-semibold text-slate-800">{elementLabel(type)}</span>
                      </button>
                    );
                  })}
                  {group.title === 'Media' ? (
                    <button
                      type="button"
                      onClick={() => handleAdd('carousel', 'image')}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-2 text-left hover:border-slate-300 hover:bg-slate-50"
                    >
                      <span className="text-xs font-semibold text-slate-800">Image carousel</span>
                    </button>
                  ) : null}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
