import { useState } from 'react';
import { Eye, EyeOff, Image as ImageIcon, Plus, X } from 'lucide-react';
import { FontSize } from '../../../../brand/BrandPiecePanel';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { navigationPatch, readNavigation, type NavMode } from '../../../lib/blog/mediaWidgetOptions';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import BlogInspectorSection from './BlogInspectorSection';
import { Field, MediaColor, MediaRange, MediaSelect, MediaToggle, Segmented, mediaInput } from './mediaFieldBits';

type Row = Record<string, unknown>;

function rowsOf(data: Record<string, unknown>): Row[] {
  return Array.isArray(data.slides) ? (data.slides as Row[]) : [];
}

function slideTitle(row: Row, index: number): string {
  const title = String(row.title ?? row.caption ?? '').trim();
  return title || `Slide ${index + 1}`;
}

function SlideEditor({
  row,
  onPatch,
}: {
  row: Row;
  onPatch: (partial: Row) => void;
}) {
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const [pane, setPane] = useState<'common' | 'style'>('common');
  const url = String(row.url ?? '');

  return (
    <div className="space-y-3 border-t border-slate-100 px-2 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Background</span>
        <div className="flex rounded-md bg-slate-100 p-0.5 text-[10px] font-bold">
          {(['common', 'style'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPane(id)}
              className={`rounded px-2 py-1 capitalize ${pane === id ? 'bg-white text-[#7c3aed] shadow-sm' : 'text-slate-500'}`}
            >
              {id === 'common' ? 'Common' : 'Style'}
            </button>
          ))}
        </div>
      </div>

      {pane === 'common' ? (
        <div className="space-y-3">
          <MediaColor label="Color" value={String(row.bgColor ?? '#111111')} onChange={(bgColor) => onPatch({ bgColor })} />
          <div className="flex items-center gap-2">
            {url ? (
              <img src={url} alt="" className="h-12 w-16 rounded object-cover" />
            ) : (
              <div className="flex h-12 w-16 items-center justify-center rounded bg-slate-100 text-slate-400">
                <ImageIcon size={16} />
              </div>
            )}
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
              onClick={() => openMediaLibrary((next) => onPatch({ url: next }))}
            >
              Choose image
            </button>
          </div>
          <MediaSelect
            label="Size"
            value={String(row.bgSize ?? 'cover')}
            onChange={(bgSize) => onPatch({ bgSize })}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
              { value: 'auto', label: 'Auto' },
            ]}
          />
          <MediaToggle label="Ken Burns effect" checked={Boolean(row.kenBurns)} onChange={(kenBurns) => onPatch({ kenBurns })} />
          <MediaToggle label="Background overlay" checked={Boolean(row.overlay)} onChange={(overlay) => onPatch({ overlay })} />
          {row.overlay ? (
            <MediaColor
              label="Overlay color"
              value={String(row.overlayColor ?? '#000000')}
              onChange={(overlayColor) => onPatch({ overlayColor })}
            />
          ) : null}
          <Field label="Title">
            <input className={mediaInput} value={String(row.title ?? '')} onChange={(event) => onPatch({ title: event.target.value })} />
          </Field>
          <Field label="Description">
            <textarea
              className={mediaInput}
              rows={3}
              value={String(row.description ?? '')}
              onChange={(event) => onPatch({ description: event.target.value })}
            />
          </Field>
          <Field label="Button text">
            <input
              className={mediaInput}
              value={String(row.buttonText ?? '')}
              onChange={(event) => onPatch({ buttonText: event.target.value })}
            />
          </Field>
          <Field label="Link">
            <input className={mediaInput} value={String(row.link ?? '')} onChange={(event) => onPatch({ link: event.target.value })} />
          </Field>
          <MediaSelect
            label="Apply link on"
            value={String(row.applyLinkOn ?? 'button')}
            onChange={(applyLinkOn) => onPatch({ applyLinkOn })}
            options={[
              { value: 'button', label: 'Button' },
              { value: 'slide', label: 'Whole slide' },
            ]}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Segmented
            label="Horizontal position"
            value={String(row.horizontal ?? '')}
            onChange={(horizontal) => onPatch({ horizontal })}
            options={[
              { id: 'left', label: 'Left' },
              { id: 'center', label: 'Center' },
              { id: 'right', label: 'Right' },
            ]}
          />
          <Segmented
            label="Vertical position"
            value={String(row.vertical ?? '')}
            onChange={(vertical) => onPatch({ vertical })}
            options={[
              { id: 'top', label: 'Top' },
              { id: 'middle', label: 'Middle' },
              { id: 'bottom', label: 'Bottom' },
            ]}
          />
          <Segmented
            label="Text align"
            value={String(row.textAlign ?? '')}
            onChange={(textAlign) => onPatch({ textAlign })}
            options={[
              { id: 'left', label: 'Left' },
              { id: 'center', label: 'Center' },
              { id: 'right', label: 'Right' },
            ]}
          />
          <MediaColor
            label="Content color"
            value={String(row.contentColor ?? '#ffffff')}
            onChange={(contentColor) => onPatch({ contentColor })}
          />
          <MediaToggle
            label="Text shadow"
            checked={Boolean(row.textShadow)}
            onChange={(textShadow) => onPatch({ textShadow })}
          />
        </div>
      )}
    </div>
  );
}

