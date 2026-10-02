import { useCallback, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, LayoutGrid, Square } from 'lucide-react';
import { normalizeColumnZones } from '../../../lib/blog/columnLayouts';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { BLOG_BLOCK_ICONS, BLOG_BLOCK_LABELS, type BlogBlock, type BlogBlockType } from '../../../lib/blog/blogBlockTypes';

function SortableRootRow({
  block,
  selectedId,
  onSelectBlock,
  children,
}: {
  block: BlogBlock;
  selectedId: string | null;
  onSelectBlock: (id: string) => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  const label = BLOG_BLOCK_LABELS[block.type as BlogBlockType] ?? block.type;
  const Icon = BLOG_BLOCK_ICONS[block.type as BlogBlockType] ?? Square;
  const active = selectedId === block.id;

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          className="flex h-7 w-6 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
          title="Drag to reorder (root blocks)"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onSelectBlock(block.id)}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition ${
            active ? 'bg-brand-blue/10 font-bold text-brand-blue' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
          <span className="truncate">{label}</span>
        </button>
      </div>
      {children}
    </div>
  );
}

function NestedRow({
  parentId,
  columnIndex,
  nested,
  index,
  total,
  selectedId,
  onSelectBlock,
  reorderNestedBlock,
}: {
  parentId: string;
  columnIndex: number;
  nested: BlogBlock;
  index: number;
  total: number;
  selectedId: string | null;
  onSelectBlock: (id: string) => void;
  reorderNestedBlock: (parentColumnsId: string, columnIndex: number, oldIndex: number, newIndex: number) => void;
}) {
  const label = BLOG_BLOCK_LABELS[nested.type as BlogBlockType] ?? nested.type;
  const Icon = BLOG_BLOCK_ICONS[nested.type as BlogBlockType] ?? Square;
  const active = selectedId === nested.id;

  return (
    <div className="flex items-center gap-0.5 border-t border-slate-100 py-1 pl-2 pr-1">
      <div className="flex shrink-0 flex-col gap-0">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => reorderNestedBlock(parentId, columnIndex, index, index - 1)}
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          title="Move up in column"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={index >= total - 1}
          onClick={() => reorderNestedBlock(parentId, columnIndex, index, index + 1)}
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          title="Move down in column"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => onSelectBlock(nested.id)}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] transition ${
          active ? 'bg-brand-blue/10 font-semibold text-brand-blue' : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Icon className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.75} />
        <span className="truncate">
          Col {columnIndex + 1} · {label}
        </span>
      </button>
    </div>
  );
}

type Props = {
  /** Shorter panel for dropdown / strip layouts. */
  compact?: boolean;
  /** Omit title row when the parent already labels the panel (header popover). */
  hideHeader?: boolean;
};

export default function BlogPageStructurePanel({ compact = false, hideHeader = false }: Props) {
  const blocks = useBlogEditorStore((s) => s.blocks);
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId);
  const selectBlock = useBlogEditorStore((s) => s.selectBlock);
  const moveBlock = useBlogEditorStore((s) => s.moveBlock);
  const reorderNestedBlock = useBlogEditorStore((s) => s.reorderNestedBlock);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      const oldIdx = blocks.findIndex((b) => b.id === active.id);
      const newIdx = blocks.findIndex((b) => b.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) moveBlock(oldIdx, newIdx);
    },
    [blocks, moveBlock],
  );

  return (
    <div
      className={
        compact
          ? 'flex max-h-[min(320px,50vh)] min-h-0 shrink-0 flex-col overflow-hidden bg-white'
          : 'flex h-full min-h-0 flex-col bg-white'
      }
    >
      {hideHeader ? null : (
        <div className={`shrink-0 border-b border-slate-100 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-500" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">Page structure</h3>
          </div>
          <p className="mt-1 text-[10px] leading-snug text-slate-500">
            Drag root blocks by the grip. Use arrows to reorder blocks inside a column. Click any row to select it.
          </p>
        </div>
      )}
      <div className="blog-editor-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">No blocks yet. Add content from the canvas.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5">
                {blocks.map((block) => {
                  const layout = block.type === 'columns' ? String(block.data.layout ?? '50-50') : '';
                  const zones =
                    block.type === 'columns' ? normalizeColumnZones(block.data.columns, layout) : [];
                  const nestedOpen = expanded[block.id] !== false;

                  return (
                    <SortableRootRow
                      key={block.id}
                      block={block}
                      selectedId={selectedBlockId}
                      onSelectBlock={(id) => selectBlock(id)}
                    >
                      {block.type === 'columns' ? (
                        <div className="border-t border-slate-100 bg-slate-50/80">
                          <button
                            type="button"
                            onClick={() => {
                              setExpanded((e) => {
                                const open = e[block.id] !== false;
                                return { ...e, [block.id]: !open };
                              });
                            }}
                            className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100/80"
                          >
                            Nested blocks
                            <ChevronDown className={`h-3.5 w-3.5 transition ${nestedOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {nestedOpen ? (
                            <div className="pb-1">
                              {zones.map((zone, colIndex) => (
                                <div key={colIndex} className="mb-1">
                                  <p className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Column {colIndex + 1}
                                  </p>
                                  {zone.blocks.length === 0 ? (
                                    <p className="px-2 py-1 text-[10px] italic text-slate-400">Empty</p>
                                  ) : (
                                    zone.blocks.map((nested, idx) => (
                                      <NestedRow
                                        key={nested.id}
                                        parentId={block.id}
                                        columnIndex={colIndex}
                                        nested={nested}
                                        index={idx}
                                        total={zone.blocks.length}
                                        selectedId={selectedBlockId}
                                        onSelectBlock={(id) => selectBlock(id)}
                                        reorderNestedBlock={reorderNestedBlock}
                                      />
                                    ))
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </SortableRootRow>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
