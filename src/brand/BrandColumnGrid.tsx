import { Children, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { findBlockInTree } from '../studio/lib/blog/blogBlockTree'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import {
  adjustAdjacentColumnWidths,
  COLUMN_WIDTH_MAX,
  COLUMN_WIDTH_MIN,
  defaultWidthsForLayout,
  gridTemplateFromWidths,
  layoutForColumnCount,
  normalizeColumnWidths,
  resizedColumnWidths,
} from '../studio/lib/blog/columnLayouts'
import { readColumnGap } from './columnLayout'
import { cloneBlocks, pushHistory } from '../studio/lib/blog/editorHistory'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'

/** Brand column drags keep each column in this band so one cannot collapse. */
const COL_LIMITS = { min: COLUMN_WIDTH_MIN, max: COLUMN_WIDTH_MAX }

export type ColumnSizing = 'always' | 'grid' | 'custom'

/** Set while a gutter drag or the style-tab width slider is writing live widths. */
let resizingId: string | null = null

export function setLiveColumnWidths(blockId: string | null) {
  resizingId = blockId
}

function nearly(a: number[], b: number[]) {
  return a.length === b.length && a.every((n, i) => Math.abs(n - (b[i] ?? 0)) < 0.11)
}

function sameLefts(a: number[], b: number[]) {
  return a.length === b.length && a.every((n, i) => Math.abs(n - (b[i] ?? 0)) < 0.5)
}

/** Percent shares that sum to 100, so a later normalize does not move the drag. */
function sharesFromPixels(px: number[]) {
  const track = px.reduce((sum, n) => sum + n, 0)
  const rounded = px.map((n) => Math.round((n / track) * 1000) / 10)
  const drift = Math.round((100 - rounded.reduce((sum, n) => sum + n, 0)) * 10) / 10
  const last = rounded.length - 1
  rounded[last] = Math.round(((rounded[last] ?? 0) + drift) * 10) / 10
  return rounded
}

function layoutOf(blockId: string, count: number) {
  const block = findBlockInTree(useBlogEditorStore.getState().blocks, blockId)
  return layoutForColumnCount(String(block?.data.layout ?? '50-50'), count)
}

/** Keep a drag that landed on a preset, so designed CSS does not snap back over it. */
function widthsToStore(layout: string, widths: number[]) {
  if (resizedColumnWidths(layout, widths) || widths.length < 2) return widths
  const next = [...widths]
  next[0] = Math.round(((next[0] ?? 0) + 0.2) * 10) / 10
  next[1] = Math.round(((next[1] ?? 0) - 0.2) * 10) / 10
  return next
}

function templateWidths(block: BlogBlock, count: number, sizing: ColumnSizing): number[] | null {
  const layout = layoutForColumnCount(String(block.data.layout ?? '50-50'), count)
  const raw = block.data.columnWidths
  const live = resizingId === block.id && Array.isArray(raw) && raw.length === count
  if (live) return raw.map((n) => Number(n))
  if (sizing === 'always') return normalizeColumnWidths(layout, raw)
  if (sizing === 'grid') return resizedColumnWidths(layout, block.data.columnWidths) ?? defaultWidthsForLayout(layout)
  return resizedColumnWidths(layout, block.data.columnWidths)
}

function gutterLefts(row: HTMLElement): number[] {
  const cols = [...row.querySelectorAll<HTMLElement>(':scope > [data-col-drop]')]
  if (cols.length < 2 || row.offsetWidth <= 0) return []
  const rect = row.getBoundingClientRect()
  const zoom = rect.width / row.offsetWidth || 1
  const style = getComputedStyle(row)
  const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.borderLeftWidth) || 0)
  return cols.slice(0, -1).map((col, index) => {
    const next = cols[index + 1]!
    const mid = (col.getBoundingClientRect().right + next.getBoundingClientRect().left) / 2
    return (mid - rect.left) / zoom - pad
  })
}

function beginColumnResize(blockId: string, index: number, keepOffPreset: boolean, event: ReactPointerEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
  if (event.button !== 0) return
  const row = event.currentTarget.closest<HTMLElement>('[data-col-grid]')
  if (!row) return
  const cols = [...row.querySelectorAll<HTMLElement>(':scope > [data-col-drop]')]
  const track = cols.reduce((sum, col) => sum + col.getBoundingClientRect().width, 0)
  if (cols.length < 2 || index >= cols.length - 1 || track <= 0) return
  const startWidths = sharesFromPixels(cols.map((col) => col.getBoundingClientRect().width))
  const layout = layoutOf(blockId, cols.length)
  const startBlocks = cloneBlocks(useBlogEditorStore.getState().blocks)
  const previousSelect = document.body.style.userSelect
  let current = startWidths
  let wrote = false
  const originX = event.clientX
  resizingId = blockId
  row.dataset.colDrag = '1'

  const move = (ev: PointerEvent) => {
    const delta = ((ev.clientX - originX) / track) * 100
    const next = adjustAdjacentColumnWidths(startWidths, index, delta, COL_LIMITS)
    if (nearly(next, current)) return
    current = next
    wrote = true
    useBlogEditorStore.getState().updateBlock(blockId, { columnWidths: next })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    document.body.style.userSelect = previousSelect
    delete row.dataset.colDrag
    resizingId = null
    if (!wrote) return
    const final = keepOffPreset ? widthsToStore(layout, current) : current
    if (!nearly(final, current)) useBlogEditorStore.getState().updateBlock(blockId, { columnWidths: final })
    useBlogEditorStore.setState((state) => ({
      past: pushHistory(state.past, startBlocks, 'Resized columns'),
      future: [],
    }))
  }
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

export function BrandColumnGrid({
  block,
  editing,
  className,
  sizing,
  plainTemplate,
  children,
}: {
  block: BlogBlock
  editing: boolean
  className: string
  sizing: ColumnSizing
  /** Used when a designed row has no saved resize yet, such as repeat(n, 1fr). */
  plainTemplate?: string
  children: ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const count = Children.toArray(children).length
  const widths = templateWidths(block, count, sizing)
  const widthKey = widths ? widths.join(',') : ''
  const [lefts, setLefts] = useState<number[]>([])

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row || !editing || count < 2) return
    const measure = () => {
      const next = gutterLefts(row)
      setLefts((prev) => (sameLefts(prev, next) ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    row.querySelectorAll<HTMLElement>(':scope > [data-col-drop]').forEach((col) => observer.observe(col))
    return () => observer.disconnect()
  }, [editing, count, widthKey])

  const style: CSSProperties & { '--vj-cols'?: string } = {}
  if (widths) style['--vj-cols'] = gridTemplateFromWidths(widths)
  else if (plainTemplate) style.gridTemplateColumns = plainTemplate
  const columnGap = readColumnGap(block.data)
  if (columnGap != null) style.columnGap = columnGap

  return (
    <div
      ref={rowRef}
      data-col-grid=""
      className={`${className} vj-col-grid${widths ? ' vj-col-custom' : ''}`}
      style={style}
    >
      {children}
      {editing && count >= 2
        ? lefts.map((left, index) => (
            <button
              key={`gutter-${index}`}
              type="button"
              className="vj-col-gutter"
              style={{ left }}
              aria-label={`Resize the boundary between column ${index + 1} and ${index + 2}`}
              title="Drag to resize columns"
              draggable={false}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => beginColumnResize(block.id, index, sizing !== 'always', event)}
            />
          ))
        : null}
    </div>
  )
}
