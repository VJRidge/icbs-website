import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, Copy, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useBlogEditorSidebarOptional } from '../studio/contexts/BlogEditorSidebarContext'
import { BLOG_BLOCK_LABELS, type BlogBlock, type BlogBlockType } from '../studio/lib/blog/blogBlockTypes'
import { COLUMN_LAYOUT_META } from '../studio/lib/blog/columnLayouts'
import type { ColumnLayoutKey } from '../studio/lib/blog/blogBlockTypes'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { BRAND_BLOCK_LABELS, isBrandBlockType } from './brandBlockTypes'
import { addSectionAfterChunk, deleteSectionChunk, duplicateSectionChunk, moveSectionChunk } from './sectionActions'

function storedName(block: BlogBlock) {
  const raw = block.data.sectionName ?? block.data.name
  return typeof raw === 'string' ? raw.trim() : ''
}

export function sectionChromeLabel(blocks: BlogBlock[]): string {
  for (const block of blocks) {
    const named = storedName(block)
    if (named) return named
  }
  const brand = blocks.find((block) => isBrandBlockType(block.type))
  if (brand) {
    const label = BRAND_BLOCK_LABELS[brand.type as keyof typeof BRAND_BLOCK_LABELS]
    if (label) return label
  }
  const columns = blocks.find((block) => block.type === 'columns')
  if (columns) {
    const key = String(columns.data.layout ?? '100') as ColumnLayoutKey
    return COLUMN_LAYOUT_META[key]?.label ?? 'Columns'
  }
  const first = blocks[0]
  if (!first) return 'Section'
  return BLOG_BLOCK_LABELS[first.type as BlogBlockType] ?? 'Section'
}

function BarButton({
  label,
  title,
  onClick,
  danger,
  children,
}: {
  label: string
  title: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-black uppercase tracking-widest ${
        danger ? 'bg-[#F25C19] text-white' : 'bg-white/15 text-white hover:bg-white/25'
      }`}
    >
      {children}
      {label}
    </button>
  )
}

/** Same section bar as the original editor: label, Edit, Copy, container, up/down, delete. Overlay so it does not add gap. */
export default function BrandSectionBar({
  id,
  index,
  count,
  chunk,
  children,
}: {
  id: string
  index: number
  count: number
  chunk: BlogBlock[]
  children: ReactNode
}) {
  const sidebar = useBlogEditorSidebarOptional()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const label = sectionChromeLabel(chunk)
  const target = chunk.find((block) => block.type === 'columns') ?? chunk[0]

  const edit = () => {
    if (!target) return
    if (sidebar) sidebar.openModuleForBlock(target.id)
    else useBlogEditorStore.getState().selectBlock(target.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
    >
      {children}
      <div className="vj-sec-chrome">
        <button
          type="button"
          className="vj-sec-grip"
          aria-label="Drag section up or down"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <div className="vj-sec-bar">
          <span className="vj-sec-name">{label}</span>
          <span className="vj-sec-actions">
            <button
              type="button"
              title="Edit this section in the left panel"
              onClick={(event) => {
                event.stopPropagation()
                edit()
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-[#F3D13D] px-2 text-[10px] font-black uppercase tracking-widest text-[#151412]"
            >
              <Pencil size={11} /> Edit
            </button>
            <BarButton label="Copy" title="Copy this section under it" onClick={() => duplicateSectionChunk(chunk)}>
              <Copy size={11} />
            </BarButton>
            <BarButton label="Container" title="Add an empty container under this section" onClick={() => addSectionAfterChunk(chunk)}>
              <Plus size={11} />
            </BarButton>
            {index > 0 ? (
              <BarButton label="Up" title="Move section up" onClick={() => moveSectionChunk(index, index - 1)}>
                <ChevronUp size={11} />
              </BarButton>
            ) : null}
            {index < count - 1 ? (
              <BarButton label="Down" title="Move section down" onClick={() => moveSectionChunk(index, index + 1)}>
                <ChevronDown size={11} />
              </BarButton>
            ) : null}
            <BarButton label="Delete section" title="Delete this whole section" danger onClick={() => deleteSectionChunk(chunk.map((block) => block.id))}>
              <Trash2 size={11} />
            </BarButton>
          </span>
        </div>
      </div>
    </div>
  )
}
