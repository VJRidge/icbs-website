import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { GripVertical, Trash2, Copy, Plus, ChevronUp, ChevronDown, Square, Pencil } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { BLOG_BLOCK_ICONS, BLOG_BLOCK_LABELS, isKitBlockType, type BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { isBrandBlockType } from '../../../../brand/brandBlockTypes';
import BlogBlockRenderer from '../BlogBlockRenderer';
import { useBlogFileDropTargetId } from './BlogEditorFileDrop';

function Btn({
  onClick,
  title,
  icon,
  label,
  danger,
}: {
  onClick: () => void;
  title: string;
  icon: ReactNode;
  label: string;
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
      className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-black uppercase tracking-widest ${
        danger ? 'bg-[#F25C19] text-white' : 'bg-white/15 text-white hover:bg-white/25'
      }`}
    >
      {icon}
      {label}
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
  const brand = isBrandBlockType(block.type);

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
        className="flex w-7 shrink-0 cursor-grab select-none items-center justify-center rounded-lg bg-[#1A5340] text-white active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </div>

      <div
        className={`min-w-0 flex-1 cursor-text rounded-2xl shadow-sm ring-1 ring-black/5 transition-all duration-150 ${
          brand ? 'bg-transparent' : 'bg-white'
        } ${isSelected ? 'shadow-md ring-2 ring-brand-blue/25' : 'hover:shadow-md hover:ring-brand-blue/15'}`}
        onClick={onSelect}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        role="presentation"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1A5340] px-3 py-2 text-white">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold tracking-wide">
            <Icon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            {label}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              title={isKitBlockType(block.type) || brand ? 'Edit this section in the left panel. On a brand section, click the photo or cover to change it.' : 'Edit in the left panel'}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-[#F3D13D] px-2 text-[10px] font-black uppercase tracking-widest text-[#151412]"
            >
              <Pencil size={11} /> Edit
            </button>
            <Btn onClick={() => duplicateBlock(block.id)} title="Duplicate" label="Copy" icon={<Copy size={11} />} />
            <Btn onClick={onAddAfter} title="Add an empty container after this section" label="Container" icon={<Plus size={11} />} />
            {canMoveUp ? <Btn onClick={() => moveBlock(index, index - 1)} title="Move up" label="Up" icon={<ChevronUp size={11} />} /> : null}
            {canMoveDown ? (
              <Btn onClick={() => moveBlock(index, index + 1)} title="Move down" label="Down" icon={<ChevronDown size={11} />} />
            ) : null}
            <Btn onClick={() => deleteBlock(block.id)} title="Delete this whole section" label={brand ? 'Delete section' : 'Delete'} icon={<Trash2 size={11} />} danger />
          </div>
        </div>
        <div className={brand ? '' : 'px-5 pb-4 pt-2'}>
          <BlogBlockRenderer block={block} isEditing />
        </div>
      </div>
    </div>
  );
}
