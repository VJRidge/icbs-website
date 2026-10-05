import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import {
  EDITOR_POST_BASIC_TEXT_COLORS,
  EDITOR_POST_THEME_TEXT_COLORS,
  normalizeHexColor,
} from '../../../lib/editor/brandColorPresets';
import { BlogInspectorIconButton } from './BlogInspectorFieldRow';
import { cn } from '../../../lib/utils';

function swatchBtn(hex: string) {
  const light = ['#ffffff', '#ffff00', '#ffd700', '#f5d547'].includes(hex.toLowerCase());
  return cn(
    'h-6 w-6 shrink-0 rounded border transition hover:scale-105 hover:ring-2 hover:ring-brand-blue/40',
    light ? 'border-slate-300' : 'border-slate-200/80',
  );
}

/** Elementor-style color: globe (theme palette) + color preview box. */
export default function BlogInspectorColorControl({
  value,
  onChange,
  title = 'Color',
  fallback = '',
}: {
  value: string;
  onChange: (hex: string) => void;
  title?: string;
  /** Color to show when none is stored, so an empty heading does not look black. */
  fallback?: string;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const normalized = value.trim() ? normalizeHexColor(value, '#0f172a') : '';
  const fallbackHex = fallback.trim() ? normalizeHexColor(fallback, '#f7f7f2') : '';
  const preview = normalized || fallbackHex || '#ffffff';

  useEffect(() => {
    if (!paletteOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPaletteOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [paletteOpen]);

  const pick = (hex: string) => {
    onChange(hex);
    setPaletteOpen(false);
  };

  return (
    <div className="relative flex items-center gap-1" ref={wrapRef}>
      <BlogInspectorIconButton
        title="Theme colors"
        active={paletteOpen}
        onClick={() => setPaletteOpen((o) => !o)}
      >
        <Globe className="h-3.5 w-3.5" />
      </BlogInspectorIconButton>
      <label
        className="relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded border border-slate-200 bg-white"
        title={title}
      >
        {!normalized && !fallbackHex ? (
          <span
            className="absolute inset-0 bg-white"
            style={{
              background:
                'linear-gradient(135deg, transparent 46%, #ef4444 46%, #ef4444 54%, transparent 54%)',
            }}
            aria-hidden
          />
        ) : (
          <span className="absolute inset-0" style={{ backgroundColor: preview }} aria-hidden />
        )}
        <input
          type="color"
          value={normalized || fallbackHex || '#0f172a'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={title}
        />
      </label>
      {paletteOpen ? (
        <div className="absolute right-0 top-full z-[400] mt-1 w-[200px] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Theme</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {EDITOR_POST_THEME_TEXT_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                className={swatchBtn(hex)}
                style={{ backgroundColor: hex }}
                onClick={() => pick(hex)}
              />
            ))}
          </div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Standard</p>
          <div className="flex flex-wrap gap-1">
            {EDITOR_POST_BASIC_TEXT_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                className={swatchBtn(hex)}
                style={{ backgroundColor: hex }}
                onClick={() => pick(hex)}
              />
            ))}
          </div>
          <button
            type="button"
            className="mt-2 w-full rounded border border-slate-200 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            onClick={() => pick('')}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