export default function SlidesWidgetFields({ block, tab }: { block: BlogBlock; tab: 'content' | 'style' }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const data = block.data as Record<string, unknown>;
  const rows = rowsOf(data);
  const [open, setOpen] = useState(0);
  const patch = (partial: Record<string, unknown>) => updateBlock(block.id, partial);

  function setRows(next: Row[]) {
    patch({ slides: next });
  }

  function patchRow(index: number, partial: Row) {
    setRows(rows.map((item, i) => (i === index ? { ...item, ...partial } : item)));
  }

  if (tab === 'style') {
    return (
      <div className="space-y-2">
        <BlogInspectorSection title="Slides">
          <MediaRange
            label="Content width"
            min={20}
            max={100}
            suffix="%"
            value={Number(data.contentWidth) || 70}
            onChange={(contentWidth) => patch({ contentWidth })}
          />
          <div>
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Padding</span>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  ['padTop', 'Top'],
                  ['padRight', 'Right'],
                  ['padBottom', 'Bottom'],
                  ['padLeft', 'Left'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-center text-[9px] uppercase text-slate-400">
                  {label}
                  <input
                    type="number"
                    min={0}
                    max={160}
                    value={Number(data[key]) || 0}
                    onChange={(event) => patch({ [key]: Number(event.target.value) || 0 })}
                    className="mt-1 w-full rounded border border-slate-200 px-1 py-1 text-center text-xs text-slate-800"
                  />
                </label>
              ))}
            </div>
          </div>
          <Segmented
            label="Horizontal position"
            value={String(data.horizontal ?? 'center')}
            onChange={(horizontal) => patch({ horizontal })}
            options={[
              { id: 'left', label: 'Left' },
              { id: 'center', label: 'Center' },
              { id: 'right', label: 'Right' },
            ]}
          />
          <Segmented
            label="Vertical position"
            value={String(data.vertical ?? 'middle')}
            onChange={(vertical) => patch({ vertical })}
            options={[
              { id: 'top', label: 'Top' },
              { id: 'middle', label: 'Middle' },
              { id: 'bottom', label: 'Bottom' },
            ]}
          />
          <Segmented
            label="Text align"
            value={String(data.textAlign ?? 'center')}
            onChange={(textAlign) => patch({ textAlign })}
            options={[
              { id: 'left', label: 'Left' },
              { id: 'center', label: 'Center' },
              { id: 'right', label: 'Right' },
            ]}
          />
          <MediaToggle label="Text shadow" checked={Boolean(data.textShadow)} onChange={(textShadow) => patch({ textShadow })} />
        </BlogInspectorSection>
        <BlogInspectorSection title="Title" defaultOpen={false}>
          <MediaColor label="Color" value={String(data.titleColor ?? '#ffffff')} onChange={(titleColor) => patch({ titleColor })} />
          <FontSize value={String(data.titleSize ?? '')} onChange={(titleSize) => patch({ titleSize })} />
        </BlogInspectorSection>
        <BlogInspectorSection title="Description" defaultOpen={false}>
          <MediaColor
            label="Color"
            value={String(data.descriptionColor ?? '#ffffff')}
            onChange={(descriptionColor) => patch({ descriptionColor })}
          />
          <FontSize value={String(data.descriptionSize ?? '')} onChange={(descriptionSize) => patch({ descriptionSize })} />
        </BlogInspectorSection>
        <BlogInspectorSection title="Button" defaultOpen={false}>
          <MediaColor label="Text" value={String(data.buttonColor ?? '#ffffff')} onChange={(buttonColor) => patch({ buttonColor })} />
          <MediaColor
            label="Background"
            value={String(data.buttonBg ?? '#000000')}
            onChange={(buttonBg) => patch({ buttonBg })}
          />
          <FontSize value={String(data.buttonSize ?? '')} onChange={(buttonSize) => patch({ buttonSize })} />
        </BlogInspectorSection>
        <BlogInspectorSection title="Navigation" defaultOpen={false}>
          <MediaColor label="Arrow color" value={String(data.arrowColor ?? '#ffffff')} onChange={(arrowColor) => patch({ arrowColor })} />
          <MediaRange
            label="Arrow size"
            min={16}
            max={48}
            value={Number(data.arrowSize) || 28}
            onChange={(arrowSize) => patch({ arrowSize })}
          />
        </BlogInspectorSection>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Slides name">
        <input
          className={mediaInput}
          value={String(data.slidesName ?? 'Slides')}
          onChange={(event) => patch({ slidesName: event.target.value })}
        />
      </Field>
      <div className="space-y-1">
        {rows.map((row, index) => {
          const hidden = Boolean(row.hidden);
          const expanded = open === index;
          return (
            <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-1 px-2 py-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-slate-800"
                  onClick={() => setOpen(expanded ? -1 : index)}
                >
                  {slideTitle(row, index)}
                </button>
                <button
                  type="button"
                  aria-label={hidden ? 'Show slide' : 'Hide slide'}
                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                  onClick={() => patchRow(index, { hidden: !hidden })}
                >
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${slideTitle(row, index)}`}
                  className="rounded p-1 text-slate-400 hover:text-[#B53D0D]"
                  onClick={() => {
                    const next = rows.filter((_, item) => item !== index);
                    setRows(next.length ? next : [{ url: '', alt: '', caption: '', credit: '' }]);
                    setOpen(Math.max(0, index - 1));
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              {expanded ? <SlideEditor row={row} onPatch={(partial) => patchRow(index, partial)} /> : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
        onClick={() => {
          setRows([...rows, { url: '', alt: '', caption: '', credit: '', title: '' }]);
          setOpen(rows.length);
        }}
      >
        <Plus size={14} /> Add item
      </button>
      <MediaRange
        label="Height"
        min={0}
        max={800}
        suffix={Number(data.height) > 0 ? 'px' : ''}
        value={Number(data.height) || 0}
        onChange={(height) => patch({ height })}
      />
      <MediaSelect
        label="Title HTML tag"
        value={String(data.titleTag ?? 'div')}
        onChange={(titleTag) => patch({ titleTag })}
        options={['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p'].map((tag) => ({ value: tag, label: tag }))}
      />
      <MediaSelect
        label="Description HTML tag"
        value={String(data.descriptionTag ?? 'div')}
        onChange={(descriptionTag) => patch({ descriptionTag })}
        options={['div', 'p', 'span'].map((tag) => ({ value: tag, label: tag }))}
      />
      <BlogInspectorSection title="Slider options" defaultOpen={false}>
        <MediaSelect
          label="Navigation"
          value={readNavigation(data)}
          onChange={(value) => patch(navigationPatch(value as NavMode))}
          options={[
            { value: 'arrows_dots', label: 'Arrows and Dots' },
            { value: 'arrows', label: 'Arrows' },
            { value: 'dots', label: 'Dots' },
            { value: 'none', label: 'None' },
          ]}
        />
        <MediaToggle label="Autoplay" checked={Boolean(data.autoplay)} onChange={(autoplay) => patch({ autoplay })} />
        <MediaToggle
          label="Pause on hover"
          checked={data.pauseOnHover !== false}
          onChange={(pauseOnHover) => patch({ pauseOnHover })}
        />
        <MediaToggle
          label="Pause on interaction"
          checked={Boolean(data.pauseOnInteraction)}
          onChange={(pauseOnInteraction) => patch({ pauseOnInteraction })}
        />
        <Field label="Autoplay speed (ms)">
          <input
            type="number"
            min={1000}
            max={15000}
            step={500}
            className={mediaInput}
            value={Number(data.interval) || 5000}
            onChange={(event) => patch({ interval: Number(event.target.value) || 5000 })}
          />
        </Field>
        <MediaToggle label="Infinite loop" checked={data.loop !== false} onChange={(loop) => patch({ loop })} />
        <MediaSelect
          label="Transition"
          value={String(data.transition ?? 'fade')}
          onChange={(transition) => patch({ transition })}
          options={[
            { value: 'slide', label: 'Slide' },
            { value: 'fade', label: 'Fade' },
            { value: 'kenburns', label: 'Ken Burns' },
          ]}
        />
        <Field label="Transition speed (ms)">
          <input
            type="number"
            min={200}
            max={2000}
            step={50}
            className={mediaInput}
            value={Number(data.transitionSpeed) || 500}
            onChange={(event) => patch({ transitionSpeed: Number(event.target.value) || 500 })}
          />
        </Field>
        <MediaSelect
          label="Content animation"
          value={String(data.contentAnimation ?? 'none')}
          onChange={(contentAnimation) => patch({ contentAnimation })}
          options={[
            { value: 'none', label: 'None' },
            { value: 'fade', label: 'Fade in' },
            { value: 'fade-up', label: 'Fade up' },
          ]}
        />
      </BlogInspectorSection>
    </div>
  );
}
