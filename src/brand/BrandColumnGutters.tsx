import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import {
  adjustAdjacentColumnWidths,
  layoutForColumnCount,
  normalizeColumnWidths,
} from '../studio/lib/blog/columnLayouts'
import { cloneBlocks } from '../studio/lib/blog/editorHistory'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { setLiveColumnWidths } from './liveColumnWidths'

function widthsFor(block: BlogBlock, count: number): number[] {
  const layout = layoutForColumnCount(String(block.data.layout ?? '50-50'), count)
  return normalizeColumnWidths(layout, block.data.columnWidths)
}

/** In-flow drag handle between two columns. Same `columnWidths` as the style sliders. */
export default function BrandColumnGutter({
  block,
  index,
  count,
  host,
}: {
  block: BlogBlock
  index: number
  count: number
  host: HTMLElement | null
}) {
  const drag = useRef<{ startX: number; startWidths: number[]; start: BlogBlock[] } | null>(null)

  const onDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    drag.current = {
      startX: event.clientX,
      startWidths: widthsFor(block, count),
      start: cloneBlocks(useBlogEditorStore.getState().blocks),
    }
    setLiveColumnWidths(block.id)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = drag.current
    if (!gesture || !host) return
    const width = host.getBoundingClientRect().width
    if (width <= 0) return
    const pair = gesture.startWidths[index]! + gesture.startWidths[index + 1]!
    const delta = ((event.clientX - gesture.startX) / width) * pair
    const next = adjustAdjacentColumnWidths(gesture.startWidths, index, delta)
    useBlogEditorStore.getState().updateBlock(block.id, { columnWidths: next })
  }

  const onUp = () => {
    const gesture = drag.current
    drag.current = null
    setLiveColumnWidths(null)
    if (!gesture) return
    const current = useBlogEditorStore.getState().blocks
    if (JSON.stringify(current) === JSON.stringify(gesture.start)) return
    useBlogEditorStore.getState().pushUndoSnapshot('Resized columns', gesture.start)
  }

  return (
    <button
      type="button"
      data-col-gutter=""
      aria-label={`Resize column ${index + 1} and ${index + 2}`}
      className="vj-col-gutter"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={(event) => event.stopPropagation()}
    />
  )
}
