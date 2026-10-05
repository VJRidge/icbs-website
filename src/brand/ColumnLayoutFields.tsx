import { useRef, useState } from 'react'
import BlogInspectorSection from '../studio/components/blog/editor/BlogInspectorSection'
import { BlogInspectorFieldRow } from '../studio/components/blog/editor/BlogInspectorFieldRow'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import {
  layoutForColumnCount,
  normalizeColumnWidths,
  normalizeColumnZones,
  widthsWithColumnPercent,
} from '../studio/lib/blog/columnLayouts'
import { cloneBlocks, pushHistory } from '../studio/lib/blog/editorHistory'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import {
  readColumnGap,
  readColumnHAlign,
  readColumnVAlign,
  readColumnWidgetGap,
  withColumnSlot,
  type ColumnHAlign,
  type ColumnVAlign,
} from './columnLayout'
import { useColumnPick } from './sectionActions'

type Snapshot = { blocks: BlogBlock[]; dirty: boolean }

let editSnapshot: Snapshot | null = null

function beginColumnEdit() {
  if (editSnapshot) return
  const state = useBlogEditorStore.getState()
  editSnapshot = { blocks: cloneBlocks(state.blocks), dirty: state.isDirty }
}

function restoreColumnEdit() {
  if (!editSnapshot) return
  useBlogEditorStore.setState({ blocks: cloneBlocks(editSnapshot.blocks), isDirty: editSnapshot.dirty })
}

function commitColumnEdit(label: string) {
  const snap = editSnapshot
  editSnapshot = null
  if (!snap) return
  const current = useBlogEditorStore.getState().blocks
  if (JSON.stringify(current) === JSON.stringify(snap.blocks)) return
  useBlogEditorStore.setState((state) => ({
    past: pushHistory(state.past, snap.blocks, label),
    future: [],
  }))
}

function commitColumnPatch(blockId: string, patch: Record<string, unknown>, label: string) {
  const start = cloneBlocks(useBlogEditorStore.getState().blocks)
  useBlogEditorStore.getState().updateBlock(blockId, patch)
  if (JSON.stringify(useBlogEditorStore.getState().blocks) === JSON.stringify(start)) return
  useBlogEditorStore.setState((state) => ({
    past: pushHistory(state.past, start, label),
    future: [],
  }))
}

function parsePercent(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  return Number(trimmed)
}

function parsePx(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  if (n < 0 || n > 200) return null
  return n
}

function formatPercent(n: number): string {
  return String(Math.round(n * 10) / 10)
}

const inputClass = 'h-8 w-[4.75rem] rounded border border-slate-200 bg-white px-2 text-right text-xs text-slate-800 outline-none focus:border-slate-500'
const selectClass = 'h-8 max-w-[9.5rem] rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-slate-500'

