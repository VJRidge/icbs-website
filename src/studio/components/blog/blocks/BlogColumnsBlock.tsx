import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore, createBlogBlock } from '../../../lib/blog/useBlogEditorStore';
import {
  BLOG_BLOCK_LABELS,
  BLOG_EDITOR_PICKER_CATEGORIES,
  BLOG_EDITOR_PICKER_TYPES,
  type BlogBlock,
  type BlogBlockType,
  type ColumnLayoutKey,
} from '../../../lib/blog/blogBlockTypes';
import {
  COLUMN_LAYOUT_META,
  defaultWidthsForLayout,
  normalizeColumnWidths,
  normalizeColumnZones,
  resizeColumnZones,
} from '../../../lib/blog/columnLayouts';
import BlogBlockRenderer from '../BlogBlockRenderer';
import BlogInspectorSection from '../editor/BlogInspectorSection';
import { BlogInspectorAdvancedPanel, blogDataNum } from '../editor/BlogInspectorControls';
import type { BlogInspectorTabId } from '../editor/BlogInspectorTabs';
import BlogResizableColumns from './BlogResizableColumns';

const NESTABLE_TYPES = new Set<string>(
  BLOG_EDITOR_PICKER_TYPES.filter((t) => t !== 'columns'),
);

function LayoutIcon({ layout }: { layout: ColumnLayoutKey }) {
  const meta = COLUMN_LAYOUT_META[layout];
  const n = meta.count;
  return (
    <div className="flex h-6 w-full gap-0.5 px-1" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="min-w-0 flex-1 rounded-sm bg-current opacity-70" />
      ))}
    </div>
  );
}

