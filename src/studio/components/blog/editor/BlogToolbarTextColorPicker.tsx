import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { useAnchoredPanel } from '../../RichEditorColorMenus';
import {
  EDITOR_POST_BASIC_TEXT_COLORS,
  EDITOR_POST_THEME_TEXT_COLORS,
  normalizeHexColor,
} from '../../../lib/editor/brandColorPresets';
import {
  applyEditorTextColor,
  freezeToolbarEditorSelection,
  saveToolbarEditorSelection,
} from '../../../lib/tiptapTextStyleCommands';
import { cn } from '../../../lib/utils';

type Props = {
  editor: Editor;
  disabled?: boolean;
  onApplied?: () => void;
};

function swatchBtn(hex: string) {
  const light = ['#ffffff', '#ffff00', '#ffd700', '#f5d547'].includes(hex.toLowerCase());
  return cn(
    'h-6 w-6 shrink-0 rounded border transition hover:scale-110 hover:ring-2 hover:ring-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue',
    light ? 'border-slate-300' : 'border-slate-200/80',
  );
}

function SwatchRow({
  colors,
  onPick,
  onMouseDownGuard,
}: {
  colors: readonly string[];
  onPick: (hex: string) => void;
  onMouseDownGuard: (e: ReactMouseEvent) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          title={hex}
          className={swatchBtn(hex)}
          style={{ backgroundColor: hex }}
          onMouseDown={onMouseDownGuard}
          onClick={() => onPick(hex)}
        />
      ))}
    </div>
  );
}

/** Post toolbar: theme + standard swatches + native color adjuster. */
export default function BlogToolbarTextColorPicker({ editor, disabled, onApplied }: Props) {
  const raw = editor.getAttributes('textStyle').color as string | undefined;
  const underline = normalizeHexColor(raw?.trim() ? raw : '#0f172a', '#0f172a');
  const pickerValue = normalizeHexColor(raw?.trim() ? raw : '#0f172a', '#0f172a') || '#0f172a';

  const [open, setOpen] = useState(false);
  const [nativeOpen, setNativeOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(pickerValue);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelStyle = useAnchoredPanel(open, wrapRef);

  useEffect(() => {
    setHexDraft(pickerValue);
  }, [pickerValue]);

  const lockSelection = () => {
    if (disabled) return;
    saveToolbarEditorSelection(editor);
    freezeToolbarEditorSelection(editor);
  };

  const apply = (hex: string, options?: { refocus?: boolean; close?: boolean }) => {
    if (disabled) return;
    if (applyEditorTextColor(editor, hex, { refocus: options?.refocus !== false })) onApplied?.();
    if (options?.close !== false) setOpen(false);
  };

  const pickFromDropdown = (hex: string) => {
    apply(hex, { close: true });
  };

  const clearColor = () => {
    apply('', { close: true });
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: globalThis.MouseEvent) => {
      if (nativeOpen) return;
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
  }, [open, nativeOpen]);

  const toggle = () => {
    if (disabled) return;
    if (!open) lockSelection();
    setOpen((o) => !o);
  };

  const guardSelection = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lockSelection();
  };

  return (
    <div
      className="relative shrink-0 rounded-md border border-slate-200 bg-white px-0.5 py-0.5"
      data-blog-toolbar-color
      ref={wrapRef}
    >
      <button
        type="button"
        disabled={disabled}
        title="Text color"
        aria-expanded={open}
        aria-haspopup="dialog"
        onMouseDown={guardSelection}
        onClick={toggle}
        className={cn(
          'inline-flex h-[28px] min-w-[2.65rem] shrink-0 items-center justify-center gap-0.5 rounded-md border border-transparent px-1 text-slate-700 transition hover:border-brand-blue/40 hover:text-brand-blue disabled:pointer-events-none disabled:opacity-40',
          open && 'border-brand-blue/50 bg-brand-blue/5 ring-1 ring-brand-blue/20',
        )}
      >
        <span className="flex flex-col items-center justify-center leading-none">
          <span className="font-black text-[11px]">A</span>
          <span className="mt-0.5 h-0.5 w-[1rem] rounded-sm" style={{ backgroundColor: underline }} />
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      {open ? (
        <div
          className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          style={panelStyle}
          role="dialog"
          aria-label="Text colors"
          data-toolbar-popover-panel
          onMouseDown={(e) => {
            e.stopPropagation();
            lockSelection();
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <label
              className="relative block h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-300 shadow-sm"
              title="Open color picker to adjust"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                lockSelection();
                setNativeOpen(true);
              }}
            >
              <span className="absolute inset-0 block" style={{ backgroundColor: pickerValue }} aria-hidden />
              <input
                type="color"
                value={pickerValue}
                onInput={(e) => {
                  lockSelection();
                  apply(e.currentTarget.value, { refocus: false, close: false });
                }}
                onChange={(e) => {
                  lockSelection();
                  apply(e.target.value, { refocus: true, close: false });
                  setNativeOpen(false);
                }}
                onBlur={() => setNativeOpen(false)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Adjust color"
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Hex</span>
              <input
                value={hexDraft}
                spellCheck={false}
                onChange={(event) => {
                  const next = event.target.value;
                  setHexDraft(next);
                  const raw = next.trim().startsWith('#') ? next.trim() : `#${next.trim()}`;
                  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return;
                  apply(normalizeHexColor(raw), { refocus: false, close: false });
                }}
                className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs uppercase"
                aria-label="Color code"
              />
            </label>
          </div>
          <p className="mb-1 px-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Theme</p>
          <SwatchRow colors={EDITOR_POST_THEME_TEXT_COLORS} onPick={pickFromDropdown} onMouseDownGuard={guardSelection} />
          <p className="mb-1 mt-2 px-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Colors</p>
          <SwatchRow colors={EDITOR_POST_BASIC_TEXT_COLORS} onPick={pickFromDropdown} onMouseDownGuard={guardSelection} />
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            onMouseDown={guardSelection}
            onClick={clearColor}
          >
            Default (no text color)
          </button>
        </div>
      ) : null}
    </div>
  );
}
