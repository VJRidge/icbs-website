import { SlidersHorizontal } from 'lucide-react';
import { useBlogEditorSidebarOptional } from '../../../contexts/BlogEditorSidebarContext';
import FileUpload from '../../FileUpload';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const WIDTH_CLASS: Record<string, string> = {
  full: 'w-full',
  wide: 'mx-auto w-full max-w-4xl',
  medium: 'mx-auto w-full max-w-2xl',
  small: 'mx-auto w-full max-w-sm',
};

export default function BlogImageBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const sidebar = useBlogEditorSidebarOptional();
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const url = String(block.data.url ?? '');
  const alt = String(block.data.alt ?? '');
  const caption = String(block.data.caption ?? '');
  const width = String(block.data.width ?? 'full');
  const widthClass = WIDTH_CLASS[width] ?? 'w-full';

  if (!isEditing) {
    if (!url.trim()) return null;
    return (
      <figure className={`my-4 ${widthClass}`}>
        <img
          src={url}
          alt={alt}
          className="w-full rounded-xl object-cover shadow-md"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />
        {caption.trim() ? <figcaption className="mt-2 text-center text-xs italic text-slate-500">{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <div className="space-y-3">
      {sidebar ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            sidebar.openModuleForBlock(block.id);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue/25 bg-brand-blue/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-blue transition hover:bg-brand-blue/10"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Image tools
        </button>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {(['small', 'medium', 'wide', 'full'] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => updateBlock(block.id, { width: w })}
            className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
              width === w ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {url ? (
        <div className="relative group">
          <img src={url} alt={alt} className="max-h-64 w-full rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => updateBlock(block.id, { url: '' })}
            className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 text-sm font-medium text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
          >
            Remove image
          </button>
        </div>
      ) : (
        <FileUpload
          variant="compact"
          bucket="media-public"
          label="Upload image"
          type="image"
          accept="image/*"
          value=""
          onChange={(next) => {
            if (next) updateBlock(block.id, { url: next, alt: alt || 'Image' });
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Alt</label>
          <input
            value={alt}
            onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Describe the image"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Caption</label>
          <input
            value={caption}
            onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Optional caption"
          />
        </div>
      </div>
    </div>
  );
}
