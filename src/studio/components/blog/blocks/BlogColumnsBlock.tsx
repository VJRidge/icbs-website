import { useState, type DragEvent } from 'react';
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
  normalizeColumnWidths,
  normalizeColumnZones,
} from '../../../lib/blog/columnLayouts';
import { carouselPreset } from '../../../lib/blog/mediaWidgetOptions';
import { safeHref } from '../../../lib/blog/safeHref';
import LayoutChooser from '../../../../brand/LayoutChooser';
import ColumnLayoutFields from '../../../../brand/ColumnLayoutFields';
import ColumnWidthSliders from '../../../../brand/ColumnWidthSliders';
import { columnStackAttrs, readColumnGap } from '../../../../brand/columnLayout';
import { COLUMN_WIDGETS, WIDGET_DRAG } from '../../../../brand/columnWidgets';
import { setSectionLayout, useColumnPick, type ColumnMode } from '../../../../brand/sectionActions';
import BlogBlockRenderer from '../BlogBlockRenderer';
import BlogInspectorSection from '../editor/BlogInspectorSection';
import { BlogInspectorAdvancedPanel, blogDataNum } from '../editor/BlogInspectorControls';
import type { BlogInspectorTabId } from '../editor/BlogInspectorTabs';
import BlogResizableColumns from './BlogResizableColumns';

const NESTABLE_TYPES = new Set<string>(
  BLOG_EDITOR_PICKER_TYPES.filter((t) => t !== 'columns'),
);

