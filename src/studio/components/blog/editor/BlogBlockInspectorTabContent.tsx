import type { ChangeEvent } from 'react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import BlogColumnsBlock from '../blocks/BlogColumnsBlock';
import {
  BlogInspectorAdvancedPanel,
  BlogInspectorAlignment,
  BlogInspectorSpacing,
  blogDataNum,
} from './BlogInspectorControls';
import BlogParagraphStyleInspector from './BlogParagraphStyleInspector';
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
  const text = String(block.data.text ?? '');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {[1, 2, 3, 4, 5, 6].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => updateBlock(block.id, { level: l })}
            className={`rounded px-2 py-1 text-xs font-bold transition-colors ${
              level === l ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            H{l}
          </button>
        ))}
      </div>
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Heading text</span>
        <input
          value={text}
          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-brand-blue outline-none focus:border-brand-blue/50"
          placeholder={`Heading ${level}…`}
        />
      </label>
    </div>
  );
}

function HeadingStyle({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const align = (['left', 'center', 'right'].includes(String(block.data.align))
    ? String(block.data.align)
    : 'left') as 'left' | 'center' | 'right';
  const color = String(block.data.color ?? '');
  return (
    <div className="space-y-3">
      <BlogInspectorAlignment value={align} onChange={(v) => updateBlock(block.id, { align: v })} />
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Text color</span>
        <input
          type="color"
          value={color || '#1e3a8a'}
          onChange={(e) => updateBlock(block.id, { color: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
        />
      </label>
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

function InspectorContentTab({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <CanvasHint>Edit this paragraph in the <strong>Content</strong> tab (visual editor).</CanvasHint>;
    case 'heading':
      return <HeadingContent block={block} />;
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
    case 'button':
      return <GenericTextContent block={block} label="Button label" />;
    case 'columns':
      return <BlogColumnsBlock block={block} isEditing inspectorTab="content" />;
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

  if (block.type === 'columns') {
    return <BlogColumnsBlock block={block} isEditing inspectorTab="style" />;
  }

  if (block.type === 'heading') {
    return <HeadingStyle block={block} />;
  }

  if (block.type === 'paragraph') {
    return <BlogParagraphStyleInspector block={block} />;
  }

  const hasAlign = 'align' in data;
  const hasMargin =
    'marginTop' in data || 'marginBottom' in data || block.type === 'image' || block.type === 'gallery';

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

  if (tab === 'advanced') {
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
    return <InspectorStyleTab block={block} />;
  }

  return <InspectorContentTab block={block} />;
}
