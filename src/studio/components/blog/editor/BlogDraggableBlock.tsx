import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { GripVertical, Trash2, Copy, Plus, ChevronUp, ChevronDown, Square, Pencil } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { BLOG_BLOCK_ICONS, BLOG_BLOCK_LABELS, isKitBlockType, type BlogBlock } from '../../../lib/blog/blogBlockTypes';
import BlogBlockRenderer from '../BlogBlockRenderer';
import { useBlogFileDropTargetId } from './BlogEditorFileDrop';

function Btn({
  onClick,
  title,
  icon,
  danger,
}: {
  onClick: () => void;
  title: string;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
        danger ? 'text-red-300 hover:bg-red-50 hover:text-red-500' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'
      }`}
    >
      {icon}
    </button>
  );
}

export default function BlogDraggableBlock({
  block,
  index,
  isSelected,
  onSelect,
  onAddAfter,
}: {
  block: BlogBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onAddAfter: () => void;
}) {
  const { deleteBlock, duplicateBlock, moveBlock, blocks } = useBlogEditorStore();
  const fileDropHighlightId = useBlogFileDropTargetId();
  const fileDropActive = fileDropHighlightId === block.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : ('auto' as const),
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < blocks.length - 1;
  const label = BLOG_BLOCK_LABELS[block.type as keyof typeof BLOG_BLOCK_LABELS] ?? block.type;
  const Icon = BLOG_BLOCK_ICONS[block.type as keyof typeof BLOG_BLOCK_ICONS] ?? Square;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-blog-block-id={block.id}
      data-blog-block-type={block.type}
      className={`group relative flex items-stretch gap-1 ${fileDropActive ? 'rounded-2xl ring-2 ring-brand-yellow ring-offset-2 ring-offset-[#F3EDE3]' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`flex w-5 shrink-0 cursor-grab select-none items-center justify-center rounded-lg active:cursor-grabbing ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Drag to reorder"
      >
        <GripVertical size={14} className="text-slate-400" />
      </div>

      <div
        className={`min-w-0 flex-1 cursor-text rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-150 ${
          isSelected ? 'shadow-md ring-2 ring-brand-blue/25' : 'hover:shadow-md hover:ring-brand-blue/15'
        }`}
        onClick={onSelect}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        role="presentation"
      >
        <div
          className={`flex items-center justify-between px-4 pb-0 pt-3 transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
          }`}
        >
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold tracking-wide text-slate-400">
            <Icon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            {label}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              title={isKitBlockType(block.type) ? 'Edit: click any text or image on the canvas, or use the left panel' : 'Edit in the left panel'}
              className={`mr-1 inline-flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                isSelected ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600 hover:bg-brand-blue hover:text-brand-yellow'
              }`}
            >
              <Pencil size={11} /> Edit
            </button>
            <Btn onClick={() => duplicateBlock(block.id)} title="Duplicate" icon={<Copy size={11} />} />
            <Btn onClick={onAddAfter} title="Insert after" icon={<Plus size={11} />} />
            {canMoveUp ? <Btn onClick={() => moveBlock(index, index - 1)} title="Move up" icon={<ChevronUp size={11} />} /> : null}
            {canMoveDown ? (
              <Btn onClick={() => moveBlock(index, index + 1)} title="Move down" icon={<ChevronDown size={11} />} />
            ) : null}
            <Btn onClick={() => deleteBlock(block.id)} title="Delete" icon={<Trash2 size={11} />} danger />
          </div>
        </div>
        <div className="px-5 pb-4 pt-2">
          <BlogBlockRenderer block={block} isEditing />
        </div>
      </div>
    </div>
  );
}
