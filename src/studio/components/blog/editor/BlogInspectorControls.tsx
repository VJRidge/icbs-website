import type { ReactNode } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react';
import BlogInspectorSection from './BlogInspectorSection';

export function blogDataNum(data: Record<string, unknown>, key: string, fallback: number): number {
  const v = Number(data[key]);
  return Number.isFinite(v) ? v : fallback;
}

export type BlogTextAlign = 'left' | 'center' | 'right' | 'justify';

type Align = 'left' | 'center' | 'right';

export function BlogInspectorAlignment({
  value,
  onChange,
  label = 'Alignment',
}: {
  value: Align;
  onChange: (v: Align) => void;
  label?: string;
}) {
  const opts: { id: Align; icon: typeof AlignLeft; title: string }[] = [
    { id: 'left', icon: AlignLeft, title: 'Left' },
    { id: 'center', icon: AlignCenter, title: 'Center' },
    { id: 'right', icon: AlignRight, title: 'Right' },
  ];
  return (
    <div>
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex gap-1">
        {opts.map(({ id, icon: Icon, title }) => (
          <button
            key={id}
            type="button"
            title={title}
            onClick={() => onChange(id)}
            className={`flex flex-1 items-center justify-center rounded-lg border py-2 transition ${
              value === id
                ? 'border-brand-blue bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/25'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Compact 4-way alignment (Elementor text editor row). */
export function BlogInspectorAlignmentCompact({
  value,
  onChange,
}: {
  value: BlogTextAlign;
  onChange: (v: BlogTextAlign) => void;
}) {
  const opts: { id: BlogTextAlign; icon: typeof AlignLeft; title: string }[] = [
    { id: 'left', icon: AlignLeft, title: 'Left' },
    { id: 'center', icon: AlignCenter, title: 'Center' },
    { id: 'right', icon: AlignRight, title: 'Right' },
    { id: 'justify', icon: AlignJustify, title: 'Justified' },
  ];
  return (
    <div className="flex overflow-hidden rounded border border-slate-200">
      {opts.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          onClick={() => onChange(id)}
          className={`flex h-7 w-7 items-center justify-center border-r border-slate-200 last:border-r-0 ${
            value === id ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

export function BlogInspectorSpacing({
  marginTop,
  marginBottom,
  onChange,
}: {
  marginTop: number;
  marginBottom: number;
  onChange: (patch: { marginTop?: number; marginBottom?: number }) => void;
}) {
  return (
    <BlogInspectorSection title="Spacing">
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Margin top (px)</span>
        <input
          type="number"
          min={0}
          max={200}
          value={marginTop}
          onChange={(e) => onChange({ marginTop: Number(e.target.value) || 0 })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Margin bottom (px)</span>
        <input
          type="number"
          min={0}
          max={200}
          value={marginBottom}
          onChange={(e) => onChange({ marginBottom: Number(e.target.value) || 0 })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
    </BlogInspectorSection>
  );
}

export function BlogInspectorAdvancedPanel({
  blockId,
  data,
  onPatch,
  extra,
}: {
  blockId: string;
  data: Record<string, unknown>;
  onPatch: (id: string, patch: Record<string, unknown>) => void;
  extra?: ReactNode;
}) {
  const marginTop = blogDataNum(data, 'marginTop', 0);
  const marginBottom = blogDataNum(data, 'marginBottom', 0);
  const customClass = String(data.customClass ?? '');

  return (
    <div className="space-y-3">
      <BlogInspectorSpacing
        marginTop={marginTop}
        marginBottom={marginBottom}
        onChange={(p) => onPatch(blockId, p)}
      />
      <BlogInspectorSection title="CSS">
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Custom CSS class</span>
          <input
            value={customClass}
            onChange={(e) => onPatch(blockId, { customClass: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
            placeholder="my-custom-class"
          />
        </label>
      </BlogInspectorSection>
      {extra}
    </div>
  );
}

/** Shared carousel / slideshow style controls */
export function BlogSliderStyleSections({
  blockId,
  patch,
  opts,
}: {
  blockId: string;
  patch: (data: Record<string, unknown>) => void;
  opts: {
    aspectRatio: string;
    transition: string;
    transitionOptions?: { value: string; label: string }[];
    showArrows: boolean;
    showDots: boolean;
    showThumbs: boolean;
    showCounter: boolean;
    autoplay: boolean;
    interval: number;
    pauseOnHover: boolean;
    loop?: boolean;
    captionMode?: string;
    sliderVariant?: string;
    maxHeightPx?: number;
    thumbSize?: string;
    arrowStyle?: string;
    dotStyle?: string;
    autoplayInView?: boolean;
    align?: string;
    transitionSpeed?: number;
  };
}) {
  const transitionOptions = opts.transitionOptions ?? [
    { value: 'slide', label: 'Slide' },
    { value: 'fade', label: 'Fade' },
  ];

  return (
    <>
      {opts.align != null ? (
        <BlogInspectorSection title="Layout">
          <BlogInspectorAlignment
            value={(opts.align === 'right' ? 'right' : opts.align === 'center' ? 'center' : 'left') as Align}
            onChange={(v) => patch({ align: v })}
          />
          {opts.maxHeightPx != null ? (
            <label className="mt-2 block text-xs text-slate-700">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Max height (px, 0 = auto)
              </span>
              <input
                type="number"
                min={0}
                max={1200}
                value={opts.maxHeightPx}
                onChange={(e) => patch({ maxHeightPx: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ) : null}
        </BlogInspectorSection>
      ) : null}

      {opts.sliderVariant != null ? (
        <BlogInspectorSection title="Slider look">
          <div className="grid gap-2">
            {(
              [
                { id: 'single_focus', label: 'Single focus', hint: 'One slide at a time' },
                { id: 'peek_strip', label: 'Peek strip', hint: 'Scroll with side peek' },
                { id: 'compact_row', label: 'Compact row', hint: 'Smaller scroll cards' },
              ] as const
            ).map(({ id, label, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  patch({
                    sliderVariant: id,
                    ...(id === 'single_focus' ? { showArrows: true, showDots: true } : {}),
                  })
                }
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  opts.sliderVariant === id
                    ? 'border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue/25'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-bold text-slate-800">{label}</span>
                <span className="mt-0.5 block text-[10px] text-slate-500">{hint}</span>
              </button>
            ))}
          </div>
          <label className="mt-2 block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Aspect ratio</span>
            <select
              value={opts.aspectRatio}
              onChange={(e) => patch({ aspectRatio: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="16/9">16:9</option>
              <option value="4/3">4:3</option>
              <option value="1/1">1:1</option>
              <option value="auto">Auto</option>
            </select>
          </label>
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Transition</span>
            <select
              value={opts.transition}
              onChange={(e) => patch({ transition: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {transitionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {opts.transitionSpeed != null ? (
            <label className="block text-xs text-slate-700">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Transition speed (ms): {opts.transitionSpeed}
              </span>
              <input
                type="range"
                min={200}
                max={1200}
                step={50}
                value={opts.transitionSpeed}
                onChange={(e) => patch({ transitionSpeed: Number(e.target.value) })}
                className="w-full"
              />
            </label>
          ) : null}
          {opts.captionMode != null ? (
            <label className="block text-xs text-slate-700">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Captions</span>
              <select
                value={opts.captionMode}
                onChange={(e) => patch({ captionMode: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="below">Below image</option>
                <option value="overlay">Overlay</option>
                <option value="none">Hidden</option>
              </select>
            </label>
          ) : null}
        </BlogInspectorSection>
      ) : null}

      <BlogInspectorSection title="Navigation">
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={opts.showArrows} onChange={(e) => patch({ showArrows: e.target.checked })} />
          Arrows
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={opts.showDots} onChange={(e) => patch({ showDots: e.target.checked })} />
          Pagination dots
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={opts.showThumbs} onChange={(e) => patch({ showThumbs: e.target.checked })} />
          Thumbnail strip
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={opts.showCounter} onChange={(e) => patch({ showCounter: e.target.checked })} />
          Slide counter
        </label>
        {opts.loop != null ? (
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={opts.loop} onChange={(e) => patch({ loop: e.target.checked })} />
            Infinite loop
          </label>
        ) : null}
        {opts.arrowStyle != null ? (
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Arrow style</span>
            <select
              value={opts.arrowStyle}
              onChange={(e) => patch({ arrowStyle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="minimal">Minimal</option>
              <option value="bold">Bold</option>
              <option value="outside">Outside frame</option>
            </select>
          </label>
        ) : null}
        {opts.dotStyle != null ? (
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Dot style</span>
            <select
              value={opts.dotStyle}
              onChange={(e) => patch({ dotStyle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="dots">Dots</option>
              <option value="bars">Bars</option>
            </select>
          </label>
        ) : null}
        {opts.thumbSize != null ? (
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Thumbnail size</span>
            <select
              value={opts.thumbSize}
              onChange={(e) => patch({ thumbSize: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>
        ) : null}
      </BlogInspectorSection>

      <BlogInspectorSection title="Autoplay">
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={opts.autoplay} onChange={(e) => patch({ autoplay: e.target.checked })} />
          Autoplay slides
        </label>
        {opts.autoplay ? (
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Interval (ms): {opts.interval}
            </span>
            <input
              type="range"
              min={2000}
              max={10000}
              step={500}
              value={opts.interval}
              onChange={(e) => patch({ interval: Number(e.target.value) })}
              className="w-full"
            />
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={opts.pauseOnHover} onChange={(e) => patch({ pauseOnHover: e.target.checked })} />
          Pause on hover
        </label>
        {opts.autoplayInView != null ? (
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={opts.autoplayInView}
              onChange={(e) => patch({ autoplayInView: e.target.checked })}
            />
            Autoplay only when in viewport
          </label>
        ) : null}
      </BlogInspectorSection>
    </>
  );
}

export function alignWrapperClass(align: string): string {
  if (align === 'right') return 'flex justify-end';
  if (align === 'center') return 'flex justify-center';
  return '';
}

export function marginStyle(data: Record<string, unknown>): { marginTop?: string; marginBottom?: string } {
  const mt = blogDataNum(data, 'marginTop', 0);
  const mb = blogDataNum(data, 'marginBottom', 0);
  if (!mt && !mb) return {};
  return { marginTop: mt ? `${mt}px` : undefined, marginBottom: mb ? `${mb}px` : undefined };
}
