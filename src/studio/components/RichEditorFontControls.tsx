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

type BlockFonts = {
  fontFamily: string;
  fontSize: string;
  families: { label: string; value: string }[];
  onFontFamily: (value: string) => void;
  onFontSize: (value: string) => void;
};

type Props = {
  editor?: Editor | null;
  disabled?: boolean;
  /** Match compact charter toolbar height. */
  compact?: boolean;
  /** Heading style tab: same size presets and px field, stored on the block. */
  block?: BlockFonts;
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

export const FONT_SIZE_PX_MIN = 8;
export const FONT_SIZE_PX_MAX = 400;

/** Pixel size to send to `applyEditorFontSize`, or null when the draft is incomplete or out of range. */
export function fontSizePxToApply(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < FONT_SIZE_PX_MIN || n > FONT_SIZE_PX_MAX) return null;
  return `${Math.round(n)}px`;
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

function sizeForControl(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
  return raw;
}

function BlockFontControls({ block, disabled }: { block: BlockFonts; disabled?: boolean }) {
  const fontSize = sizeForControl(block.fontSize);
  const [pxDraft, setPxDraft] = useState('');
  const pxFocused = useRef(false);
  const pxFromSize = (() => {
    const match = fontSize.match(/^([\d.]+)px$/i);
    return match ? match[1] : '';
  })();

  useEffect(() => {
    if (!pxFocused.current) setPxDraft(pxFromSize ?? '');
  }, [pxFromSize]);

  const knownSize = EDITOR_FONT_SIZE_OPTIONS.some((option) => option.value === fontSize);
  const knownFamily = block.families.some((option) => option.value === block.fontFamily);
  const field = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-blue/50';

  const commitPx = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      block.onFontSize('');
      return;
    }
    const next = fontSizePxToApply(trimmed);
    if (next) block.onFontSize(next);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Font</span>
        <select
          className={field}
          disabled={disabled}
          value={block.fontFamily}
          onChange={(event) => block.onFontFamily(event.target.value)}
        >
          {block.families.map((font) => (
            <option key={font.label + font.value} value={font.value}>
              {font.label}
            </option>
          ))}
          {!knownFamily && block.fontFamily ? <option value={block.fontFamily}>{block.fontFamily}</option> : null}
        </select>
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Font size</span>
        <select
          className={field}
          disabled={disabled}
          value={fontSize}
          onChange={(event) => block.onFontSize(event.target.value)}
        >
          {EDITOR_FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.label + option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {!knownSize && fontSize ? <option value={fontSize}>{fontSize}</option> : null}
        </select>
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Size in px</span>
        <input
          type="number"
          min={FONT_SIZE_PX_MIN}
          max={FONT_SIZE_PX_MAX}
          step={1}
          disabled={disabled}
          className={field}
          placeholder="48"
          title="Type a pixel size. Values above 36 are allowed."
          value={pxDraft}
          onChange={(event) => setPxDraft(event.target.value)}
          onFocus={() => {
            pxFocused.current = true;
          }}
          onBlur={(event) => {
            pxFocused.current = false;
            commitPx(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            commitPx(event.currentTarget.value);
            event.currentTarget.blur();
          }}
        />
      </label>
    </div>
  );
}

export function RichEditorFontControls({ editor, disabled, compact, block }: Props) {
  if (block) return <BlockFontControls block={block} disabled={disabled} />;
  if (!editor) return null;
  return <EditorFontControls editor={editor} disabled={disabled} compact={compact} />;
}

function EditorFontControls({
  editor,
  disabled,
  compact,
}: {
  editor: Editor;
  disabled?: boolean;
  compact?: boolean;
}) {
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
  const normalizedSize = sizeRaw ? normalizeFontSizeValue(sizeRaw) : '';
  const sizeSelectValue = sizeHasExplicitMark ? presetSize?.value ?? normalizedSize : '';

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
  const keepPxFocusRef = useRef(false);

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

  const commitCustomPx = (raw: string, takeFocus = false): boolean => {
    const next = fontSizePxToApply(raw);
    if (!next) return false;

    freezeToolbarEditorSelection(editor);
    if (!takeFocus) keepPxFocusRef.current = true;
    const applied = applyEditorFontSize(editor, next);
    if (!applied) {
      keepPxFocusRef.current = false;
      return false;
    }
    setPxDraft(String(parseFloat(next)));
    bump((v) => v + 1);
    if (takeFocus) editor.chain().focus().run();
    else {
      pxInputFocused.current = true;
      requestAnimationFrame(() => {
        pxInputRef.current?.focus({ preventScroll: true });
        keepPxFocusRef.current = false;
      });
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
      <div className="flex shrink-0 items-center gap-1" title="Font size">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Size</span>
        <label className="sr-only" htmlFor="rich-editor-font-size">
          Size
        </label>
        <select
          id="rich-editor-font-size"
          className={cn(selectClass, 'min-w-[4.5rem] max-w-[6.5rem]')}
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
          onMouseDown={(event) => {
            if (event.target instanceof HTMLInputElement) return;
            armPxInput(event);
          }}
        >
          <span className="pointer-events-none select-none text-[10px] font-bold lowercase tracking-wide text-slate-500">
            px
          </span>
          <input
            ref={pxInputRef}
            id="rich-editor-font-size-custom"
            type="number"
            min={FONT_SIZE_PX_MIN}
            max={FONT_SIZE_PX_MAX}
            step={1}
            disabled={disabled}
            data-toolbar-text-input
            className={cn(inputClass, 'w-16 border-0 bg-transparent px-0 pr-1 shadow-none focus:ring-0')}
            placeholder="30"
            title="Size in pixels. Use the arrows or type a number."
            value={pxDraft}
            onChange={(e) => {
              const next = e.target.value;
              setPxDraft(next);
              const typed = (e.nativeEvent as InputEvent).inputType;
              if (typed === 'insertText' || typed === 'deleteContentBackward' || typed === 'deleteContentForward') return;
              commitCustomPx(next, false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                pxCommittingRef.current = true;
                commitCustomPx(e.currentTarget.value, true);
                pxCommittingRef.current = false;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              if (keepPxFocusRef.current) return;
              pxInputFocused.current = false;
              if (pxCommittingRef.current) return;
              const trimmed = e.target.value.trim();
              if (!trimmed) return;
              const related = e.relatedTarget;
              if (related instanceof Node && document.querySelector('[data-blog-editor-chrome]')?.contains(related)) {
                return;
              }
              commitCustomPx(trimmed, false);
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
