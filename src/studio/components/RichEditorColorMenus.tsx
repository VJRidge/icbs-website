import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ChevronDown, Highlighter } from 'lucide-react';
import { cn } from '../lib/utils';

/** Classic theme-style grid: neutrals, primaries, pastels (hex). */
export const STANDARD_TEXT_COLORS = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#cccccc',
  '#ffffff',
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  '#e06666',
  '#f6b26b',
  '#ffd966',
  '#93c47d',
  '#76a5af',
  '#6d9eeb',
  '#6fa8dc',
  '#8e7cc3',
  '#c27ba0',
  '#85200c',
  '#ea9999',
  '#f9cb9c',
  '#ffe599',
  '#b6d7a8',
  '#a2c4c9',
  '#9fc5e8',
  '#a4c2f4',
  '#b4a7d6',
  '#d5a6bd',
] as const;

export const STANDARD_HIGHLIGHT_COLORS = [
  '#FFF475',
  '#fef08a',
  '#fde047',
  '#facc15',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#fed7aa',
  '#fdba74',
  '#fb923c',
  '#e9d5ff',
  '#ddd6fe',
  '#c4b5fd',
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8',
  '#fbcfe8',
  '#f9a8d4',
  '#f472b6',
] as const;

export function normalizeHexColor(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withHash = t.startsWith('#') ? t : `#${t}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const h = withHash.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normalizeHexColor(hex);
  if (!norm) return null;
  const h = norm.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

type ColorValueFormat = 'hex' | 'rgb';

function swatchButtonClass(hex: string) {
  const light = hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#ffff00';
  return cn(
    'h-6 w-6 shrink-0 rounded border transition hover:scale-110 hover:ring-2 hover:ring-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue',
    light ? 'border-slate-300' : 'border-slate-200/80',
  );
}

type Size = 'sm' | 'md';

export function useAnchoredPanel(open: boolean, anchorRef: RefObject<HTMLElement | null>): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', zIndex: 80 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 280;
      const height = 360;
      const below = window.innerHeight - rect.bottom;
      const top = below < height && rect.top > 200 ? Math.max(8, rect.top - height - 6) : rect.bottom + 6;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setStyle({
        position: 'fixed',
        top,
        left,
        width,
        maxHeight: 'min(420px, 70vh)',
        overflowY: 'auto',
        zIndex: 80,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);
  return style;
}

const triggerBase =
  'inline-flex shrink-0 items-center justify-center gap-0.5 rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-brand-blue/40 hover:text-brand-blue disabled:pointer-events-none disabled:opacity-40';

export function ColorPickerPanel({
  swatches,
  currentValue,
  clearLabel,
  onApply,
  onSwatchApply,
  onClear,
  onPrepare,
  showClear = true,
  onNativePickerOpen,
  onNativePickerClose,
}: {
  swatches: readonly string[];
  currentValue?: string;
  clearLabel: string;
  onApply: (hex: string) => void;
  onSwatchApply?: (hex: string) => void;
  onClear: () => void;
  /** Snapshot editor selection before the control takes focus. */
  onPrepare?: () => void;
  showClear?: boolean;
  /** OS color flyout opened — parent should ignore outside-click dismiss. */
  onNativePickerOpen?: () => void;
  /** OS color flyout closed — parent can restore canvas focus. */
  onNativePickerClose?: () => void;
}) {
  const applySwatch = onSwatchApply ?? onApply;
  const initial = normalizeHexColor(currentValue ?? '') ?? '#0f172a';
  const initialRgb = hexToRgb(initial) ?? { r: 15, g: 23, b: 42 };
  const [hexDraft, setHexDraft] = useState(initial);
  const [rgbDraft, setRgbDraft] = useState(initialRgb);
  const [valueFormat, setValueFormat] = useState<ColorValueFormat>('hex');

  useEffect(() => {
    const norm = normalizeHexColor(currentValue ?? '') ?? '#0f172a';
    setHexDraft(norm);
    setRgbDraft(hexToRgb(norm) ?? { r: 15, g: 23, b: 42 });
  }, [currentValue]);

  const pickerValue = normalizeHexColor(hexDraft) ?? '#000000';

  const prep = () => onPrepare?.();

  const commitHex = (raw: string) => {
    const norm = normalizeHexColor(raw);
    if (!norm) return;
    prep();
    setHexDraft(norm);
    setRgbDraft(hexToRgb(norm) ?? rgbDraft);
    onApply(norm);
  };

  const commitRgb = (r: number, g: number, b: number) => {
    const norm = rgbToHex(r, g, b);
    prep();
    setHexDraft(norm);
    setRgbDraft({ r: Math.round(r), g: Math.round(g), b: Math.round(b) });
    onApply(norm);
  };

  const onRgbField = (channel: 'r' | 'g' | 'b', raw: string) => {
    const n = Number(raw);
    const next = {
      ...rgbDraft,
      [channel]: Number.isFinite(n) ? Math.min(255, Math.max(0, n)) : rgbDraft[channel],
    };
    setRgbDraft(next);
  };

  return (
    <div
      className="space-y-2"
      onMouseDown={(e) => {
        e.stopPropagation();
        prep();
      }}
    >
      <div className="flex items-start gap-2">
        <label
          className="relative block h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-300 shadow-sm"
          title="Open color picker to adjust"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            prep();
            onNativePickerOpen?.();
          }}
        >
          <span className="absolute inset-0 block" style={{ backgroundColor: pickerValue }} aria-hidden />
          <input
            type="color"
            value={pickerValue}
            onInput={(e) => commitHex(e.currentTarget.value)}
            onChange={(e) => {
              commitHex(e.target.value);
              onNativePickerClose?.();
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Adjust color"
          />
        </label>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Format</span>
            <select
              value={valueFormat}
              onChange={(e) => setValueFormat(e.target.value as ColorValueFormat)}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 outline-none focus:border-brand-blue/50"
              aria-label="Color value format"
            >
              <option value="hex">HEX</option>
              <option value="rgb">RGB</option>
            </select>
          </div>
          {valueFormat === 'hex' ? (
            <label className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Hex</span>
              <input
                type="text"
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitHex(hexDraft);
                }}
                onBlur={() => {
                  const norm = normalizeHexColor(hexDraft);
                  if (norm) commitHex(norm);
                }}
                placeholder="#1e3a8a"
                className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono text-[11px] text-slate-800 outline-none focus:border-brand-blue/50"
                spellCheck={false}
              />
            </label>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {(['r', 'g', 'b'] as const).map((ch) => (
                <label key={ch} className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{ch}</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgbDraft[ch]}
                    onChange={(e) => onRgbField(ch, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRgb(rgbDraft.r, rgbDraft.g, rgbDraft.b);
                    }}
                    onBlur={() => commitRgb(rgbDraft.r, rgbDraft.g, rgbDraft.b)}
                    className="w-full rounded-md border border-slate-200 px-1.5 py-1 font-mono text-[11px] text-slate-800 outline-none focus:border-brand-blue/50"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {swatches.length > 0 ? (
        <>
          <p className="px-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Standard colors</p>
          <div className="grid grid-cols-7 gap-1">
            {swatches.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                className={swatchButtonClass(hex)}
                style={{ backgroundColor: hex }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  prep();
                  applySwatch(hex);
                }}
              />
            ))}
          </div>
        </>
      ) : null}
      {showClear ? (
        <button
          type="button"
          className="w-full rounded-lg border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          onMouseDown={(e) => {
            e.preventDefault();
            prep();
            onClear();
          }}
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}

export function RichEditorTextColorDropdown({
  disabled,
  currentColor,
  onPick,
  onClear,
  onOpen,
  size = 'md',
}: {
  disabled?: boolean;
  currentColor?: string;
  onPick: (hex: string) => void;
  onClear: () => void;
  /** Called before opening so the parent can snapshot TipTap selection. */
  onOpen?: () => void;
  size?: Size;
}) {
  const prepare = () => onOpen?.();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideCloseRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ignoreOutsideCloseRef.current) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panelStyle = useAnchoredPanel(open, wrapRef);
  const underline = normalizeHexColor(currentColor ?? '') ?? '#0f172a';

  const toggle = () => {
    if (disabled) return;
    if (!open) onOpen?.();
    setOpen((o) => !o);
  };

  return (
    <div className="relative shrink-0" ref={wrapRef} data-toolbar-popover>
      <button
        type="button"
        disabled={disabled}
        title="Text color"
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerDown={() => onOpen?.()}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={toggle}
        className={cn(
          triggerBase,
          open && 'border-brand-blue/50 bg-brand-blue/5 ring-1 ring-brand-blue/20',
          size === 'md' ? 'h-8 min-w-[2.65rem] px-1' : 'h-[28px] min-w-[2.65rem] px-1',
        )}
      >
        <span className="flex flex-col items-center justify-center leading-none">
          <span className="font-black text-[11px]">A</span>
          <span className="mt-0.5 h-0.5 w-[1rem] rounded-sm" style={{ backgroundColor: underline }} />
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      {open && (
        <div
          className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          style={panelStyle}
          role="dialog"
          aria-label="Text colors"
          data-toolbar-popover
        >
          <ColorPickerPanel
            swatches={STANDARD_TEXT_COLORS}
            currentValue={currentColor}
            clearLabel="Default (no text color)"
            onPrepare={prepare}
            onApply={(hex) => onPick(hex)}
            onSwatchApply={(hex) => {
              onPick(hex);
              setOpen(false);
            }}
            onClear={() => {
              onClear();
              setOpen(false);
            }}
            onNativePickerOpen={() => {
              ignoreOutsideCloseRef.current = true;
              prepare();
            }}
            onNativePickerClose={() => {
              window.setTimeout(() => {
                ignoreOutsideCloseRef.current = false;
              }, 400);
            }}
          />
        </div>
      )}
    </div>
  );
}

export function RichEditorHighlightDropdown({
  disabled,
  currentHighlightColor,
  onPick,
  onClear,
  onOpen,
  quickColor,
  size = 'md',
}: {
  disabled?: boolean;
  currentHighlightColor?: string;
  onPick: (hex: string) => void;
  onClear: () => void;
  onOpen?: () => void;
  /** Apply this color on click, then open the palette. Headings use brand yellow. */
  quickColor?: string;
  size?: Size;
}) {
  const prepare = () => onOpen?.();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideCloseRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ignoreOutsideCloseRef.current) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panelStyle = useAnchoredPanel(open, wrapRef);
  const hasHighlight = Boolean(currentHighlightColor);
  const toggle = () => {
    if (disabled) return;
    if (!open) onOpen?.();
    setOpen((o) => !o);
  };

  return (
    <div className="relative shrink-0" ref={wrapRef} data-toolbar-popover>
      <button
        type="button"
        disabled={disabled}
        title="Background / highlight color"
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerDown={() => onOpen?.()}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={() => {
          if (quickColor) onPick(quickColor);
          toggle();
        }}
        className={cn(
          triggerBase,
          open && 'border-brand-blue/50 bg-brand-blue/5 ring-1 ring-brand-blue/20',
          hasHighlight && 'border-amber-300/80 bg-amber-50/80',
          size === 'md' ? 'h-8 min-w-[2.65rem] px-1' : 'h-[28px] min-w-[2.65rem] px-1',
        )}
      >
        <Highlighter className={cn('h-3.5 w-3.5 shrink-0', hasHighlight ? 'text-amber-700' : 'text-slate-500')} />
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      {open && (
        <div
          className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          style={panelStyle}
          role="dialog"
          aria-label="Highlight colors"
          data-toolbar-popover
        >
          <ColorPickerPanel
            swatches={STANDARD_HIGHLIGHT_COLORS}
            currentValue={currentHighlightColor}
            clearLabel="No background highlight"
            onPrepare={prepare}
            onApply={(hex) => onPick(hex)}
            onSwatchApply={(hex) => {
              onPick(hex);
              setOpen(false);
            }}
            onClear={() => {
              onClear();
              setOpen(false);
            }}
            onNativePickerOpen={() => {
              ignoreOutsideCloseRef.current = true;
              prepare();
            }}
            onNativePickerClose={() => {
              window.setTimeout(() => {
                ignoreOutsideCloseRef.current = false;
              }, 400);
            }}
          />
        </div>
      )}
    </div>
  );
}
