import { useLayoutEffect, useState, type ChangeEvent } from 'react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import { BRAND_HEADING_MARK, headingPhrasePatch } from '../../../../brand/headingHighlight';
import { PIECE_FONTS } from '../../../../brand/brandPieces';
import { FontSize } from '../../../../brand/BrandPiecePanel';
import BlogColumnsBlock from '../blocks/BlogColumnsBlock';
import BlogHeadingBlock from '../blocks/BlogHeadingBlock';
import KitBlockFields from '../blocks/brand/KitBlockFields';
import BlogFormatToolbar from './BlogFormatToolbar';
import BrandBlockFields from '../../../../brand/BrandBlockFields';
import { BrandPieceGeneral, BrandPieceInteractions, BrandPieceStyle, useSelectedPiece } from '../../../../brand/BrandPiecePanel';
import { isBrandBlockType } from '../../../../brand/brandBlockTypes';
import {
  BlogInspectorAdvancedPanel,
  BlogInspectorAlignment,
  BlogInspectorSpacing,
  blogDataNum,
} from './BlogInspectorControls';
import BlogInspectorColorControl from './BlogInspectorColorControl';
import BlogInspectorSection from './BlogInspectorSection';
import { RichEditorFontControls } from '../../RichEditorFontControls';
import BlogParagraphStyleInspector from './BlogParagraphStyleInspector';
import MediaWidgetFields from './MediaWidgetFields';
import DeviceStyleOverrides from './DeviceStyleOverrides';
import type { BlogInspectorTabId } from './BlogInspectorTabs';

function CanvasHint({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-slate-600">
      {children ?? (
        <>
          Use the <strong>canvas</strong> for rich formatting (fonts, colors, links). Changes there update this module
          automatically.
        </>
      )}
    </p>
  );
}

