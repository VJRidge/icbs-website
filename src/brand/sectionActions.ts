import { create } from 'zustand'
import type { BlogBlock, ColumnLayoutKey } from '../studio/lib/blog/blogBlockTypes'
import { regenerateBlockIds, topLevelForSelection } from '../studio/lib/blog/blockStyle'
import {
  columnCountForLayout,
  defaultWidthsForLayout,
  normalizeColumnZones,
  resizeColumnZones,
} from '../studio/lib/blog/columnLayouts'
import { createBlogBlock, useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { shiftColumnLayout } from './columnLayout'

const LAYOUT_FOR_COUNT: Record<number, ColumnLayoutKey> = {
  1: '100',
  2: '50-50',
  3: '33-33-33',
  4: '25-25-25-25',
}

export type ColumnMode = 'flex' | 'grid'

export function columnModeOf(data: Record<string, unknown> | undefined): ColumnMode {
  return data?.columnMode === 'grid' ? 'grid' : 'flex'
}

export const ADD_COLUMN_LAYOUTS: { layout: ColumnLayoutKey; label: string }[] = [
  { layout: '100', label: '1 column' },
  { layout: '50-50', label: '2 columns' },
  { layout: '33-33-33', label: '3 columns' },
  { layout: '25-25-25-25', label: '4 columns' },
]

type ColumnPick = { parentId: string; column: number } | null

export const useColumnPick = create<{
  pick: ColumnPick
  setPick: (pick: ColumnPick) => void
}>((set) => ({
  pick: null,
  setPick: (pick) => set({ pick }),
}))

export function pageUsesBrandCanvas(blocks: { data: Record<string, unknown> }[]) {
  return blocks.some((block) => String(block.data.section ?? '').trim() || String(block.data.skin ?? '').trim())
}

export function emptySectionBlock(layout: ColumnLayoutKey = '100'): BlogBlock {
  const block = createBlogBlock('columns', {
    layout,
    columnWidths: defaultWidthsForLayout(layout),
    columns: resizeColumnZones([], layout).map((zone) => ({ blocks: [...zone.blocks] })),
    structureChosen: false,
    skin: '',
    flowColumns: true,
    marginBottom: 0,
  })
  return { ...block, data: { ...block.data, section: `sec-${block.id}` } }
}

export function addSectionAt(at: number) {
  const block = emptySectionBlock('100')
  useBlogEditorStore.getState().insertBlocks([block], at, 'Added section')
  useColumnPick.getState().setPick(null)
  return block.id
}

/** Consecutive top-level blocks that share a section id stay one container. */
export function chunkBrandSections(blocks: BlogBlock[]): { section: string; blocks: BlogBlock[] }[] {
  const chunks: { section: string; blocks: BlogBlock[] }[] = []
  for (const block of blocks) {
    const section = String(block.data.section ?? '')
    const last = chunks[chunks.length - 1]
    if (section && last?.section === section) last.blocks.push(block)
    else chunks.push({ section, blocks: [block] })
  }
  return chunks
}

export function sectionAnchorId(blocks: BlogBlock[]): string {
  const columns = blocks.find((block) => block.type === 'columns')
  return columns?.id ?? blocks[0]?.id ?? ''
}

export function indexAfterSection(blocks: BlogBlock[], anchorId: string | null): number {
  if (!anchorId) return blocks.length
  const chunk = chunkBrandSections(blocks).find((item) => item.blocks.some((block) => block.id === anchorId))
  const last = chunk?.blocks[chunk.blocks.length - 1]
  if (!last) return blocks.length
  const index = blocks.findIndex((block) => block.id === last.id)
  return index < 0 ? blocks.length : index + 1
}

export function addSectionAfterSelection() {
  const { blocks, selectedBlockId } = useBlogEditorStore.getState()
  const top = topLevelForSelection(blocks, selectedBlockId)
  addSectionAt(indexAfterSection(blocks, top?.id ?? null))
}

export function addSectionAfterChunk(chunk: BlogBlock[]) {
  const blocks = useBlogEditorStore.getState().blocks
  const last = chunk[chunk.length - 1]
  const index = last ? blocks.findIndex((block) => block.id === last.id) : -1
  addSectionAt(index < 0 ? blocks.length : index + 1)
}

export function addStructuredSection(at: number, layout: ColumnLayoutKey, mode: ColumnMode) {
  const block = emptySectionBlock(layout)
  const next = { ...block, data: { ...block.data, structureChosen: true, columnMode: mode } }
  useBlogEditorStore.getState().insertBlocks([next], at, 'Added section')
  useColumnPick.getState().setPick(null)
  return next.id
}

export function moveSectionChunk(from: number, to: number) {
  const { blocks, commitBlocks } = useBlogEditorStore.getState()
  const chunks = chunkBrandSections(blocks).map((chunk) => chunk.blocks)
  if (from < 0 || to < 0 || from >= chunks.length || to >= chunks.length || from === to) return
  const next = [...chunks]
  const moved = next[from]
  if (!moved) return
  next.splice(from, 1)
  next.splice(to, 0, moved)
  commitBlocks(next.flat(), 'Moved section')
}

export function duplicateSectionChunk(chunk: BlogBlock[]) {
  if (chunk.length === 0) return
  const copies = chunk.map((block) => regenerateBlockIds(block))
  const sectionId = `sec-${copies[0]!.id}`
  const stamped = copies.map((block) => ({ ...block, data: { ...block.data, section: sectionId } }))
  const blocks = useBlogEditorStore.getState().blocks
  const last = chunk[chunk.length - 1]
  const index = last ? blocks.findIndex((block) => block.id === last.id) : -1
  useBlogEditorStore.getState().insertBlocks(stamped, index < 0 ? blocks.length : index + 1, 'Copied section')
}

export function deleteSectionChunk(ids: string[]) {
  const drop = new Set(ids)
  const { blocks, commitBlocks } = useBlogEditorStore.getState()
  commitBlocks(
    blocks.filter((block) => !drop.has(block.id)),
    'Deleted section',
    null,
  )
  useColumnPick.getState().setPick(null)
}

/** Dropped widget stays in this container: above or below its columns, sharing the section id. */
export function insertWidgetInsideSection(chunk: BlogBlock[], created: BlogBlock, edge: 'before' | 'after') {
  const columns = chunk.find((block) => block.type === 'columns')
  const section = String((columns ?? chunk[0])?.data.section ?? '').trim()
  if (columns && !section) {
    const zones = zonesOf(columns)
    const dest = zones[0]
    if (!dest) return
    const nested = edge === 'before' ? [created, ...dest.blocks] : [...dest.blocks, created]
    const nextZones = zones.map((zone, index) => (index === 0 ? { blocks: nested } : { blocks: [...zone.blocks] }))
    const { blocks, commitBlocks } = useBlogEditorStore.getState()
    commitBlocks(
      replaceTop(blocks, columns.id, { ...columns, data: { ...columns.data, columns: nextZones, structureChosen: true } }),
      'Added widget',
      created.id,
    )
    return
  }
  const placed: BlogBlock = section ? { ...created, data: { ...created.data, section } } : created
  const all = useBlogEditorStore.getState().blocks
  const anchor = edge === 'before' ? chunk[0] : chunk[chunk.length - 1]
  if (!anchor) return
  const index = all.findIndex((block) => block.id === anchor.id)
  if (index < 0) return
  useBlogEditorStore.getState().insertBlocks([placed], edge === 'before' ? index : index + 1, 'Added widget')
}

function replaceTop(blocks: BlogBlock[], id: string, next: BlogBlock) {
  return blocks.map((block) => (block.id === id ? next : block))
}

function asColumns(id: string): BlogBlock | null {
  const block = useBlogEditorStore.getState().blocks.find((item) => item.id === id)
  if (!block || block.type !== 'columns') return null
  return block
}

function zonesOf(block: BlogBlock) {
  return normalizeColumnZones(block.data.columns, String(block.data.layout ?? '50-50')).map((zone) => ({
    blocks: [...zone.blocks],
  }))
}

function withLayout(block: BlogBlock, zones: { blocks: BlogBlock[] }[], layout: ColumnLayoutKey, mode?: ColumnMode): BlogBlock {
  const sized = resizeColumnZones(zones, layout).map((zone) => ({ blocks: [...zone.blocks] }))
  if (zones.length > sized.length) {
    const overflow = zones.slice(sized.length).flatMap((zone) => zone.blocks)
    const last = sized[sized.length - 1]
    if (last && overflow.length > 0) sized[sized.length - 1] = { blocks: [...last.blocks, ...overflow] }
  }
  return {
    ...block,
    data: {
      ...block.data,
      layout,
      columns: sized,
      columnWidths: defaultWidthsForLayout(layout),
      columnMode: mode ?? columnModeOf(block.data),
      structureChosen: true,
    },
  }
}

export function setSectionLayout(id: string, layout: ColumnLayoutKey, mode?: ColumnMode) {
  const block = asColumns(id)
  if (!block) return
  const nextMode = mode ?? columnModeOf(block.data)
  if (String(block.data.layout ?? '') === layout && block.data.structureChosen === true && columnModeOf(block.data) === nextMode) return
  const zones = zonesOf(block)
  const next = withLayout(block, zones, layout, nextMode)
  const { blocks, commitBlocks } = useBlogEditorStore.getState()
  commitBlocks(replaceTop(blocks, id, next), 'Changed columns', id)
}

export function addColumn(id: string) {
  const block = asColumns(id)
  if (!block) return
  const zones = zonesOf(block)
  if (zones.length >= 4) return
  const layout = LAYOUT_FOR_COUNT[zones.length + 1] ?? '25-25-25-25'
  const next = withLayout(block, [...zones, { blocks: [] }], layout)
  const { blocks, commitBlocks } = useBlogEditorStore.getState()
  commitBlocks(replaceTop(blocks, id, next), 'Added column', id)
}

export function duplicateTarget(id: string, column: number | null) {
  const { blocks, insertBlocks, commitBlocks } = useBlogEditorStore.getState()
  if (column == null) {
    const block = blocks.find((item) => item.id === id)
    if (!block) return
    const copy = regenerateBlockIds(block)
    const section = String(copy.data.section ?? '')
    const data = section ? { ...copy.data, section: `sec-${copy.id}` } : copy.data
    const idx = blocks.findIndex((item) => item.id === id)
    insertBlocks([{ ...copy, data }], idx + 1, 'Duplicated')
    return
  }
  const block = asColumns(id)
  if (!block) return
  const zones = zonesOf(block)
  if (zones.length >= 4) return
  const source = zones[column]
  if (!source) return
  const copied = source.blocks.map((nested) => regenerateBlockIds(nested))
  const nextZones = [...zones]
  nextZones.splice(column + 1, 0, { blocks: copied })
  const layout = LAYOUT_FOR_COUNT[nextZones.length] ?? '25-25-25-25'
  const shifted = { ...block, data: { ...block.data, ...shiftColumnLayout(block.data, column, 'copy') } }
  commitBlocks(replaceTop(blocks, id, withLayout(shifted, nextZones, layout)), 'Duplicated', id)
}

export function deleteTarget(id: string, column: number | null) {
  const { blocks, deleteBlock, commitBlocks } = useBlogEditorStore.getState()
  if (column == null) {
    deleteBlock(id)
    useColumnPick.getState().setPick(null)
    return
  }
  const block = asColumns(id)
  if (!block) return
  const zones = zonesOf(block)
  if (zones.length <= 1) {
    deleteBlock(id)
    useColumnPick.getState().setPick(null)
    return
  }
  const nextZones = zones.filter((_, index) => index !== column)
  const layout = LAYOUT_FOR_COUNT[nextZones.length] ?? '100'
  const shifted = { ...block, data: { ...block.data, ...shiftColumnLayout(block.data, column, 'drop') } }
  commitBlocks(replaceTop(blocks, id, withLayout(shifted, nextZones, layout)), 'Deleted', id)
  useColumnPick.getState().setPick(null)
}

export function columnCount(block: BlogBlock) {
  return columnCountForLayout(String(block.data.layout ?? '50-50'))
}

export function chunkSectionId(chunk: BlogBlock[]): string {
  const columns = chunk.find((block) => block.type === 'columns')
  return String((columns ?? chunk[0])?.data.section ?? '')
}

function stampSection(block: BlogBlock, section: string): BlogBlock {
  if (!section) return block
  if (block.data.section === section) return block
  return { ...block, data: { ...block.data, section } }
}

function withoutSection(block: BlogBlock): BlogBlock {
  if (!('section' in block.data)) return block
  const data = { ...block.data }
  delete data.section
  return { ...block, data }
}

type Taken =
  | { kind: 'stack'; index: number; block: BlogBlock; blocks: BlogBlock[] }
  | { kind: 'column'; parentId: string; column: number; index: number; block: BlogBlock; blocks: BlogBlock[] }

function takeWidget(blocks: BlogBlock[], id: string): Taken | null {
  const top = blocks.findIndex((block) => block.id === id)
  if (top >= 0) {
    const block = blocks[top]
    if (!block) return null
    return { kind: 'stack', index: top, block, blocks: blocks.filter((item) => item.id !== id) }
  }
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    if (!block || block.type !== 'columns') continue
    const zones = zonesOf(block)
    for (let column = 0; column < zones.length; column += 1) {
      const index = zones[column]?.blocks.findIndex((nested) => nested.id === id) ?? -1
      const nested = index >= 0 ? zones[column]?.blocks[index] : undefined
      if (!nested || index < 0) continue
      const columns = zones.map((zone, zoneIndex) => ({
        blocks: zoneIndex === column ? zone.blocks.filter((item) => item.id !== id) : [...zone.blocks],
      }))
      const next = blocks.map((item, itemIndex) => (itemIndex === i ? { ...block, data: { ...block.data, columns } } : item))
      return { kind: 'column', parentId: block.id, column, index, block: nested, blocks: next }
    }
  }
  return null
}