export default function BlogColumnsBlock({
  block,
  isEditing,
  inspectorTab,
}: {
  block: BlogBlock;
  isEditing: boolean;
  inspectorTab?: BlogInspectorTabId;
}) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const selectBlock = useBlogEditorStore((s) => s.selectBlock);
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId);
  const layout = (String(block.data.layout ?? '50-50') in COLUMN_LAYOUT_META
    ? String(block.data.layout)
    : '50-50') as ColumnLayoutKey;
  const gap = Math.min(64, Math.max(8, Number(block.data.gap) || 24));
  const zones = normalizeColumnZones(block.data.columns, layout);
  const columnWidths = normalizeColumnWidths(layout, block.data.columnWidths);

  const [pickerCol, setPickerCol] = useState<number | null>(null);
  const paddingY = Math.max(0, blogDataNum(block.data as Record<string, unknown>, 'paddingY', 0));
  const customClass = String(block.data.customClass ?? '');

  if (inspectorTab === 'style') {
    return (
      <div className="space-y-3 p-2.5">
        <BlogInspectorSection title="Section">
          <p className="text-xs leading-relaxed text-slate-600">
            Column layout, gap, and widths are adjusted on the <strong>canvas</strong> when this section is selected.
          </p>
          <label className="mt-2 block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Vertical padding (px)
            </span>
            <input
              type="number"
              min={0}
              max={120}
              value={paddingY}
              onChange={(e) => updateBlock(block.id, { paddingY: Number(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </BlogInspectorSection>
      </div>
    );
  }

  if (inspectorTab === 'advanced') {
    return (
      <div className="p-2.5">
        <BlogInspectorAdvancedPanel blockId={block.id} data={block.data as Record<string, unknown>} onPatch={updateBlock} />
      </div>
    );
  }

  if (inspectorTab === 'content') {
    return (
      <p className="p-4 text-xs leading-relaxed text-slate-600">
        Use the canvas to pick layout presets and resize columns. Select a nested block to edit it here.
      </p>
    );
  }

  const setZones = (next: ReturnType<typeof normalizeColumnZones>) => {
    updateBlock(block.id, { columns: next });
  };

  const setLayout = (nextLayout: ColumnLayoutKey) => {
    const resized = resizeColumnZones(zones, nextLayout);
    updateBlock(block.id, {
      layout: nextLayout,
      columns: resized,
      columnWidths: defaultWidthsForLayout(nextLayout),
    });
  };

  const setColumnWidths = (widths: number[]) => {
    updateBlock(block.id, { columnWidths: widths });
  };

  const addNestedBlock = (colIndex: number, type: BlogBlockType) => {
    const next = zones.map((z) => ({ blocks: [...z.blocks] }));
    const created = createBlogBlock(type);
    next[colIndex]!.blocks.push(created);
    setZones(next);
    selectBlock(created.id);
    setPickerCol(null);
  };

  const removeNestedBlock = (colIndex: number, blockId: string) => {
    const next = zones.map((z, i) =>
      i === colIndex ? { blocks: z.blocks.filter((b) => b.id !== blockId) } : { blocks: [...z.blocks] },
    );
    setZones(next);
  };

  const columnPanels = zones.map((zone, colIndex) => (
    <div
      key={colIndex}
      className={
        isEditing
          ? 'min-w-0 flex-1 rounded-xl border-2 border-dashed border-slate-200 bg-white/90 p-3'
          : 'min-w-0 space-y-6'
      }
    >
      {isEditing ? <p className="mb-2 text-[10px] font-black uppercase text-slate-400">Column {colIndex + 1}</p> : null}
      <div className="space-y-3">
        {zone.blocks.map((nested) =>
          isEditing ? (
            <div
              key={nested.id}
              onClick={(e) => {
                e.stopPropagation();
                selectBlock(nested.id);
              }}
              className={`cursor-pointer rounded-lg border p-2 transition ${
                selectedBlockId === nested.id
                  ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/30'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">
                  {BLOG_BLOCK_LABELS[nested.type as BlogBlockType] ?? nested.type}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNestedBlock(colIndex, nested.id);
                  }}
                  className="text-red-500"
                  aria-label="Remove block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <BlogBlockRenderer
                block={nested}
                isEditing={nested.type === 'paragraph' && selectedBlockId === nested.id}
              />
            </div>
          ) : (
            <BlogBlockRenderer key={nested.id} block={nested} isEditing={false} />
          ),
        )}
      </div>
      {isEditing ? (
        <button
          type="button"
          onClick={() => setPickerCol(colIndex)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-[10px] font-black uppercase text-slate-600 hover:border-brand-blue hover:text-brand-blue"
        >
          <Plus className="h-3.5 w-3.5" /> Add block
        </button>
      ) : null}
    </div>
  ));

  const resizableRow = (
    <BlogResizableColumns
      widths={columnWidths}
      gap={gap}
      showHandles={isEditing && zones.length > 1}
      onWidthsChange={isEditing ? setColumnWidths : undefined}
    >
      {columnPanels}
    </BlogResizableColumns>
  );

  const sectionStyle = paddingY
    ? { paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px` }
    : undefined;

  if (!isEditing) {
    return (
      <section className={`blog-block-columns my-10 ${customClass}`.trim()} style={sectionStyle}>
        {resizableRow}
      </section>
    );
  }

  return (
    <div
      className={`space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 ${customClass}`.trim()}
      style={sectionStyle}
    >
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Section layout</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(COLUMN_LAYOUT_META) as ColumnLayoutKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLayout(key)}
              title={COLUMN_LAYOUT_META[key].label}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-bold transition ${
                layout === key ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <LayoutIcon layout={key} />
              <span className="leading-tight">{COLUMN_LAYOUT_META[key].label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
          Gap (px)
          <input
            type="number"
            min={8}
            max={64}
            value={gap}
            onChange={(e) => updateBlock(block.id, { gap: Number(e.target.value) || 24 })}
            className="w-16 rounded border border-slate-200 px-2 py-1"
          />
        </label>
        {zones.length > 1 ? (
          <p className="text-xs text-slate-500">
            Drag the <span className="font-bold text-brand-blue">dividers</span> between columns to adjust widths
            {columnWidths.length === 2
              ? ` (${Math.round(columnWidths[0]!)}% / ${Math.round(columnWidths[1]!)}%)`
              : ''}
            .
          </p>
        ) : null}
      </div>

      {resizableRow}

      {pickerCol !== null ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPickerCol(null)} aria-hidden />
          <div className="relative max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">Add block to column {pickerCol + 1}</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {Object.entries(BLOG_EDITOR_PICKER_CATEGORIES).map(([cat, types]) => {
                const filtered = types.filter((t) => NESTABLE_TYPES.has(t));
                if (!filtered.length) return null;
                return (
                  <div key={cat} className="mb-4">
                    <p className="mb-2 text-[10px] font-black uppercase text-slate-400">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {filtered.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addNestedBlock(pickerCol, t)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold hover:border-brand-blue"
                        >
                          {BLOG_BLOCK_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
