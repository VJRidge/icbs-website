import { useCallback } from 'react';
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
import BlogDraggableBlock from './BlogDraggableBlock';
import BlogBlockPicker from './BlogBlockPicker';
import BlogEditorFileDrop from './BlogEditorFileDrop';

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
        <div className="text-base font-semibold">Start building your post</div>
        <div className="mt-1 text-sm">Add a paragraph, heading, media, or embed</div>
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
      Add block
    </button>
  );
}

function BlogBlockEditor({ userId }: { userId: string | null }) {
  const sidebar = useBlogEditorSidebarOptional();
  const { blocks, selectedBlockId, blockPickerOpen, blockPickerAfter, moveBlock, openBlockPicker, closeBlockPicker, selectBlock } =
    useBlogEditorStore();

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

  return (
    <div className="min-w-0">
      <BlogEditorFileDrop userId={userId}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5 py-2 pb-3">
              {blocks.length === 0 ? (
                <EmptyState onAdd={() => openBlockPicker(null)} />
              ) : (
                blocks.map((block, index) => (
                  <BlogDraggableBlock
                    key={block.id}
                    block={block}
                    index={index}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => {
                      if (sidebar) {
                        sidebar.openModuleForBlock(block.id);
                      } else {
                        selectBlock(block.id);
                      }
                    }}
                    onAddAfter={() => openBlockPicker(block.id)}
                  />
                ))
              )}
              {blocks.length > 0 ? <AddBlockBar onAdd={() => openBlockPicker(null)} /> : null}
            </div>
          </SortableContext>
        </DndContext>
      </BlogEditorFileDrop>

      {blockPickerOpen ? <BlogBlockPicker afterId={blockPickerAfter} onClose={closeBlockPicker} /> : null}
    </div>
  );
}

export default BlogBlockEditor;
