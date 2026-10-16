import '../../../../brand/brand.css';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import {
  LIGHTBOX_WORD_MAX,
  countLightboxWords,
  lightboxCopyStyle,
  lightboxHtml,
  lightboxPlainText,
} from '../../../lib/blog/lightboxNote';
import { sanitizeBlogBlockHtml } from '../../../lib/blog/sanitizeBlogBlockHtml';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import BlogParagraphBlock from './BlogParagraphBlock';
import SurfaceBackgroundLayers from '../SurfaceBackgroundLayers';
import { hasSurfaceLayers, readSurfaceBackground, surfaceShellStyle } from '../../../lib/blog/surfaceBackground';

function popoverSafeId(blockId: string): string {
  return `blog-pop-${blockId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function LightboxEditFields({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const words = countLightboxWords(lightboxPlainText(block.data));
  return (
    <div
      className="space-y-3"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <p className="text-[11px] leading-snug text-slate-500">
        Highlight text in the lightbox, then use the toolbar for weight, size, color, lists, and links. Maximum{' '}
        {LIGHTBOX_WORD_MAX} words.
      </p>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Button</span>
        <input
          value={String(block.data.triggerLabel ?? 'Open')}
          onChange={(e) => updateBlock(block.id, { triggerLabel: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Title</span>
        <input
          value={String(block.data.title ?? '')}
          onChange={(e) => updateBlock(block.id, { title: e.target.value })}
          placeholder="Lightbox heading"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <div data-paragraph-editor>
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Text</p>
        <BlogParagraphBlock block={block} isEditing toolbarSource htmlKey="body" />
      </div>
      <span className={`block text-[10px] font-bold ${words >= LIGHTBOX_WORD_MAX ? 'text-amber-700' : 'text-slate-400'}`}>
        {words} / {LIGHTBOX_WORD_MAX} words
      </span>
    </div>
  );
}

export default function BlogModalPopupBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId);
  const triggerLabel = String(block.data.triggerLabel ?? 'Open') || 'Open';
  const title = String(block.data.title ?? '');
  const html = sanitizeBlogBlockHtml(lightboxHtml(block.data));
  const alignTrigger = ['left', 'center', 'right'].includes(String(block.data.alignTrigger))
    ? String(block.data.alignTrigger)
    : 'center';
  const justify = alignTrigger === 'center' ? 'justify-center' : alignTrigger === 'right' ? 'justify-end' : 'justify-start';
  const popId = popoverSafeId(block.id);
  const brandFace = block.data.brandFace !== false;
  const triggerClass = brandFace
    ? 'vj-btn'
    : 'blog-modal-trigger inline-flex items-center justify-center rounded-xl bg-brand-blue px-6 py-3 text-xs font-black uppercase tracking-widest text-brand-yellow shadow-md transition hover:brightness-105';
  const selected = isEditing && selectedBlockId === block.id;

  const copyStyle = lightboxCopyStyle(block.data);
  const surface = readSurfaceBackground(block.data);
  const surfaceStyle = surfaceShellStyle(surface);
  const cream = surface.color || surface.type ? '' : ' bg-[#F3EDE3]';
  const panel = (
    <div
      className={`vj-surface flex min-h-[min(22rem,60vh)] flex-col rounded-2xl border border-slate-200 p-6 shadow-2xl sm:p-8${cream}`}
      style={surfaceStyle}
    >
      {hasSurfaceLayers(surface) ? <SurfaceBackgroundLayers bg={surface} /> : null}
      {title.trim() ? (
        <h3 className="font-serif text-2xl font-black text-slate-900" style={{ color: copyStyle.color, textAlign: copyStyle.textAlign }}>
          {title}
        </h3>
      ) : null}
      <div
        className={`blog-paragraph-block blog-lightbox-copy prose prose-slate max-w-none ${title.trim() ? 'mt-4 flex-1' : 'flex-1'}`}
        style={copyStyle}
        dangerouslySetInnerHTML={{ __html: html || '<p></p>' }}
      />
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50"
          popoverTarget={popId}
          popoverTargetAction="hide"
        >
          Close
        </button>
      </div>
    </div>
  );

  if (isEditing) {
    return (
      <div className="w-full space-y-3">
        <div className={`flex w-full ${justify}`}>
          <span className={triggerClass} data-lightbox-trigger="">
            {triggerLabel}
          </span>
        </div>
        {selected ? (
          <div
            className={`vj-surface rounded-2xl border border-slate-200 p-4 shadow-sm sm:p-6${cream}`}
            style={{ ...copyStyle, ...surfaceStyle }}
          >
            {hasSurfaceLayers(surface) ? <SurfaceBackgroundLayers bg={surface} /> : null}
            {title.trim() ? (
              <h3 className="mb-3 font-serif text-2xl font-black text-slate-900" style={{ color: copyStyle.color }}>
                {title}
              </h3>
            ) : null}
            <BlogParagraphBlock block={block} isEditing toolbarSource={false} canvasSurface htmlKey="body" />
          </div>
        ) : (
          <div
            className={`vj-surface rounded-2xl border border-dashed border-slate-200 p-4${cream || ' bg-[#F3EDE3]/80'}`}
            style={{ ...copyStyle, ...surfaceStyle }}
          >
            {hasSurfaceLayers(surface) ? <SurfaceBackgroundLayers bg={surface} /> : null}
            {title.trim() ? <h3 className="mb-3 font-serif text-xl font-black text-slate-900">{title}</h3> : null}
            <div
              className="blog-paragraph-block blog-lightbox-copy prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: html || '<p></p>' }}
            />
            <p className="mt-3 text-center text-[10px] text-slate-400">Select this lightbox to edit the text.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`my-3 flex w-full ${justify}`}>
        <button type="button" className={triggerClass} popoverTarget={popId} popoverTargetAction="toggle">
          {triggerLabel}
        </button>
      </div>
      <div id={popId} popover="auto" className="blog-modal-popover overflow-auto border-0 bg-transparent p-0 shadow-none">
        {panel}
      </div>
    </>
  );
}
