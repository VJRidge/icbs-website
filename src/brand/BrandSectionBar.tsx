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
import { clickIsOnWidget } from './sectionClick'

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

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-sm ${
        danger ? 'bg-[#F25C19] text-white hover:bg-[#d94e12]' : 'text-white/95 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}

/** Compact Elementor-style section handles: icons only, visible on hover or when this section is selected. */
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
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const label = sectionChromeLabel(chunk)
  const target = chunk.find((block) => block.type === 'columns') ?? chunk[0]
  const sectionSelected = Boolean(target && selectedBlockId === target.id)
  const active = sectionSelected || isDragging

  const edit = () => {
    if (!target) return
    if (sidebar) sidebar.openModuleForBlock(target.id)
    else useBlogEditorStore.getState().selectBlock(target.id)
  }

  return (
    <div
      ref={setNodeRef}
      className={`vj-sec-host${active ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
      onClick={(event) => {
        if (clickIsOnWidget(event.target)) return
        if (!target) return
        event.stopPropagation()
        edit()
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
          <GripVertical size={14} />
        </button>
        <div className="vj-sec-bar">
          <span className="vj-sec-name">{label}</span>
          <span className="vj-sec-actions">
            <IconButton title="Edit this section in the left panel" onClick={edit}>
              <Pencil size={12} />
            </IconButton>
            <IconButton title="Duplicate this section" onClick={() => duplicateSectionChunk(chunk)}>
              <Copy size={12} />
            </IconButton>
            <IconButton title="Add an empty container under this section" onClick={() => addSectionAfterChunk(chunk)}>
              <Plus size={12} />
            </IconButton>
            {index > 0 ? (
              <IconButton title="Move section up" onClick={() => moveSectionChunk(index, index - 1)}>
                <ChevronUp size={12} />
              </IconButton>
            ) : null}
            {index < count - 1 ? (
              <IconButton title="Move section down" onClick={() => moveSectionChunk(index, index + 1)}>
                <ChevronDown size={12} />
              </IconButton>
            ) : null}
            <IconButton
              title="Delete this whole section"
              danger
              onClick={() => deleteSectionChunk(chunk.map((block) => block.id))}
            >
              <Trash2 size={12} />
            </IconButton>
          </span>
        </div>
      </div>
    </div>
  )
}
