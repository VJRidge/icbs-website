import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Pencil, RotateCcw } from 'lucide-react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { parseTextShadow, type BlogTextShadow } from '../../../lib/blog/blogParagraphBlockStyle';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { useActiveEditor } from '../../../contexts/ActiveEditorContext';
import { EDITOR_FONT_FAMILY_OPTIONS, EDITOR_FONT_SIZE_OPTIONS } from '../../../lib/editorFontChoices';
import {
  applyEditorBlockAlign,
  applyEditorFontFamily,
  applyEditorFontSize,
  collapseSelectionToCurrentTextblock,
} from '../../../lib/tiptapTextStyleCommands';
import BlogInspectorColorControl from './BlogInspectorColorControl';
import { BlogInspectorFieldRow, BlogInspectorIconButton } from './BlogInspectorFieldRow';
import {
  blogDataNum,
  BlogInspectorAlignmentCompact,
  type BlogTextAlign,
} from './BlogInspectorControls';

type ColorState = 'normal' | 'hover';

function withWholeBlockSelection(editor: Editor, run: () => void) {
  const end = editor.state.doc.content.size;
  editor.chain().setTextSelection({ from: 0, to: Math.max(0, end) }).run();
  run();
  collapseSelectionToCurrentTextblock(editor);
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-700">
      <span className="w-16 shrink-0 text-[11px] text-slate-600">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center font-mono text-[11px]"
      />
    </label>
  );
}

