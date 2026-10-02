import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { cn } from '../lib/utils';
import { EDITOR_FONT_FAMILY_OPTIONS, EDITOR_FONT_SIZE_OPTIONS } from '../lib/editorFontChoices';
import {
  applyEditorFontFamily,
  applyEditorFontSize,
  freezeToolbarEditorSelection,
  saveToolbarEditorSelection,
} from '../lib/tiptapTextStyleCommands';

type Props = {
  editor: Editor;
  disabled?: boolean;
  /** Match compact charter toolbar height. */
  compact?: boolean;
};

/** Compare stacks after normalizing commas and stripping quotes browsers may vary on. */
function normFontFamilyStack(s: string): string {
  return s.replace(/\s*,\s*/g, ', ').replace(/['"]/g, '').trim().toLowerCase();
}

function primaryFontName(fontFamily: string): string {
  const first = fontFamily.split(',')[0]?.trim().replace(/^["']|["']$/g, '') ?? '';
  return first || 'Sans-serif';
}

function formatSizeDisplay(size: string): string {
  const t = size.trim();
  if (!t) return '';
  const m = t.match(/^([\d.]+)\s*(px|rem|em|%)?$/i);
  if (m) {
    const unit = (m[2] || 'px').toLowerCase();
    return `${m[1]} ${unit}`;
  }
  return t;
}

function normalizeFontSizeValue(size: string): string {
  const t = size.trim().toLowerCase().replace(/\s+/g, '');
  const m = t.match(/^([\d.]+)(px|rem|em|%)?$/);
  if (!m) return t;
  return `${m[1]}${m[2] || 'px'}`;
}

function getElementAtSelection(editor: Editor): HTMLElement | null {
  const { view } = editor;
  if (!view.dom.isConnected) return null;
  try {
    const pos = editor.state.selection.from;
    const dom = view.domAtPos(pos);
    let node: Node | null = dom.node;
    if (node.nodeType === Node.TEXT_NODE) {
      return node.parentElement;
    }
    if (node instanceof HTMLElement) {
      if (node.classList.contains('tiptap') && dom.offset < node.childNodes.length) {
        const child = node.childNodes[dom.offset];
        if (child instanceof HTMLElement) return child;
        if (child instanceof Text && child.parentElement) return child.parentElement;
      }
      return node;
    }
    return null;
  } catch {
    return view.dom instanceof HTMLElement ? view.dom : null;
  }
}

function getComputedTypography(editor: Editor): { family: string; size: string } {
  const el = getElementAtSelection(editor);
  if (!el) return { family: '', size: '' };
  const cs = window.getComputedStyle(el);
  return { family: cs.fontFamily, size: cs.fontSize };
}

function matchPresetFamily(storedOrComputed: string): (typeof EDITOR_FONT_FAMILY_OPTIONS)[number] | undefined {
  if (!storedOrComputed.trim()) return undefined;
  const norm = normFontFamilyStack(storedOrComputed);
  return EDITOR_FONT_FAMILY_OPTIONS.find(
    (o) => o.value && normFontFamilyStack(o.value) === norm,
  );
}

function matchPresetFamilyByPrimaryName(computedFamily: string): (typeof EDITOR_FONT_FAMILY_OPTIONS)[number] | undefined {
  const primary = primaryFontName(computedFamily).toLowerCase();
  return EDITOR_FONT_FAMILY_OPTIONS.find((o) => {
    if (!o.value) return false;
    return primaryFontName(o.value).toLowerCase() === primary;
  });
}

function matchPresetSize(storedOrComputed: string): (typeof EDITOR_FONT_SIZE_OPTIONS)[number] | undefined {
  if (!storedOrComputed.trim()) return undefined;
  const norm = normalizeFontSizeValue(storedOrComputed);
  return EDITOR_FONT_SIZE_OPTIONS.find((o) => o.value && normalizeFontSizeValue(o.value) === norm);
}

export function RichEditorFontControls({ editor, disabled, compact }: Props) {
  const [renderTick, bump] = useState(0);
  const [pxDraft, setPxDraft] = useState('');
  const pxInputFocused = useRef(false);

  useEffect(() => {
    const sync = () => bump((n) => n + 1);
    const rememberSelection = () => {
      // Only save when there is a real non-empty selection.
      // A collapsed selection means the editor just lost focus or the user
      // clicked a cursor position — don't let that overwrite a saved highlight.
      const { from, to } = editor.state.selection;
      if (from !== to) saveToolbarEditorSelection(editor);
    };
    editor.on('selectionUpdate', sync);
    editor.on('transaction', sync);
    editor.on('selectionUpdate', rememberSelection);
    return () => {
      editor.off('selectionUpdate', sync);
      editor.off('transaction', sync);
      editor.off('selectionUpdate', rememberSelection);
    };
  }, [editor]);

  const attrs = editor.getAttributes('textStyle') as {
    fontFamily?: string;
    fontSize?: string;
  };
  const rawFf = attrs.fontFamily as string | undefined;
  const ffStored = rawFf?.replace(/\s*,\s*/g, ', ').trim() ?? '';
  const sizeRaw = (attrs.fontSize as string | undefined)?.trim() ?? '';

  const computed = useMemo(() => getComputedTypography(editor), [editor, renderTick]);

  const presetFamily = ffStored ? matchPresetFamily(ffStored) : undefined;
  const familyHasExplicitMark = Boolean(ffStored);
  const familySelectValue = familyHasExplicitMark ? presetFamily?.value ?? ffStored : '';

  const presetSize = sizeRaw ? matchPresetSize(sizeRaw) : undefined;
  const sizeHasExplicitMark = Boolean(sizeRaw);
  const sizeSelectValue = sizeHasExplicitMark ? presetSize?.value ?? sizeRaw : '';

  const inheritedFamilyLabel =
    matchPresetFamilyByPrimaryName(computed.family)?.label ?? primaryFontName(computed.family);
  const inheritedSizeLabel =
    matchPresetSize(computed.size)?.label ?? (formatSizeDisplay(computed.size) || '16 px');

  const currentFamilyLabel = familyHasExplicitMark
    ? presetFamily?.label ?? primaryFontName(ffStored)
    : inheritedFamilyLabel;

  const currentSizeLabel = sizeHasExplicitMark
    ? presetSize?.label ?? formatSizeDisplay(sizeRaw)
    : inheritedSizeLabel;

  const familyNeedsCustomOption = Boolean(familySelectValue && !presetFamily);
  const sizeNeedsCustomOption = Boolean(sizeSelectValue && !presetSize);

  const selectClass = cn(
    'shrink-0 rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 disabled:opacity-40',
    compact
      ? 'h-[28px] min-w-[6.5rem] max-w-[13rem] text-[11px] px-1.5'
      : 'h-8 min-w-[6.5rem] max-w-[9.5rem] text-[11px] px-1.5',
  );

  const inputClass = cn(
    'rounded-md border border-slate-300 bg-white text-slate-800 outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 disabled:opacity-40',
    compact ? 'h-[28px] w-[4rem] text-[11px] px-1.5 text-center' : 'h-8 w-16 text-[11px] px-1.5 text-center',
  );

  const pxInputRef = useRef<HTMLInputElement>(null);
  const pxCommittingRef = useRef(false);

  const lockSelectionForControl = () => {
    if (disabled) return;
    saveToolbarEditorSelection(editor);
    freezeToolbarEditorSelection(editor);
  };

  /** Same trick as color swatches: preventDefault keeps the highlight, then focus the input. */
  const armPxInput = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    lockSelectionForControl();
    requestAnimationFrame(() => {
      pxInputRef.current?.focus({ preventScroll: true });
      pxInputRef.current?.select();
    });
  };

  const pxFromMark = (() => {
    if (!sizeRaw) return '';
    const norm = normalizeFontSizeValue(sizeRaw);
    const m = norm.match(/^([\d.]+)px$/);
    return m ? m[1] : '';
  })();

  useEffect(() => {
    if (!pxInputFocused.current) setPxDraft(pxFromMark);
  }, [pxFromMark]);

  const commitCustomPx = (raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 8 || n > 200) return false;

    freezeToolbarEditorSelection(editor);
    const applied = applyEditorFontSize(editor, `${n}px`);
    if (applied) {
      setPxDraft(String(n));
      bump((v) => v + 1);
      editor.chain().focus().run();
    }
    return applied;
  };

  return (
    <>
      <label className="sr-only" htmlFor="rich-editor-font-family">
        Font
      </label>
      <select
        id="rich-editor-font-family"
        className={selectClass}
        disabled={disabled}
        title={familyHasExplicitMark ? `Font: ${currentFamilyLabel}` : `Inherited font: ${currentFamilyLabel}`}
        value={familySelectValue}
        onPointerDown={() => lockSelectionForControl()}
        onChange={(e) => {
          applyEditorFontFamily(editor, e.target.value);
          bump((n) => n + 1);
        }}
      >
        {EDITOR_FONT_FAMILY_OPTIONS.map((o) => {
          if (o.value !== '') {
            return (
              <option key={o.label + o.value} value={o.value}>
                {o.label}
              </option>
            );
          }
          const inheritLabel = familyHasExplicitMark
            ? `Inherit (${inheritedFamilyLabel})`
            : currentFamilyLabel;
          return (
            <option key={o.label + o.value} value={o.value}>
              {inheritLabel}
            </option>
          );
        })}
        {familyNeedsCustomOption ? (
          <option value={familySelectValue}>{currentFamilyLabel}</option>
        ) : null}
      </select>
      <div className="flex shrink-0 items-center gap-0.5" title="Font size">
        <label className="sr-only" htmlFor="rich-editor-font-size">
          Size preset
        </label>
        <select
          id="rich-editor-font-size"
          className={selectClass}
          disabled={disabled}
          title={sizeHasExplicitMark ? `Size: ${currentSizeLabel}` : `Inherited size: ${currentSizeLabel}`}
          value={sizeSelectValue}
          onPointerDown={() => lockSelectionForControl()}
          onChange={(e) => {
            applyEditorFontSize(editor, e.target.value);
            bump((n) => n + 1);
          }}
        >
          {EDITOR_FONT_SIZE_OPTIONS.map((o) => {
            if (o.value !== '') {
              return (
                <option key={o.label + o.value} value={o.value}>
                  {o.label}
                </option>
              );
            }
            const inheritLabel = sizeHasExplicitMark
              ? `Inherit (${inheritedSizeLabel})`
              : currentSizeLabel;
            return (
              <option key={o.label + o.value} value={o.value}>
                {inheritLabel}
              </option>
            );
          })}
          {sizeNeedsCustomOption ? (
            <option value={sizeSelectValue}>{currentSizeLabel}</option>
          ) : null}
        </select>
        <div
          data-toolbar-text-input
          className={cn(
            'relative flex shrink-0 cursor-text items-center gap-1 rounded-md border border-slate-200 bg-white px-1',
            compact ? 'h-[28px]' : 'h-8',
          )}
          onMouseDown={armPxInput}
        >
          <span
            className={cn(
              'pointer-events-none select-none text-[10px] font-bold uppercase tracking-wide text-slate-500',
              compact ? 'hidden sm:inline' : 'inline',
            )}
          >
            Px
          </span>
          <input
            ref={pxInputRef}
            id="rich-editor-font-size-custom"
            type="number"
            min={8}
            max={200}
            step={1}
            disabled={disabled}
            data-toolbar-text-input
            className={cn(inputClass, 'border-0 bg-transparent px-0 shadow-none focus:ring-0')}
            placeholder="30"
            title="Custom size in pixels — highlight text, type a number, press Enter"
            value={pxDraft}
            onMouseDown={armPxInput}
            onChange={(e) => setPxDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                pxCommittingRef.current = true;
                commitCustomPx(e.currentTarget.value);
                pxCommittingRef.current = false;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              pxInputFocused.current = false;
              if (pxCommittingRef.current) return;
              const trimmed = e.target.value.trim();
              if (!trimmed) return;
              const related = e.relatedTarget;
              if (related instanceof Node && document.querySelector('[data-blog-editor-chrome]')?.contains(related)) {
                return;
              }
              commitCustomPx(trimmed);
            }}
            onFocus={() => {
              pxInputFocused.current = true;
            }}
          />
        </div>
      </div>
    </>
  );
}
