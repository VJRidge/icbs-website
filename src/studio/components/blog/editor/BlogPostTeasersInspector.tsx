import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import {
  POST_TEASER_IMAGE_RATIOS,
  imageRatioPreset,
  readPostTeaserLayout,
  type PostTeaserImagePosition,
  type PostTeaserImageResolution,
  type PostTeaserPagination,
  type PostTeaserSkin,
  skinLayoutPatch,
} from '../../../lib/blog/postTeaserLayout';
import BlogInspectorSection from './BlogInspectorSection';
import { BlogInspectorFieldRow } from './BlogInspectorFieldRow';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function PostsContent({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const layout = readPostTeaserLayout(block.data as Record<string, unknown>);
  return (
    <div className="space-y-3">
      <BlogInspectorSection title="Layout">
        <BlogInspectorFieldRow label="Skin">
          <select
            value={layout.skin}
            onChange={(e) => updateBlock(block.id, skinLayoutPatch(e.target.value as PostTeaserSkin))}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="classic">Classic</option>
            <option value="cards">Cards</option>
            <option value="full">Full content</option>
          </select>
        </BlogInspectorFieldRow>
        <BlogInspectorFieldRow label="Columns">
          <select
            value={layout.columns}
            onChange={(e) => updateBlock(block.id, { columns: Number(e.target.value) })}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </BlogInspectorFieldRow>
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Posts per page</span>
          <input
            type="number"
            min={1}
            max={24}
            value={layout.limit}
            onChange={(e) => updateBlock(block.id, { limit: Number(e.target.value) || 6 })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <Toggle label="Show image" checked={layout.showImage} onChange={(showImage) => updateBlock(block.id, { showImage })} />
        {layout.showImage ? (
          <>
            <BlogInspectorFieldRow label="Image position">
              <select
                value={layout.imagePosition}
                onChange={(e) => updateBlock(block.id, { imagePosition: e.target.value as PostTeaserImagePosition })}
                className="rounded border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="left">Left</option>
                <option value="top">Top</option>
              </select>
            </BlogInspectorFieldRow>
            <BlogInspectorFieldRow label="Image resolution">
              <select
                value={layout.imageResolution}
                onChange={(e) => updateBlock(block.id, { imageResolution: e.target.value as PostTeaserImageResolution })}
                className="rounded border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="thumbnail">Thumbnail</option>
                <option value="medium">Medium</option>
                <option value="full">Full</option>
              </select>
            </BlogInspectorFieldRow>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image crop</p>
              <div className="flex flex-wrap gap-1">
                {POST_TEASER_IMAGE_RATIOS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => updateBlock(block.id, { imageRatio: row.value })}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                      imageRatioPreset(layout.imageRatio) === row.id
                        ? 'bg-brand-blue text-white'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <span className="w-24 text-[11px] text-slate-600">Image ratio</span>
                <input
                  type="range"
                  min={30}
                  max={200}
                  value={Math.round(layout.imageRatio * 100)}
                  onChange={(e) => updateBlock(block.id, { imageRatio: Number(e.target.value) / 100 })}
                  className="flex-1"
                />
                <span className="w-10 font-mono text-[11px]">{layout.imageRatio.toFixed(2)}</span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <span className="w-24 text-[11px] text-slate-600">Image width</span>
              <input
                type="range"
                min={15}
                max={80}
                value={layout.imageWidth}
                onChange={(e) => updateBlock(block.id, { imageWidth: Number(e.target.value) || 35 })}
                className="flex-1"
              />
              <span className="w-10 font-mono text-[11px]">{layout.imageWidth}%</span>
            </label>
          </>
        ) : null}
        <Toggle label="Show title" checked={layout.showTitle} onChange={(showTitle) => updateBlock(block.id, { showTitle })} />
        {layout.showTitle ? (
          <BlogInspectorFieldRow label="Title HTML tag">
            <select
              value={layout.titleTag}
              onChange={(e) => updateBlock(block.id, { titleTag: e.target.value })}
              className="rounded border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="h2">H2</option>
              <option value="h3">H3</option>
            </select>
          </BlogInspectorFieldRow>
        ) : null}
        <Toggle label="Show excerpt" checked={layout.showExcerpt} onChange={(showExcerpt) => updateBlock(block.id, { showExcerpt })} />
        {layout.showExcerpt ? (
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Excerpt length</span>
            <input
              type="number"
              min={1}
              max={400}
              value={layout.excerptLength}
              onChange={(e) => updateBlock(block.id, { excerptLength: Number(e.target.value) || 40 })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        ) : null}
        <Toggle label="Meta data" checked={layout.showMeta} onChange={(showMeta) => updateBlock(block.id, { showMeta })} />
        <Toggle label="Read more" checked={layout.showReadMore} onChange={(showReadMore) => updateBlock(block.id, { showReadMore })} />
        {layout.showReadMore ? (
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Read more text</span>
            <input
              value={layout.readMoreText}
              onChange={(e) => updateBlock(block.id, { readMoreText: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        ) : null}
        <Toggle
          label="Open in new window"
          checked={layout.openInNewWindow}
          onChange={(openInNewWindow) => updateBlock(block.id, { openInNewWindow })}
        />
      </BlogInspectorSection>
      <BlogInspectorSection title="Pagination" defaultOpen={false}>
        <BlogInspectorFieldRow label="Pagination">
          <select
            value={layout.pagination}
            onChange={(e) => updateBlock(block.id, { pagination: e.target.value as PostTeaserPagination })}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="none">Off</option>
            <option value="numbers">Numbers</option>
          </select>
        </BlogInspectorFieldRow>
      </BlogInspectorSection>
    </div>
  );
}

export function PostsStyle({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-slate-500">
        Title, excerpt, and meta colors follow the Style fields below. Layout lives on Content.
      </p>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Title color</span>
        <input
          type="color"
          value={String(block.data.titleColor || '#0f172a')}
          onChange={(e) => updateBlock(block.id, { titleColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Excerpt color</span>
        <input
          type="color"
          value={String(block.data.excerptColor || '#475569')}
          onChange={(e) => updateBlock(block.id, { excerptColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Meta color</span>
        <input
          type="color"
          value={String(block.data.metaColor || '#b53d0d')}
          onChange={(e) => updateBlock(block.id, { metaColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
        />
      </label>
    </div>
  );
}