function HeadingContent({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const level = Math.min(6, Math.max(1, Number(block.data.level) || 2));
  const link = String(block.data.link ?? '');
  const setPhrase = (phrase: string) => updateBlock(block.id, headingPhrasePatch(String(block.data.text ?? ''), phrase));
  return (
    <div className="space-y-3">
      <div data-paragraph-editor>
        <BlogFormatToolbar />
        <div className="px-1 pt-2">
          <BlogHeadingBlock block={block} isEditing toolbarSource />
        </div>
      </div>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Link</span>
        <input
          value={link}
          onChange={(e) => updateBlock(block.id, { link: e.target.value })}
          placeholder="https:// or /page"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#7c3aed]"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Highlight phrase</span>
        <input
          value={String(block.data.highlight ?? '')}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="Words to mark inside the title"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#7c3aed]"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">HTML tag</span>
        <select
          value={level}
          onChange={(e) => updateBlock(block.id, { level: Number(e.target.value) })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {[1, 2, 3, 4, 5, 6].map((tag) => (
            <option key={tag} value={tag}>
              H{tag}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const HERO_CREAM = '#f7f7f2';

function rgbToHex(color: string): string | null {
  const match = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(color);
  if (!match) return null;
  const hex = [match[1], match[2], match[3]]
    .map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

function cssEscapeId(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/"/g, '');
}

function useUsedTextColor(blockId: string, explicit: string): string {
  const [used, setUsed] = useState(HERO_CREAM);
  useLayoutEffect(() => {
    if (explicit.trim()) return;
    const id = cssEscapeId(blockId);
    const host = document.querySelector(`[data-nested-id="${id}"], [data-stack-id="${id}"]`);
    const el = host?.querySelector('h1, h2, h3, h4, h5, h6, p');
    if (!(el instanceof HTMLElement)) return;
    const hex = rgbToHex(getComputedStyle(el).color);
    if (hex) setUsed(hex);
  }, [blockId, explicit]);
  return explicit.trim() ? explicit : used;
}

function ColorRow({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
}) {
  const stored = value.trim();
  return (
    <div className="block text-xs text-slate-700">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <BlogInspectorColorControl
          value={stored}
          fallback={fallback}
          onChange={onChange}
          title={stored ? label : `${label} (default)`}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stored ? stored : 'Default'}</span>
      </div>
    </div>
  );
}

function HeadingStyle({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const align = (['left', 'center', 'right'].includes(String(block.data.align))
    ? String(block.data.align)
    : 'left') as 'left' | 'center' | 'right';
  const color = String(block.data.color ?? '');
  const usedColor = useUsedTextColor(block.id, color);
  const highlightColor = String(block.data.highlightColor ?? '');
  const shadow = String(block.data.shadow ?? '') === 'soft' ? 'soft' : 'none';
  return (
    <div className="space-y-3">
      <BlogInspectorSection title="Typography">
        <RichEditorFontControls
          block={{
            fontFamily: String(block.data.fontFamily ?? ''),
            fontSize: String(block.data.fontSize ?? ''),
            families: PIECE_FONTS,
            onFontFamily: (fontFamily) => updateBlock(block.id, { fontFamily }),
            onFontSize: (fontSize) => updateBlock(block.id, { fontSize }),
          }}
        />
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Font weight</span>
          <select
            value={String(block.data.fontWeight ?? '')}
            onChange={(e) => updateBlock(block.id, { fontWeight: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Default</option>
            <option value="300">300 Light</option>
            <option value="400">400 Normal</option>
            <option value="500">500 Medium</option>
            <option value="700">700 Bold</option>
          </select>
        </label>
        <ColorRow
          label="Text color"
          value={color}
          fallback={usedColor}
          onChange={(next) => updateBlock(block.id, { color: next })}
        />
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Highlight phrase</span>
          <input
            value={String(block.data.highlight ?? '')}
            onChange={(e) => updateBlock(block.id, headingPhrasePatch(String(block.data.text ?? ''), e.target.value))}
            placeholder="Words to mark inside the title"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#7c3aed]"
          />
        </label>
        <ColorRow
          label="Highlight color"
          value={highlightColor}
          fallback={BRAND_HEADING_MARK}
          onChange={(next) => updateBlock(block.id, { highlightColor: next })}
        />
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Shadow</span>
          <select
            value={shadow}
            onChange={(e) => updateBlock(block.id, { shadow: e.target.value === 'soft' ? 'soft' : '' })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="none">None</option>
            <option value="soft">Soft</option>
          </select>
        </label>
      </BlogInspectorSection>
      <BlogInspectorAlignment value={align} onChange={(v) => updateBlock(block.id, { align: v })} />
      <BlogInspectorSpacing
        marginTop={blogDataNum(block.data as Record<string, unknown>, 'marginTop', 0)}
        marginBottom={blogDataNum(block.data as Record<string, unknown>, 'marginBottom', 0)}
        onChange={(p) => updateBlock(block.id, p)}
      />
    </div>
  );
}

function GenericTextContent({ block, label, multiline }: { block: BlogBlock; label: string; multiline?: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const text = String(block.data.text ?? '');
  const Field = multiline ? 'textarea' : 'input';
  return (
    <label className="block text-xs text-slate-700">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <Field
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          updateBlock(block.id, { text: e.target.value })
        }
        rows={multiline ? 6 : undefined}
        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-blue/50"
      />
    </label>
  );
}

function ImageContent({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const url = String(block.data.url ?? '');
  const caption = String(block.data.caption ?? '');
  const link = String(block.data.link ?? '');
  const linkMode = link && link === url ? 'media' : link ? 'custom' : 'none';
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Image</span>
        <button
          type="button"
          onClick={() => openMediaLibrary((next) => updateBlock(block.id, { url: next }), 'Choose image')}
          className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-2 text-left hover:border-[#7c3aed]"
        >
          {url ? (
            <img src={url} alt="" className="h-14 w-14 rounded object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-400">
              None
            </span>
          )}
          <span className="text-xs font-bold text-slate-700">Choose image</span>
        </button>
      </div>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Caption</span>
        <select
          value={caption.trim() ? 'custom' : 'none'}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value === 'none' ? '' : caption || 'Caption' })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="none">None</option>
          <option value="custom">Custom caption</option>
        </select>
      </label>
      {caption.trim() ? (
        <input
          value={caption}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      ) : null}
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Link</span>
        <select
          value={linkMode}
          onChange={(e) => {
            const mode = e.target.value;
            updateBlock(block.id, { link: mode === 'media' ? url : mode === 'custom' ? link || 'https://' : '' });
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="none">None</option>
          <option value="media">Media file</option>
          <option value="custom">Custom URL</option>
        </select>
      </label>
      {linkMode === 'custom' ? (
        <input
          value={link}
          onChange={(e) => updateBlock(block.id, { link: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}

function ImageStyle({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const align = String(block.data.align ?? 'center');
  const width = String(block.data.width ?? 'full');
  return (
    <div className="space-y-3">
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Alignment</span>
        <select
          value={align}
          onChange={(e) => updateBlock(block.id, { align: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Width</span>
        <select
          value={width}
          onChange={(e) => updateBlock(block.id, { width: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="wide">Wide</option>
          <option value="full">Full</option>
        </select>
      </label>
    </div>
  );
}

function ButtonContent({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  return (
    <div className="space-y-3">
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Text</span>
        <input
          value={String(block.data.text ?? '')}
          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Link</span>
        <input
          value={String(block.data.url ?? '')}
          onChange={(e) => updateBlock(block.id, { url: e.target.value })}
          placeholder="https:// or /page"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}

function ButtonStyle({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const align = (['left', 'center', 'right'].includes(String(block.data.align))
    ? String(block.data.align)
    : 'left') as 'left' | 'center' | 'right';
  const size = ['sm', 'md', 'lg'].includes(String(block.data.size)) ? String(block.data.size) : 'md';
  const storedWidth = String(block.data.buttonWidth ?? '');
  const widthMode = storedWidth === 'full' ? 'full' : /^\d+(\.\d+)?$/.test(storedWidth) ? 'custom' : 'auto';
  return (
    <div className="space-y-3">
      <BlogInspectorAlignment value={align} onChange={(value) => updateBlock(block.id, { align: value })} />
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Size</span>
        <select
          value={size}
          onChange={(e) => updateBlock(block.id, { size: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Width</span>
        <select
          value={widthMode}
          onChange={(e) => {
            const next = e.target.value;
            updateBlock(block.id, { buttonWidth: next === 'full' ? 'full' : next === 'custom' ? storedWidth || '220' : '' });
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="auto">Auto</option>
          <option value="full">Full width</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      {widthMode === 'custom' ? (
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Width (px)</span>
          <input
            type="number"
            min={80}
            max={800}
            value={storedWidth}
            onChange={(e) => updateBlock(block.id, { buttonWidth: e.target.value.replace(/[^\d.]/g, '') })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <FontSize
        value={String(block.data.fontSize ?? '')}
        onChange={(value) => updateBlock(block.id, { fontSize: value })}
      />
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Text color</span>
        <input
          type="color"
          value={String(block.data.color || '#F3D13D')}
          onChange={(e) => updateBlock(block.id, { color: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
        />
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Background</span>
        <input
          type="color"
          value={String(block.data.backgroundColor || '#1A5340')}
          onChange={(e) => updateBlock(block.id, { backgroundColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
        />
      </label>
    </div>
  );
}

function PostsContent({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const columns = Number(block.data.columns) === 3 ? 3 : Number(block.data.columns) === 1 ? 1 : 2;
  const limit = Math.min(12, Math.max(1, Number(block.data.limit) || 3));
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-600">Shows published posts, newest first.</p>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Columns</span>
        <select
          value={columns}
          onChange={(e) => updateBlock(block.id, { columns: Number(e.target.value) })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Posts per page</span>
        <input
          type="number"
          min={1}
          max={12}
          value={limit}
          onChange={(e) => updateBlock(block.id, { limit: Math.min(12, Math.max(1, Number(e.target.value) || 3)) })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}

function AccordionContent({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const oneAtATime = block.data.allowMultiple === false;
  return (
    <label className="flex items-center gap-2 text-xs text-slate-700">
      <input
        type="checkbox"
        checked={oneAtATime}
        onChange={(event) => updateBlock(block.id, { allowMultiple: !event.target.checked })}
      />
      Only one question open at a time
    </label>
  );
}

function InspectorContentTab({ block }: { block: BlogBlock }) {
  const piece = useSelectedPiece(block.id);
  if (block.type === 'slideshow' || block.type === 'carousel') return <MediaWidgetFields block={block} tab="content" />;
  if (isBrandBlockType(block.type)) {
    return piece ? <BrandPieceGeneral block={block} field={piece} /> : <BrandBlockFields block={block} />;
  }
  switch (block.type) {
    case 'paragraph':
      return (
        <CanvasHint>
          Click the paragraph on the page. The toolbar above it is the text editor: style, bold, italic, lists, font,
          and size.
        </CanvasHint>
      );
    case 'heading':
      return <HeadingContent block={block} />;
    case 'image':
      return <ImageContent block={block} />;
    case 'button':
      return <ButtonContent block={block} />;
    case 'post_teasers':
      return <PostsContent block={block} />;
    case 'quote':
    case 'callout':
    case 'banner':
    case 'card':
    case 'newsletter':
    case 'contact_cta':
    case 'icon_box':
    case 'animated_headline':
    case 'testimonial':
      return <GenericTextContent block={block} label="Text" multiline />;
    case 'columns':
      return <BlogColumnsBlock block={block} isEditing inspectorTab="content" />;
    case 'accordion':
      return <AccordionContent block={block} />;
    case 'kit_hero':
    case 'kit_contents':
    case 'kit_gallery':
    case 'kit_closing':
    case 'kit_text':
    case 'kit_signup':
    case 'kit_questions':
      return <KitBlockFields block={block} />;
    default:
      return (
        <div className="space-y-2">
          <CanvasHint />
          <p className="text-[11px] text-slate-500">
            This block type is edited on the canvas. Use <strong>Style</strong> and <strong>Advanced</strong> here for
            layout and spacing when available.
          </p>
        </div>
      );
  }
}

function InspectorStyleTab({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const data = block.data as Record<string, unknown>;
  const piece = useSelectedPiece(block.id);

  if (block.type === 'columns') {
    return <BlogColumnsBlock block={block} isEditing inspectorTab="style" />;
  }

  if (block.type === 'slideshow' || block.type === 'carousel') {
    return <MediaWidgetFields block={block} tab="style" />;
  }

  if (block.type === 'heading') {
    return <HeadingStyle block={block} />;
  }

  if (block.type === 'image') {
    return <ImageStyle block={block} />;
  }

  if (block.type === 'button') {
    return <ButtonStyle block={block} />;
  }

  if (block.type === 'paragraph') {
    return <BlogParagraphStyleInspector block={block} />;
  }

  const hasAlign = 'align' in data;
  const hasMargin =
    'marginTop' in data || 'marginBottom' in data || block.type === 'image' || block.type === 'gallery';

  if (isBrandBlockType(block.type)) return <BrandPieceStyle block={block} field={piece} />;

  if (!hasAlign && !hasMargin) {
    return <CanvasHint>No extra style fields for this module. Adjust appearance on the canvas or in block controls.</CanvasHint>;
  }

  return (
    <div className="space-y-3">
      {hasAlign ? (
        <BlogInspectorAlignment
          value={(String(data.align) === 'right' ? 'right' : String(data.align) === 'center' ? 'center' : 'left') as 'left' | 'center' | 'right'}
          onChange={(v) => updateBlock(block.id, { align: v })}
        />
      ) : null}
      {hasMargin ? (
        <BlogInspectorSpacing
          marginTop={blogDataNum(data, 'marginTop', 0)}
          marginBottom={blogDataNum(data, 'marginBottom', 0)}
          onChange={(p) => updateBlock(block.id, p)}
        />
      ) : null}
    </div>
  );
}

/** Renders the correct inspector panel for Content / Style / Advanced (not the full canvas block). */
export default function BlogBlockInspectorTabContent({
  block,
  tab,
}: {
  block: BlogBlock;
  tab: BlogInspectorTabId;
}) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);

  const piece = useSelectedPiece(block.id);

  if (tab === 'advanced') {
    if (isBrandBlockType(block.type)) return <BrandPieceInteractions block={block} field={piece} />;
    if (block.type === 'columns') {
      return <BlogColumnsBlock block={block} isEditing inspectorTab="advanced" />;
    }
    return (
      <BlogInspectorAdvancedPanel
        blockId={block.id}
        data={block.data as Record<string, unknown>}
        onPatch={updateBlock}
      />
    );
  }

  if (tab === 'style') {
    return (
      <>
        <DeviceStyleOverrides block={block} />
        <InspectorStyleTab block={block} />
      </>
    );
  }

  return <InspectorContentTab block={block} />;
}