function DraftNumber({
  value,
  min,
  max,
  step,
  label,
  onBegin,
  onLive,
  onCommit,
}: {
  value: string
  min?: number
  max?: number
  step: number
  label: string
  onBegin?: () => void
  onLive: (raw: string) => boolean
  onCommit: (raw: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const editing = draft != null
  return (
    <BlogInspectorFieldRow label={label}>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        aria-label={label}
        className={inputClass}
        value={editing ? draft : value}
        onFocus={() => {
          onBegin?.()
          beginColumnEdit()
          setDraft(value)
        }}
        onChange={(event) => {
          const raw = event.target.value
          setDraft(raw)
          if (!onLive(raw)) restoreColumnEdit()
        }}
        onBlur={() => {
          const raw = draft ?? value
          setDraft(null)
          onCommit(raw)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          event.currentTarget.blur()
        }}
      />
    </BlogInspectorFieldRow>
  )
}

function WidthField({ block, index, label }: { block: BlogBlock; index: number; label: string }) {
  const layout = layoutForColumnCount(String(block.data.layout ?? '50-50'), columnCount(block))
  const widths = normalizeColumnWidths(layout, block.data.columnWidths)
  const base = useRef(widths)
  const shown = formatPercent(widths[index] ?? 0)
  if (columnCount(block) < 2) {
    return (
      <BlogInspectorFieldRow label={label}>
        <input aria-label={label} className={inputClass} value="100" disabled readOnly />
      </BlogInspectorFieldRow>
    )
  }
  return (
    <DraftNumber
      label={label}
      value={shown}
      min={12}
      max={76}
      step={0.1}
      onBegin={() => {
        base.current = normalizeColumnWidths(layout, block.data.columnWidths)
      }}
      onLive={(raw) => {
        const percent = parsePercent(raw)
        if (percent == null) return false
        const next = widthsWithColumnPercent(base.current, index, percent)
        if (!next) return false
        useBlogEditorStore.getState().updateBlock(block.id, { columnWidths: next })
        return true
      }}
      onCommit={(raw) => {
        const percent = parsePercent(raw)
        const next = percent == null ? null : widthsWithColumnPercent(base.current, index, percent)
        const same = next != null && next.every((n, i) => Math.abs(n - (base.current[i] ?? 0)) < 0.11)
        if (!next || same) restoreColumnEdit()
        else useBlogEditorStore.getState().updateBlock(block.id, { columnWidths: next })
        commitColumnEdit('Resized columns')
      }}
    />
  )
}

function columnCount(block: BlogBlock): number {
  return normalizeColumnZones(block.data.columns, String(block.data.layout ?? '50-50')).length
}

function AlignFields({ block, index }: { block: BlogBlock; index: number }) {
  const count = columnCount(block)
  const vertical = readColumnVAlign(block.data, index)
  const horizontal = readColumnHAlign(block.data, index)
  const gap = readColumnWidgetGap(block.data, index)
  const gapStart = useRef(gap)
  const setVertical = (value: string) => {
    if (value === vertical) return
    const allowed: ColumnVAlign | '' = value === 'top' || value === 'center' || value === 'bottom' ? value : ''
    commitColumnPatch(block.id, { columnVAlign: withColumnSlot(block.data.columnVAlign, count, index, allowed) }, 'Column layout')
  }
  const setHorizontal = (value: string) => {
    if (value === horizontal) return
    const allowed: ColumnHAlign | '' = value === 'left' || value === 'center' || value === 'right' ? value : ''
    commitColumnPatch(block.id, { columnHAlign: withColumnSlot(block.data.columnHAlign, count, index, allowed) }, 'Column layout')
  }
  return (
    <>
      <BlogInspectorFieldRow label="Vertical alignment">
        <select aria-label="Vertical alignment" className={selectClass} value={vertical} onChange={(event) => setVertical(event.target.value)}>
          <option value="">Default</option>
          <option value="top">Top</option>
          <option value="center">Center</option>
          <option value="bottom">Bottom</option>
        </select>
      </BlogInspectorFieldRow>
      <BlogInspectorFieldRow label="Horizontal alignment">
        <select
          aria-label="Horizontal alignment"
          className={selectClass}
          value={horizontal}
          onChange={(event) => setHorizontal(event.target.value)}
        >
          <option value="">Default</option>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </BlogInspectorFieldRow>
      <DraftNumber
        label="Widgets space (px)"
        value={gap == null ? '' : String(gap)}
        min={0}
        max={200}
        step={1}
        onBegin={() => {
          gapStart.current = gap
        }}
        onLive={(raw) => {
          if (!raw.trim()) return false
          const px = parsePx(raw)
          if (px == null) return false
          useBlogEditorStore.getState().updateBlock(block.id, {
            columnWidgetGap: withColumnSlot(block.data.columnWidgetGap, count, index, px),
          })
          return true
        }}
        onCommit={(raw) => {
          const trimmed = raw.trim()
          const px = trimmed ? parsePx(trimmed) : null
          if (trimmed && px == null) restoreColumnEdit()
          else if (px === gapStart.current) restoreColumnEdit()
          else {
            useBlogEditorStore.getState().updateBlock(block.id, {
              columnWidgetGap: withColumnSlot(block.data.columnWidgetGap, count, index, px),
            })
          }
          commitColumnEdit('Column layout')
        }}
      />
    </>
  )
}

function ColumnGapField({ block }: { block: BlogBlock }) {
  const gap = readColumnGap(block.data)
  const gapStart = useRef(gap)
  return (
    <DraftNumber
      label="Column gap (px)"
      value={gap == null ? '' : String(gap)}
      min={0}
      max={200}
      step={1}
      onBegin={() => {
        gapStart.current = gap
      }}
      onLive={(raw) => {
        if (!raw.trim()) return false
        const px = parsePx(raw)
        if (px == null) return false
        useBlogEditorStore.getState().updateBlock(block.id, { columnGap: px })
        return true
      }}
      onCommit={(raw) => {
        const trimmed = raw.trim()
        const px = trimmed ? parsePx(trimmed) : null
        if ((trimmed && px == null) || px === gapStart.current) restoreColumnEdit()
        else useBlogEditorStore.getState().updateBlock(block.id, { columnGap: px })
        commitColumnEdit('Column layout')
      }}
    />
  )
}

function ColumnFields({ block, index, widthLabel }: { block: BlogBlock; index: number; widthLabel: string }) {
  return (
    <>
      <WidthField block={block} index={index} label={widthLabel} />
      <AlignFields block={block} index={index} />
    </>
  )
}

/** Layout numbers for the selected column, or one width group per column when the container is selected. */
export default function ColumnLayoutFields({ block }: { block: BlogBlock }) {
  const pick = useColumnPick((s) => s.pick)
  const selectedId = useBlogEditorStore((s) => s.selectedBlockId)
  const count = columnCount(block)
  const picked =
    pick?.parentId === block.id && selectedId === block.id && pick.column >= 0 && pick.column < count ? pick.column : null
  const indexes = picked == null ? Array.from({ length: count }, (_, index) => index) : [picked]
  return (
    <BlogInspectorSection title="Layout">
      {indexes.map((index) => (
        <ColumnFields
          key={index}
          block={block}
          index={index}
          widthLabel={picked == null && count > 1 ? `Column ${index + 1}` : 'Column width (%)'}
        />
      ))}
      <ColumnGapField block={block} />
    </BlogInspectorSection>
  )
}