function TypographyPopover({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const attrs = editor.getAttributes('textStyle') as {
    fontFamily?: string;
    fontSize?: string;
    letterSpacing?: string;
  };
  const parent = editor.state.selection.$from.parent;
  const lineHeightRaw = (parent.attrs.lineHeight as string | null) ?? '';
  const lineHeightNum = parseFloat(lineHeightRaw) || 1.6;

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  const applyFamily = (value: string) => {
    withWholeBlockSelection(editor, () => applyEditorFontFamily(editor, value));
  };
  const applySize = (value: string) => {
    withWholeBlockSelection(editor, () => applyEditorFontSize(editor, value));
  };
  const applyLineHeight = (n: number) => {
    withWholeBlockSelection(editor, () => {
      editor.commands.setBlogLineHeight(n > 0 ? String(n) : null);
    });
  };
  const applyLetterSpacing = (px: number) => {
    withWholeBlockSelection(editor, () => {
      if (px === 0) editor.chain().focus().unsetLetterSpacing().run();
      else editor.chain().focus().setLetterSpacing(`${px}px`).run();
    });
  };

  const letterPx = parseFloat(String(attrs.letterSpacing ?? '0').replace('px', '')) || 0;

  return (
    <div
      ref={wrapRef}
      className="absolute right-0 top-full z-[400] mt-1 w-[min(260px,88vw)] rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
      role="dialog"
      aria-label="Typography"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Typography</p>
      <div className="space-y-2">
        <label className="block text-xs text-slate-700">
          <span className="mb-0.5 block text-[11px] text-slate-600">Family</span>
          <select
            value={attrs.fontFamily ?? ''}
            onChange={(e) => applyFamily(e.target.value)}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
          >
            {EDITOR_FONT_FAMILY_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-700">
          <span className="mb-0.5 block text-[11px] text-slate-600">Size</span>
          <select
            value={attrs.fontSize ?? ''}
            onChange={(e) => applySize(e.target.value)}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
          >
            {EDITOR_FONT_SIZE_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-700">
          <span className="mb-0.5 block text-[11px] text-slate-600">Weight</span>
          <select
            defaultValue={editor.isActive('bold') ? '700' : '400'}
            onChange={(e) => {
              withWholeBlockSelection(editor, () => {
                const v = e.target.value;
                if (v === '700') editor.chain().focus().setBold().run();
                else editor.chain().focus().unsetBold().run();
              });
            }}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
          >
            <option value="400">Default</option>
            <option value="700">Bold</option>
          </select>
        </label>
        <label className="block text-xs text-slate-700">
          <span className="mb-0.5 block text-[11px] text-slate-600">Style</span>
          <select
            defaultValue={editor.isActive('italic') ? 'italic' : 'normal'}
            onChange={(e) => {
              withWholeBlockSelection(editor, () => {
                if (e.target.value === 'italic') editor.chain().focus().setItalic().run();
                else editor.chain().focus().unsetItalic().run();
              });
            }}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
          >
            <option value="normal">Default</option>
            <option value="italic">Italic</option>
          </select>
        </label>
        <SliderRow label="Line-Height" value={lineHeightNum} min={1} max={2.5} step={0.05} onChange={applyLineHeight} />
        <SliderRow label="Letter Spacing" value={letterPx} min={-2} max={12} step={0.5} onChange={applyLetterSpacing} />
      </div>
    </div>
  );
}

function TextShadowPopover({
  shadow,
  onChange,
  onClose,
}: {
  shadow: BlogTextShadow;
  onChange: (patch: BlogTextShadow) => void;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const blur = shadow.blur ?? 0;
  const h = shadow.horizontal ?? 0;
  const v = shadow.vertical ?? 0;
  const color = shadow.color ?? 'rgba(0,0,0,0.25)';

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  return (
    <div
      ref={wrapRef}
      className="absolute right-0 top-full z-[400] mt-1 w-[min(260px,88vw)] rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
      role="dialog"
      aria-label="Text shadow"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Text Shadow</p>
      <div className="space-y-2">
        <SliderRow label="Blur" value={blur} min={0} max={40} onChange={(n) => onChange({ ...shadow, blur: n })} />
        <SliderRow
          label="Horizontal"
          value={h}
          min={-40}
          max={40}
          onChange={(n) => onChange({ ...shadow, horizontal: n })}
        />
        <SliderRow label="Vertical" value={v} min={-40} max={40} onChange={(n) => onChange({ ...shadow, vertical: n })} />
        <label className="flex items-center gap-2 text-xs">
          <span className="w-16 text-[11px] text-slate-600">Color</span>
          <input
            type="color"
            value={color.startsWith('#') ? color : '#000000'}
            onChange={(e) => onChange({ ...shadow, color: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border border-slate-200"
          />
        </label>
      </div>
    </div>
  );
}

/** Elementor-style Style tab for paragraph / text editor blocks. */
export default function BlogParagraphStyleInspector({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { getBlogParagraphEditor, blogParagraphEditorVersion } = useActiveEditor();
  const data = block.data as Record<string, unknown>;
  const editor = getBlogParagraphEditor(block.id);

  const [colorState, setColorState] = useState<ColorState>('normal');
  const [typographyOpen, setTypographyOpen] = useState(false);
  const [shadowOpen, setShadowOpen] = useState(false);

  const align = (['left', 'center', 'right', 'justify'].includes(String(data.align))
    ? String(data.align)
    : 'left') as BlogTextAlign;

  const shadow = parseTextShadow(data);
  const paragraphSpacing = blogDataNum(data, 'paragraphSpacing', 0);

  const textColor = colorState === 'normal' ? String(data.textColor ?? '') : String(data.hoverTextColor ?? '');
  const linkColor = colorState === 'normal' ? String(data.linkColor ?? '') : String(data.hoverLinkColor ?? '');

  const patchTextColor = (hex: string) => {
    if (colorState === 'normal') updateBlock(block.id, { textColor: hex });
    else updateBlock(block.id, { hoverTextColor: hex });
  };
  const patchLinkColor = (hex: string) => {
    if (colorState === 'normal') updateBlock(block.id, { linkColor: hex });
    else updateBlock(block.id, { hoverLinkColor: hex });
  };

  const setAlign = (v: BlogTextAlign) => {
    updateBlock(block.id, { align: v });
    const ed = getBlogParagraphEditor(block.id);
    if (ed && !ed.isDestroyed) applyEditorBlockAlign(ed, v);
  };

  const hasEditor = Boolean(editor && !editor.isDestroyed);
  void blogParagraphEditorVersion;

  return (
    <div className="space-y-0">
      <p className="border-b border-slate-100 px-1 pb-2 text-[11px] font-bold text-slate-800">Text Editor</p>

      <BlogInspectorFieldRow label="Alignment" responsive>
        <BlogInspectorAlignmentCompact value={align} onChange={setAlign} />
      </BlogInspectorFieldRow>

      <BlogInspectorFieldRow label="Typography">
        <div className="relative">
          <BlogInspectorIconButton
            title="Edit typography"
            active={typographyOpen}
            onClick={() => {
              if (!hasEditor) return;
              setTypographyOpen((o) => !o);
              setShadowOpen(false);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </BlogInspectorIconButton>
          {typographyOpen && editor ? (
            <TypographyPopover editor={editor} onClose={() => setTypographyOpen(false)} />
          ) : null}
        </div>
      </BlogInspectorFieldRow>
      {!hasEditor ? (
        <p className="px-1 pb-2 text-[10px] text-slate-500">Select this block on the canvas to edit typography.</p>
      ) : null}

      <BlogInspectorFieldRow label="Text Shadow">
        <div className="relative flex items-center gap-1">
          <BlogInspectorIconButton
            title="Reset shadow"
            onClick={() => updateBlock(block.id, { textShadow: { horizontal: 0, vertical: 0, blur: 0, color: 'rgba(0,0,0,0.25)' } })}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </BlogInspectorIconButton>
          <BlogInspectorIconButton
            title="Edit shadow"
            active={shadowOpen}
            onClick={() => {
              setShadowOpen((o) => !o);
              setTypographyOpen(false);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </BlogInspectorIconButton>
          {shadowOpen ? (
            <TextShadowPopover
              shadow={shadow}
              onChange={(textShadow) => updateBlock(block.id, { textShadow })}
              onClose={() => setShadowOpen(false)}
            />
          ) : null}
        </div>
      </BlogInspectorFieldRow>

      <BlogInspectorFieldRow label="Paragraph Spacing" responsive>
        <input
          type="range"
          min={0}
          max={48}
          value={paragraphSpacing}
          onChange={(e) => updateBlock(block.id, { paragraphSpacing: Number(e.target.value) || 0 })}
          className="w-20"
        />
        <input
          type="number"
          min={0}
          max={48}
          value={paragraphSpacing}
          onChange={(e) => updateBlock(block.id, { paragraphSpacing: Number(e.target.value) || 0 })}
          className="w-10 rounded border border-slate-200 px-1 py-0.5 text-center font-mono text-[11px]"
        />
        <span className="text-[10px] text-slate-500">px</span>
      </BlogInspectorFieldRow>

      <div className="flex border-b border-slate-100 py-2">
        {(['normal', 'hover'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setColorState(id)}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition ${
              colorState === id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      <BlogInspectorFieldRow label="Text Color">
        <BlogInspectorColorControl value={textColor} onChange={patchTextColor} title="Text color" />
      </BlogInspectorFieldRow>

      <BlogInspectorFieldRow label="Link Color">
        <BlogInspectorColorControl value={linkColor} onChange={patchLinkColor} title="Link color" />
      </BlogInspectorFieldRow>
    </div>
  );
}