const MOVE_DRAG = 'application/x-icbs-move';

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
  const relocateNested = useBlogEditorStore((s) => s.relocateNestedBlock);
  const selectBlock = useBlogEditorStore((s) => s.selectBlock);
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId);
  const columnPick = useColumnPick((s) => s.pick);
  const layout = (String(block.data.layout ?? '50-50') in COLUMN_LAYOUT_META
    ? String(block.data.layout)
    : '50-50') as ColumnLayoutKey;
  const gap = Math.min(64, Math.max(8, Number(block.data.gap) || 24));
  const columnGap = readColumnGap(block.data);
  const rowGap = columnGap ?? gap;
  const zones = normalizeColumnZones(block.data.columns, layout);
  const columnWidths = normalizeColumnWidths(layout, block.data.columnWidths);

  const [pickerCol, setPickerCol] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const paddingY = Math.max(0, blogDataNum(block.data as Record<string, unknown>, 'paddingY', 0));
  const customClass = String(block.data.customClass ?? '');
  const needsStructure = block.data.structureChosen !== true && zones.every((zone) => zone.blocks.length === 0);

  const setZones = (next: ReturnType<typeof normalizeColumnZones>, label: string, selectedId?: string) => {
    const { blocks, commitBlocks } = useBlogEditorStore.getState();
    commitBlocks(
      blocks.map((item) =>
        item.id === block.id ? { ...block, data: { ...block.data, columns: next, structureChosen: true } } : item,
      ),
      label,
      selectedId,
    );
  };

  const setLayout = (nextLayout: ColumnLayoutKey, mode?: ColumnMode) => {
    setSectionLayout(block.id, nextLayout, mode);
  };

  const widgetColumn = Math.max(0, Math.min(columnPick?.parentId === block.id ? columnPick.column : 0, zones.length - 1));

  const addNestedBlock = (colIndex: number, type: BlogBlockType, preset?: string, at?: number) => {
    const next = zones.map((zone) => ({ blocks: [...zone.blocks] }));
    const created = createBlogBlock(type, carouselPreset(preset));
    const dest = next[colIndex];
    if (!dest) return;
    const index = at == null ? dest.blocks.length : Math.max(0, Math.min(at, dest.blocks.length));
    dest.blocks.splice(index, 0, created);
    setZones(next, 'Added widget', created.id);
    selectBlock(created.id);
    setPickerCol(null);
  };

  const removeNestedBlock = (colIndex: number, blockId: string) => {
    const next = zones.map((zone, i) =>
      i === colIndex ? { blocks: zone.blocks.filter((nested) => nested.id !== blockId) } : { blocks: [...zone.blocks] },
    );
    setZones(next, 'Deleted');
  };

  if (inspectorTab === 'style') {
    return (
      <div className="space-y-3 p-2.5">
        <BlogInspectorSection title="Container">
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Columns</span>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as ColumnLayoutKey)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {(Object.keys(COLUMN_LAYOUT_META) as ColumnLayoutKey[]).map((key) => (
                <option key={key} value={key}>{COLUMN_LAYOUT_META[key].label}</option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Gap: {gap}px</span>
            <input
              type="range"
              min={8}
              max={64}
              value={gap}
              onChange={(e) => updateBlock(block.id, { gap: Number(e.target.value) || 24 })}
              className="w-full"
            />
          </label>
          <ColumnWidthSliders block={block} />
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
      <div className="space-y-3 p-3">
        <ColumnLayoutFields block={block} />
        <LayoutChooser variant="side" activeLayout={layout} onPick={(mode, next) => setLayout(next, mode)} />
        <p className="text-xs leading-relaxed text-slate-600">
          Choose the column count, then drag a widget into that section.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {COLUMN_WIDGETS.map((widget) => (
            <button
              key={widget.preset ? `${widget.type}:${widget.preset}` : widget.type}
              type="button"
              draggable
              onDragStart={(event) => {
                const token = widget.preset ? `${widget.type}:${widget.preset}` : widget.type;
                event.dataTransfer.setData(WIDGET_DRAG, token);
                event.dataTransfer.setData('text/plain', token);
                event.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => addNestedBlock(widgetColumn, widget.type, widget.preset)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-3 text-left text-xs font-bold text-slate-700 hover:border-[#7c3aed]"
            >
              {widget.label}
            </button>
          ))}
        </div>
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Link</span>
          <input
            value={String(block.data.link ?? '')}
            onChange={(e) => updateBlock(block.id, { link: e.target.value })}
            placeholder="https:// or /page"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#7c3aed]"
          />
        </label>
      </div>
    );
  }

  const setColumnWidths = (widths: number[]) => {
    updateBlock(block.id, { columnWidths: widths });
  };

  const dropIndex = (columnEl: HTMLElement, clientY: number, ignoreId: string) => {
    const rows = [...columnEl.querySelectorAll<HTMLElement>('[data-nested-id]')].filter(
      (row) => row.dataset.nestedId !== ignoreId,
    );
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length;
  };

  const takeDrop = (colIndex: number, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const types = [...event.dataTransfer.types];
    const moving = types.includes(MOVE_DRAG);
    const copying = types.includes(WIDGET_DRAG);
    const moveId = moving ? event.dataTransfer.getData(MOVE_DRAG) : '';
    setDragOver(null);
    const index = dropIndex(event.currentTarget as HTMLElement, event.clientY, moveId);
    if (moving && moveId) {
      relocateNested(moveId, block.id, colIndex, index);
      return;
    }
    if (!copying) return;
    const dropped = event.dataTransfer.getData(WIDGET_DRAG) || event.dataTransfer.getData('text/plain');
    const [type, preset] = dropped.split(':');
    if (type && NESTABLE_TYPES.has(type)) addNestedBlock(colIndex, type as BlogBlockType, preset, index);
  };

  const columnPanels = zones.map((zone, colIndex) => {
    const stack = columnStackAttrs(block.data, colIndex);
    return (
    <div
      key={colIndex}
      onDragOver={
        isEditing
          ? (event) => {
              event.preventDefault();
              const moving = [...event.dataTransfer.types].includes(MOVE_DRAG);
              event.dataTransfer.dropEffect = moving ? 'move' : 'copy';
              setDragOver(colIndex);
            }
          : undefined
      }
      onDragLeave={isEditing ? () => setDragOver((current) => (current === colIndex ? null : current)) : undefined}
      onDrop={isEditing ? (event) => takeDrop(colIndex, event) : undefined}
      className={
        isEditing
          ? `flex min-h-[180px] min-w-0 w-full flex-1 flex-col rounded-xl border-2 border-dashed p-3 ${
              block.data.skin ? 'border-white/40 bg-transparent' : 'bg-white/90'
            } ${
              dragOver === colIndex ? 'border-[#7c3aed] bg-[#7c3aed]/5' : block.data.skin ? 'border-white/40' : 'border-slate-300'
            } ${block.data.skin === 'hero' && colIndex === 0 ? 'vj-hero-copy' : ''} ${
              block.data.skin === 'hero' && colIndex === 1 ? 'vj-lead' : ''
            }`
          : 'min-w-0 space-y-6'
      }
    >
      <div className={`${stack.className}${stack.style?.gap != null ? '' : ' space-y-3'}`.trim()} style={stack.style}>
        {zone.blocks.map((nested) =>
          isEditing ? (
            <div
              key={nested.id}
              data-nested-id={nested.id}
              onClick={(e) => {
                e.stopPropagation();
                selectBlock(nested.id);
              }}
              className={`w-full cursor-pointer rounded-lg border p-2 transition ${
                selectedBlockId === nested.id
                  ? 'border-[#7c3aed] bg-[#7c3aed]/5 ring-2 ring-[#7c3aed]/40'
                  : 'border-transparent hover:border-slate-300'
              }`}
            >
              <div
                className="mb-1 flex cursor-grab items-center justify-between active:cursor-grabbing"
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.setData(MOVE_DRAG, nested.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <span className="text-[10px] font-bold text-slate-500">
                  {nested.type === 'carousel' && nested.data.kind === 'image'
                    ? 'Image carousel'
                    : nested.type === 'carousel'
                      ? 'Media carousel'
                      : nested.type === 'slideshow'
                        ? 'Media Slider'
                        : (BLOG_BLOCK_LABELS[nested.type as BlogBlockType] ?? nested.type)}
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
              {nested.type === 'image' && !String(nested.data.url ?? '').trim() ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
                  Choose an image
                </div>
              ) : (
                <BlogBlockRenderer
                  block={nested}
                  isEditing={
                    nested.type === 'heading' ||
                    nested.type === 'slideshow' ||
                    nested.type === 'carousel' ||
                    (nested.type === 'paragraph' && selectedBlockId === nested.id)
                  }
                />
              )}
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
          className={`flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-[#7c3aed] hover:text-[#7c3aed] ${
            zone.blocks.length === 0 ? 'm-auto h-14 w-14 text-2xl' : 'mt-3 w-full py-2 text-[10px] font-black uppercase'
          }`}
          aria-label={`Add widget to column ${colIndex + 1}`}
        >
          <Plus className={zone.blocks.length === 0 ? 'h-6 w-6' : 'h-3.5 w-3.5'} />
          {zone.blocks.length === 0 ? null : 'Add widget'}
        </button>
      ) : null}
    </div>
    );
  });

  const resizableRow = (
    <BlogResizableColumns
      widths={columnWidths}
      gap={rowGap}
      showHandles={isEditing && zones.length > 1 && block.data.columnMode !== 'grid'}
      onWidthsChange={isEditing ? setColumnWidths : undefined}
    >
      {columnPanels}
    </BlogResizableColumns>
  );

  const sectionStyle = paddingY
    ? { paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px` }
    : undefined;

  if (!isEditing) {
    const href = safeHref(block.data.link);
    const className = `blog-block-columns my-10 block text-inherit no-underline ${customClass}`.trim();
    if (href) {
      return (
        <a href={href} className={className} style={sectionStyle}>
          {resizableRow}
        </a>
      );
    }
    return (
      <section className={className} style={sectionStyle}>
        {resizableRow}
      </section>
    );
  }

  if (needsStructure) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4">
        <LayoutChooser variant="canvas" activeLayout={layout} onPick={(mode, next) => setLayout(next, mode)} />
      </div>
    );
  }

  const skin = String(block.data.skin ?? '');
  const skinFrame =
    skin === 'hero'
      ? 'vj vj-canvas vj-sec vj-hero vj-hero-lead rounded-xl p-4'
      : skin === 'forest'
        ? 'vj vj-canvas vj-sec vj-forest rounded-xl p-4'
        : skin === 'cards' || skin === 'product' || skin === 'news'
          ? 'vj vj-canvas vj-sec rounded-xl p-4'
          : `space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 ${customClass}`.trim();

  return (
    <div className={skinFrame} style={sectionStyle}>
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
