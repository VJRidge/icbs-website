import { useState } from 'react';
import { Image as ImageIcon, Plus, Video, X } from 'lucide-react';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { navigationPatch, readNavigation, type NavMode } from '../../../lib/blog/mediaWidgetOptions';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import BlogInspectorSection from './BlogInspectorSection';
import { Field, MediaColor, MediaRange, MediaSelect, MediaToggle, mediaInput } from './mediaFieldBits';

type Row = Record<string, unknown>;

function itemRows(data: Record<string, unknown>): Row[] {
  return Array.isArray(data.items) ? (data.items as Row[]) : [];
}

function useCarouselRows(block: BlogBlock, kind: 'image' | 'media') {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const data = block.data as Record<string, unknown>;
  const rows = itemRows(data);
  const patch = (partial: Record<string, unknown>) => updateBlock(block.id, { kind, ...partial });
  const setRows = (next: Row[]) => patch({ items: next });
  const patchRow = (index: number, partial: Row) => {
    setRows(rows.map((item, i) => (i === index ? { ...item, ...partial } : item)));
  };
  return { data, rows, patch, setRows, patchRow };
}

export function ImageCarouselFields({ block, tab }: { block: BlogBlock; tab: 'content' | 'style' }) {
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const { data, rows, patch, setRows } = useCarouselRows(block, 'image');
  const filled = rows.filter((row) => String(row.url ?? '').trim());

  if (tab === 'style') {
    return (
      <div className="space-y-2">
        <BlogInspectorSection title="Navigation">
          <MediaColor label="Arrow color" value={String(data.arrowColor ?? '#ffffff')} onChange={(arrowColor) => patch({ arrowColor })} />
          <MediaRange label="Arrow size" min={16} max={48} value={Number(data.arrowSize) || 28} onChange={(arrowSize) => patch({ arrowSize })} />
        </BlogInspectorSection>
        <BlogInspectorSection title="Image" defaultOpen={false}>
          <MediaRange label="Gap" min={0} max={48} value={Number(data.gap) || 12} onChange={(gap) => patch({ gap })} />
          <MediaRange
            label="Corner radius"
            min={0}
            max={40}
            value={Number(data.radius) || 0}
            onChange={(radius) => patch({ radius })}
          />
        </BlogInspectorSection>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Carousel name">
        <input
          className={mediaInput}
          value={String(data.slidesName ?? 'Image Carousel')}
          onChange={(event) => patch({ slidesName: event.target.value, kind: 'image' })}
        />
      </Field>
      <div>
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
          {filled.length} image{filled.length === 1 ? '' : 's'} selected
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {filled.map((row, index) => (
            <button
              key={`${String(row.url)}-${index}`}
              type="button"
              className="relative h-12 w-12 overflow-hidden rounded border border-slate-200"
              onClick={() => setRows(rows.filter((item) => item !== row))}
              aria-label="Remove image"
            >
              <img src={String(row.url)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-slate-300 text-slate-500"
            aria-label="Add image"
            onClick={() => openMediaLibrary((url) => setRows([...rows, { url, alt: '', caption: '', title: '' }]))}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <MediaSelect
        label="Image resolution"
        value={String(data.imageSize ?? 'medium')}
        onChange={(imageSize) => patch({ imageSize, kind: 'image' })}
        options={[
          { value: 'thumbnail', label: 'Thumbnail' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
          { value: 'full', label: 'Full' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {data.imageSize === 'custom' ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <input
              type="number"
              className={mediaInput}
              value={Number(data.customWidth) || 600}
              onChange={(event) => patch({ customWidth: Number(event.target.value) || 600 })}
            />
          </Field>
          <Field label="Height">
            <input
              type="number"
              className={mediaInput}
              value={Number(data.customHeight) || 400}
              onChange={(event) => patch({ customHeight: Number(event.target.value) || 400 })}
            />
          </Field>
        </div>
      ) : null}
      <MediaSelect
        label="Slides to show"
        value={String(Number(data.slidesToShow) || 3)}
        onChange={(value) => patch({ slidesToShow: Number(value), kind: 'image' })}
        options={[1, 2, 3, 4, 5, 6].map((count) => ({ value: String(count), label: String(count) }))}
      />
      <MediaSelect
        label="Slides to scroll"
        value={String(Number(data.slidesToScroll) || 1)}
        onChange={(value) => patch({ slidesToScroll: Number(value) })}
        options={[1, 2, 3, 4, 5, 6].map((count) => ({ value: String(count), label: String(count) }))}
      />
      <MediaSelect
        label="Image stretch"
        value={data.imageStretch ? 'yes' : 'no'}
        onChange={(value) => patch({ imageStretch: value === 'yes' })}
        options={[
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ]}
      />
      <MediaSelect
        label="Navigation"
        value={readNavigation(data)}
        onChange={(value) => patch({ ...navigationPatch(value as NavMode), kind: 'image' })}
        options={[
          { value: 'arrows_dots', label: 'Arrows and Dots' },
          { value: 'arrows', label: 'Arrows' },
          { value: 'dots', label: 'Dots' },
          { value: 'none', label: 'None' },
        ]}
      />
      <MediaSelect
        label="Link"
        value={String(data.linkMode ?? 'none')}
        onChange={(linkMode) => patch({ linkMode })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'media', label: 'Media file' },
          { value: 'custom', label: 'Custom URL' },
        ]}
      />
      {data.linkMode === 'custom' ? (
        <Field label="Custom URL">
          <input className={mediaInput} value={String(data.customUrl ?? '')} onChange={(event) => patch({ customUrl: event.target.value })} />
        </Field>
      ) : null}
      <MediaSelect
        label="Caption"
        value={String(data.captionSource ?? 'none')}
        onChange={(captionSource) => patch({ captionSource })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'title', label: 'Title' },
          { value: 'caption', label: 'Caption' },
          { value: 'description', label: 'Description' },
        ]}
      />
      <BlogInspectorSection title="Additional options" defaultOpen={false}>
        <MediaToggle label="Lazy load" checked={data.lazyLoad !== false} onChange={(lazyLoad) => patch({ lazyLoad })} />
        <MediaToggle label="Autoplay" checked={Boolean(data.autoplay)} onChange={(autoplay) => patch({ autoplay })} />
        <MediaToggle label="Pause on hover" checked={data.pauseOnHover !== false} onChange={(pauseOnHover) => patch({ pauseOnHover })} />
        <MediaToggle
          label="Pause on interaction"
          checked={Boolean(data.pauseOnInteraction)}
          onChange={(pauseOnInteraction) => patch({ pauseOnInteraction })}
        />
        <Field label="Autoplay speed (ms)">
          <input
            type="number"
            className={mediaInput}
            min={1000}
            max={15000}
            value={Number(data.interval) || 5000}
            onChange={(event) => patch({ interval: Number(event.target.value) || 5000 })}
          />
        </Field>
        <MediaToggle label="Infinite loop" checked={data.loop !== false} onChange={(loop) => patch({ loop })} />
        <Field label="Animation speed (ms)">
          <input
            type="number"
            className={mediaInput}
            min={200}
            max={2000}
            value={Number(data.transitionSpeed) || 500}
            onChange={(event) => patch({ transitionSpeed: Number(event.target.value) || 500 })}
          />
        </Field>
        <MediaSelect
          label="Direction"
          value={String(data.direction ?? 'left')}
          onChange={(direction) => patch({ direction })}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
        />
      </BlogInspectorSection>
    </div>
  );
}

export function MediaCarouselFields({ block, tab }: { block: BlogBlock; tab: 'content' | 'style' }) {
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const { data, rows, patch, setRows, patchRow } = useCarouselRows(block, 'media');
  const [open, setOpen] = useState(0);

  if (tab === 'style') {
    return (
      <div className="space-y-2">
        <BlogInspectorSection title="Navigation">
          <MediaColor label="Arrow color" value={String(data.arrowColor ?? '#ffffff')} onChange={(arrowColor) => patch({ arrowColor })} />
          <MediaRange label="Arrow size" min={16} max={64} value={Number(data.arrowSize) || 28} onChange={(arrowSize) => patch({ arrowSize })} />
          <MediaColor label="Play icon color" value={String(data.playColor ?? '#ffffff')} onChange={(playColor) => patch({ playColor })} />
          <MediaRange label="Play icon size" min={32} max={96} value={Number(data.playSize) || 56} onChange={(playSize) => patch({ playSize })} />
        </BlogInspectorSection>
        <BlogInspectorSection title="Overlay" defaultOpen={false}>
          <MediaSelect
            label="Overlay"
            value={String(data.overlay ?? 'none')}
            onChange={(overlay) => patch({ overlay })}
            options={[
              { value: 'none', label: 'None' },
              { value: 'text', label: 'Text' },
            ]}
          />
          <MediaColor label="Color" value={String(data.overlayColor ?? '#000000')} onChange={(overlayColor) => patch({ overlayColor })} />
        </BlogInspectorSection>
        <BlogInspectorSection title="Lightbox" defaultOpen={false}>
          <MediaToggle label="Lightbox" checked={Boolean(data.lightbox)} onChange={(lightbox) => patch({ lightbox })} />
        </BlogInspectorSection>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <MediaSelect
        label="Skin"
        value={String(data.skin ?? 'carousel')}
        onChange={(skin) => patch({ skin, kind: 'media' })}
        options={[
          { value: 'carousel', label: 'Carousel' },
          { value: 'slideshow', label: 'Slideshow' },
          { value: 'coverflow', label: 'Coverflow' },
        ]}
      />
      <Field label="Slides name">
        <input
          className={mediaInput}
          value={String(data.slidesName ?? 'Slides')}
          onChange={(event) => patch({ slidesName: event.target.value })}
        />
      </Field>
      <div className="space-y-1">
        {rows.map((row, index) => {
          const expanded = open === index;
          const video = String(row.mediaType ?? 'image') === 'video';
          return (
            <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-1 px-2 py-2">
                <button type="button" className="min-w-0 flex-1 truncate text-left text-xs font-semibold" onClick={() => setOpen(expanded ? -1 : index)}>
                  {String(row.title ?? row.caption ?? '').trim() || `Item #${index + 1}`}
                </button>
                <button
                  type="button"
                  aria-label="Remove item"
                  className="rounded p-1 text-slate-400 hover:text-[#B53D0D]"
                  onClick={() => {
                    const next = rows.filter((_, item) => item !== index);
                    setRows(next.length ? next : [{ url: '', alt: '', caption: '' }]);
                    setOpen(Math.max(0, index - 1));
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              {expanded ? (
                <div className="space-y-3 border-t border-slate-100 px-2 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Image"
                      onClick={() => patchRow(index, { mediaType: 'image' })}
                      className={`rounded border p-2 ${video ? 'border-slate-200 text-slate-400' : 'border-[#7c3aed] text-[#7c3aed]'}`}
                    >
                      <ImageIcon size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Video"
                      onClick={() => patchRow(index, { mediaType: 'video' })}
                      className={`rounded border p-2 ${video ? 'border-[#7c3aed] text-[#7c3aed]' : 'border-slate-200 text-slate-400'}`}
                    >
                      <Video size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {String(row.url ?? '') ? (
                      <img src={String(row.url)} alt="" className="h-14 w-20 rounded object-cover" />
                    ) : (
                      <div className="flex h-14 w-20 items-center justify-center rounded bg-slate-100 text-slate-400">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => openMediaLibrary((url) => patchRow(index, { url }))}
                    >
                      Choose image
                    </button>
                  </div>
                  <Field label="Video link">
                    <input
                      className={mediaInput}
                      placeholder="YouTube or Vimeo"
                      value={String(row.videoUrl ?? '')}
                      onChange={(event) => patchRow(index, { videoUrl: event.target.value, mediaType: 'video' })}
                    />
                  </Field>
                  <Field label="Title">
                    <input className={mediaInput} value={String(row.title ?? '')} onChange={(event) => patchRow(index, { title: event.target.value })} />
                  </Field>
                  <Field label="Caption">
                    <input
                      className={mediaInput}
                      value={String(row.caption ?? '')}
                      onChange={(event) => patchRow(index, { caption: event.target.value })}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
        onClick={() => {
          setRows([...rows, { url: '', alt: '', caption: '', mediaType: 'image' }]);
          setOpen(rows.length);
        }}
      >
        <Plus size={14} /> Add item
      </button>
      <MediaSelect
        label="Effect"
        value={String(data.effect ?? data.transition ?? 'slide')}
        onChange={(effect) => patch({ effect, kind: 'media' })}
        options={[
          { value: 'slide', label: 'Slide' },
          { value: 'fade', label: 'Fade' },
          { value: 'cube', label: 'Cube' },
        ]}
      />
      <MediaSelect
        label="Slides per view"
        value={String(Number(data.slidesPerView) || 1)}
        onChange={(value) => patch({ slidesPerView: Number(value) })}
        options={[1, 2, 3, 4, 5, 6].map((count) => ({ value: String(count), label: String(count) }))}
      />
      <MediaSelect
        label="Slides to scroll"
        value={String(Number(data.slidesToScroll) || 1)}
        onChange={(value) => patch({ slidesToScroll: Number(value) })}
        options={[1, 2, 3, 4, 5, 6].map((count) => ({ value: String(count), label: String(count) }))}
      />
      <MediaRange label="Height" min={160} max={800} suffix="px" value={Number(data.height) || 420} onChange={(height) => patch({ height })} />
      <BlogInspectorSection title="Additional options" defaultOpen={false}>
        <MediaToggle label="Arrows" checked={data.showArrows !== false} onChange={(showArrows) => patch({ showArrows })} />
        <MediaToggle label="Pagination" checked={data.showDots !== false} onChange={(showDots) => patch({ showDots })} />
        <Field label="Transition duration (ms)">
          <input
            type="number"
            className={mediaInput}
            min={200}
            max={2000}
            value={Number(data.transitionSpeed) || 500}
            onChange={(event) => patch({ transitionSpeed: Number(event.target.value) || 500 })}
          />
        </Field>
        <MediaToggle label="Autoplay" checked={Boolean(data.autoplay)} onChange={(autoplay) => patch({ autoplay })} />
        <Field label="Autoplay speed (ms)">
          <input
            type="number"
            className={mediaInput}
            min={1000}
            max={15000}
            value={Number(data.interval) || 5000}
            onChange={(event) => patch({ interval: Number(event.target.value) || 5000 })}
          />
        </Field>
        <MediaToggle label="Infinite loop" checked={data.loop !== false} onChange={(loop) => patch({ loop })} />
        <MediaToggle label="Pause on hover" checked={data.pauseOnHover !== false} onChange={(pauseOnHover) => patch({ pauseOnHover })} />
        <MediaToggle
          label="Pause on interaction"
          checked={Boolean(data.pauseOnInteraction)}
          onChange={(pauseOnInteraction) => patch({ pauseOnInteraction })}
        />
        <MediaSelect
          label="Image fit"
          value={String(data.imageFit ?? 'cover')}
          onChange={(imageFit) => patch({ imageFit })}
          options={[
            { value: 'cover', label: 'Cover' },
            { value: 'contain', label: 'Contain' },
          ]}
        />
      </BlogInspectorSection>
    </div>
  );
}