/** `index` is the slot after the widget has already been removed. */
export type WidgetDest =
  | { kind: 'stack'; index: number; section: string }
  | { kind: 'column'; parentId: string; column: number; index: number }

function sameBlocks(a: BlogBlock[], b: BlogBlock[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function insertTaken(taken: Taken, dest: WidgetDest): BlogBlock[] | null {
  if (taken.block.type === 'columns' && dest.kind === 'column') return null
  if (dest.kind === 'stack') {
    const placed = stampSection(taken.block, dest.section)
    const start = dest.section ? taken.blocks.findIndex((block) => String(block.data.section ?? '') === dest.section) : -1
    if (start < 0) return [...taken.blocks, placed]
    let end = start + 1
    while (end < taken.blocks.length && String(taken.blocks[end]?.data.section ?? '') === dest.section) end += 1
    const at = Math.max(start, Math.min(start + dest.index, end))
    const next = [...taken.blocks]
    next.splice(at, 0, placed)
    return next
  }
  const parent = taken.blocks.find((block) => block.id === dest.parentId && block.type === 'columns')
  if (!parent) return null
  const zones = zonesOf(parent).map((zone) => ({ blocks: [...zone.blocks] }))
  const zone = zones[dest.column]
  if (!zone) return null
  const at = Math.max(0, Math.min(dest.index, zone.blocks.length))
  zone.blocks.splice(at, 0, withoutSection(taken.block))
  return taken.blocks.map((block) =>
    block.id === parent.id ? { ...parent, data: { ...parent.data, columns: zones, structureChosen: true } } : block,
  )
}

/** Move one widget within a section: beside the columns, or into a column. One undo step. */
export function placeWidget(blockId: string, dest: WidgetDest) {
  const { blocks, commitBlocks } = useBlogEditorStore.getState()
  const taken = takeWidget(blocks, blockId)
  if (!taken) return
  const next = insertTaken(taken, dest)
  if (!next || sameBlocks(blocks, next)) return
  commitBlocks(next, 'Moved', blockId)
}

/** Insert a new widget among the section's top-level blocks. `index` is the slot in that chunk. */
export function insertOnStack(chunk: BlogBlock[], created: BlogBlock, index: number) {
  const section = chunkSectionId(chunk)
  const placed = stampSection(created, section)
  const { blocks, insertBlocks } = useBlogEditorStore.getState()
  const anchor = chunk[0]
  const start = anchor ? blocks.findIndex((block) => block.id === anchor.id) : -1
  const at = start < 0 ? blocks.length : start + Math.max(0, index)
  insertBlocks([placed], at, 'Added widget')
}
