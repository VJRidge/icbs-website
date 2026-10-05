import { useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Plus } from 'lucide-react';
import { useBlogEditorSidebarOptional } from '../../../contexts/BlogEditorSidebarContext';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { clearKitField } from '../blocks/brand/kitFieldFocus';
import BrandSectionBar from '../../../../brand/BrandSectionBar';
import BrandSectionGap from '../../../../brand/BrandSectionGap';
import BrandWidgetSection, { BrandPageCanvas, brandSectionOffsets } from '../../../../brand/BrandWidgetSection';
import { chunkBrandSections, moveSectionChunk, pageUsesBrandCanvas, sectionAnchorId } from '../../../../brand/sectionActions';
import BlogDraggableBlock from './BlogDraggableBlock';
import BlogBlockPicker from './BlogBlockPicker';
import BlogEditorFileDrop from './BlogEditorFileDrop';
import EditorStructureBar from './EditorStructureBar';
import { DEVICE_WIDTH } from '../../../lib/blog/blockStyle';

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-slate-400 transition-all hover:border-brand-yellow hover:bg-brand-yellow/5 hover:text-brand-blue"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/5 transition-colors group-hover:bg-brand-yellow/20">
        <Plus size={28} className="transition-transform group-hover:scale-110" />
      </div>
      <div className="text-center">
        <div className="text-base font-semibold">Add an empty container</div>
        <div className="mt-1 text-sm">Then choose Flexbox or Grid, and a column structure</div>
        <div className="mt-2 text-xs text-slate-400">You can also drop image files here to start a gallery.</div>
      </div>
    </button>
  );
}

function AddBlockBar({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white/80 py-3 text-sm font-semibold text-slate-500 shadow-sm transition-all hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue"
    >
      <Plus size={16} className="transition-transform group-hover:scale-110" />
      Add container
    </button>
  );
}

function BlogBlockEditor({ userId }: { userId: string | null }) {
  const sidebar = useBlogEditorSidebarOptional();
  const { blocks, selectedBlockId, blockPickerOpen, blockPickerAfter, moveBlock, addBlock, closeBlockPicker, selectBlock } =
    useBlogEditorStore();
  const addEmptyContainer = (afterId: string | null) => addBlock('columns', afterId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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

  const handleChunkDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const chunks = chunkBrandSections(useBlogEditorStore.getState().blocks);
    const ids = chunks.map((chunk) => chunk.blocks[0]?.id ?? '');
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    moveSectionChunk(oldIdx, newIdx);
  }, []);

  const branded = pageUsesBrandCanvas(blocks);
  const previewDevice = useBlogEditorStore((s) => s.previewDevice);
  const setPreviewActive = useBlogEditorStore((s) => s.setPreviewActive);
  useEffect(() => {
    setPreviewActive(true);
    return () => setPreviewActive(false);
  }, [setPreviewActive]);

  if (branded && blocks.length > 0) {
    return (
      <div className="min-w-0">
        <EditorStructureBar />
        <BlogEditorFileDrop userId={userId}>
          <BrandPageCanvas frameWidth={DEVICE_WIDTH[previewDevice]}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleChunkDragEnd}>
              <SortableContext items={brandSectionOffsets(blocks).map(({ chunk }) => chunk.blocks[0]?.id ?? '')} strategy={verticalListSortingStrategy}>
                {brandSectionOffsets(blocks).map(({ chunk, start }, index, all) => {
                  const columns = chunk.blocks.find((block) => block.type === 'columns')
                  const anchorId = chunk.blocks[0]?.id ?? ''
                  const deleteId = columns && columns.id === selectedBlockId ? columns.id : null
                  const prev = index > 0 ? all[index - 1] : undefined
                  const upperId = prev ? sectionAnchorId(prev.chunk.blocks) || null : null
                  const lowerId = sectionAnchorId(chunk.blocks) || null
                  return (
                    <BrandSectionBar key={anchorId || start} id={anchorId} index={index} count={all.length} chunk={chunk.blocks}>
                      <BrandSectionGap at={start} anchorId={anchorId} deleteId={deleteId} lead={start === 0} upperId={upperId} lowerId={lowerId} />
                      <BrandWidgetSection blocks={chunk.blocks} editing />
                    </BrandSectionBar>
                  )
                })}
              </SortableContext>
            </DndContext>
          </BrandPageCanvas>
        </BlogEditorFileDrop>
        {blockPickerOpen ? <BlogBlockPicker afterId={blockPickerAfter} onClose={closeBlockPicker} /> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <EditorStructureBar />
      <BlogEditorFileDrop userId={userId}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5 py-2 pb-3" style={previewDevice === 'desktop' ? undefined : { maxWidth: DEVICE_WIDTH[previewDevice], margin: '0 auto' }}>
              {blocks.length === 0 ? (
                <EmptyState onAdd={() => addEmptyContainer(null)} />
              ) : (
                blocks.map((block, index) => (
                  <BlogDraggableBlock
                    key={block.id}
                    block={block}
                    index={index}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => {
                      clearKitField(block.id);
                      if (sidebar) {
                        sidebar.openModuleForBlock(block.id);
                      } else {
                        selectBlock(block.id);
                      }
                    }}
                    onAddAfter={() => addEmptyContainer(block.id)}
                  />
                ))
              )}
              {blocks.length > 0 ? <AddBlockBar onAdd={() => addEmptyContainer(selectedBlockId)} /> : null}
            </div>
          </SortableContext>
        </DndContext>
      </BlogEditorFileDrop>

      {blockPickerOpen ? <BlogBlockPicker afterId={blockPickerAfter} onClose={closeBlockPicker} /> : null}
    </div>
  );
}

export default BlogBlockEditor;
