import { useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { cloneBlocks, pushHistory } from '../studio/lib/blog/editorHistory'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { WIDGET_DRAG, blockFromWidgetToken } from './columnWidgets'
import { addSectionAt, chunkSectionId, insertOnStack, insertWidgetInsideSection, placeWidget } from './sectionActions'

const MOVE_DRAG = 'application/x-icbs-move'

function dragKinds(data: DataTransfer) {
  const types = [...data.types]
  return { move: types.includes(MOVE_DRAG), widget: types.includes(WIDGET_DRAG) }
}

export function blockFromWidgetTransfer(data: DataTransfer): BlogBlock | null {
  const kinds = dragKinds(data)
  if (kinds.move || !kinds.widget) return null
  return blockFromWidgetToken(data.getData(WIDGET_DRAG) || data.getData('text/plain'))
}

function indexBeforeAnchor(anchorId: string, fallback: number) {
  const blocks = useBlogEditorStore.getState().blocks
  if (!anchorId) return Math.max(0, fallback)
  const index = blocks.findIndex((block) => block.id === anchorId)
  return index < 0 ? Math.max(0, fallback) : index
}

export function chunkInsertAt(chunk: BlogBlock[], where: 'before' | 'after') {
  const all = useBlogEditorStore.getState().blocks
  const anchor = chunk[0]
  if (!anchor) return all.length
  const start = all.findIndex((block) => block.id === anchor.id)
  if (start < 0) return all.length
  return where === 'before' ? start : start + chunk.length
}

function insertTopLevel(block: BlogBlock, at: number) {
  useBlogEditorStore.getState().insertBlocks([block], at, 'Added section')
}

const MAX_GAP = 320
/** Matches .vj-sec padding so the toolbar stays above the heading. */
export const SECTION_CHROME_PAD = 64

function finiteSpace(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

export function clampSectionSpace(value: unknown, min = 0): number {
  const n = finiteSpace(value)
  if (n == null) return min
  return Math.min(MAX_GAP, Math.max(min, Math.round(n)))
}

type GapParts = { top: number; bottom: number; margin: number }

/** Shrink margin, then the upper padding, then the lower padding. Never below the chrome lane or zero. */
export function resizeSectionGap(origin: GapParts, delta: number, edges: { upper: boolean; lower: boolean }): GapParts {
  const minTop = edges.lower ? SECTION_CHROME_PAD : 0
  const top = edges.lower ? Math.max(minTop, clampSectionSpace(origin.top, 0)) : 0
  const bottom = edges.upper ? clampSectionSpace(origin.bottom, 0) : 0
  const margin = clampSectionSpace(origin.margin, 0)
  const target = clampSectionSpace(top + bottom + margin + delta, minTop)
  let nextTop = top
  let nextBottom = bottom
  let nextMargin = margin
  const diff = target - (top + bottom + margin)
  if (diff >= 0) {
    nextMargin += diff
  } else {
    let cut = -diff
    const fromMargin = Math.min(nextMargin, cut)
    nextMargin -= fromMargin
    cut -= fromMargin
    const fromBottom = Math.min(nextBottom, cut)
    nextBottom -= fromBottom
    cut -= fromBottom
    nextTop = Math.max(minTop, nextTop - cut)
  }
  return { top: nextTop, bottom: nextBottom, margin: nextMargin }
}

export function sectionBoxStyle(data: Record<string, unknown> | undefined, editing = false): CSSProperties | undefined {
  if (!data) return undefined
  const style: CSSProperties = {}
  const padTop = finiteSpace(data.padTop)
  const padBottom = finiteSpace(data.padBottom)
  const marginBottom = finiteSpace(data.marginBottom)
  const marginTop = finiteSpace(data.marginTop)
  if (padTop != null) style.paddingTop = clampSectionSpace(padTop, editing ? SECTION_CHROME_PAD : 0)
  if (padBottom != null) style.paddingBottom = clampSectionSpace(padBottom, 0)
  if (marginBottom != null) style.marginBottom = marginBottom > 0 ? clampSectionSpace(marginBottom, 0) : 0
  if (marginTop != null && marginTop < 0) style.marginTop = 0
  return Object.keys(style).length ? style : undefined
}

function sectionNode(id: string | null) {
  if (!id || typeof CSS === 'undefined' || typeof CSS.escape !== 'function') return null
  return document.querySelector<HTMLElement>(`[data-sec-id="${CSS.escape(id)}"]`)
}

function zoomOf(el: HTMLElement) {
  const css = el.offsetHeight
  const visual = el.getBoundingClientRect().height
  if (css <= 0 || visual <= 0) return 1
  return visual / css
}

function readPad(el: HTMLElement | null, prop: 'paddingTop' | 'paddingBottom') {
  if (!el) return 0
  const value = parseFloat(getComputedStyle(el)[prop])
  return Number.isFinite(value) ? value : 0
}

function startGapDrag(upperId: string | null, lowerId: string | null, event: ReactPointerEvent<HTMLButtonElement>) {
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  const upperEl = sectionNode(upperId)
  const lowerEl = sectionNode(lowerId)
  const host = upperEl ?? lowerEl
  if (!host) return
  const zoom = zoomOf(host)
  const originY = event.clientY
  const originBottom = readPad(upperEl, 'paddingBottom')
  const originTop = readPad(lowerEl, 'paddingTop')
  const upper = upperId ? useBlogEditorStore.getState().blocks.find((block) => block.id === upperId) : null
  const originMargin = Math.max(0, finiteSpace(upper?.data.marginBottom) ?? 0)
  const startBlocks = cloneBlocks(useBlogEditorStore.getState().blocks)
  let wrote = false
  const move = (ev: PointerEvent) => {
    const next = resizeSectionGap(
      { top: originTop, bottom: originBottom, margin: originMargin },
      (ev.clientY - originY) / zoom,
      { upper: Boolean(upperId), lower: Boolean(lowerId) },
    )
    if (next.top === Math.round(originTop) && next.bottom === Math.round(originBottom) && next.margin === Math.round(originMargin) && !wrote) return
    const { updateBlock } = useBlogEditorStore.getState()
    if (upperId) updateBlock(upperId, { padBottom: next.bottom, marginBottom: next.margin })
    if (lowerId) updateBlock(lowerId, { padTop: next.top })
    wrote = true
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (!wrote) return
    useBlogEditorStore.setState((state) => ({
      past: pushHistory(state.past, startBlocks, 'Resized gap'),
      future: [],
    }))
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** White band above or below a section's content. Viewport coordinates, so canvas zoom stays honest. */
export function sectionPadEdge(section: HTMLElement, clientY: number): 'before' | 'after' | null {
  const body = section.querySelector<HTMLElement>(':scope > [data-sec-body]')
  if (!body) return null
  const sec = section.getBoundingClientRect()
  const box = body.getBoundingClientRect()
  if (clientY >= sec.top && clientY < box.top) return 'before'
  if (clientY <= sec.bottom && clientY > box.bottom) return 'after'
  return null
}

export function useSectionPadDrop(chunk: BlogBlock[], editing: boolean) {
  const chunkRef = useRef(chunk)
  chunkRef.current = chunk
  const [edge, setEdge] = useState<'before' | 'after' | null>(null)

  const onDragOver = (event: DragEvent) => {
    if (!editing) return
    const kinds = dragKinds(event.dataTransfer)
    if (!kinds.move && !kinds.widget) {
      setEdge((current) => (current ? null : current))
      return
    }
    const next = sectionPadEdge(event.currentTarget as HTMLElement, event.clientY)
    setEdge((current) => (current === next ? current : next))
    if (!next) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = kinds.move ? 'move' : 'copy'
  }

  const onDrop = (event: DragEvent) => {
    if (!editing) return
    setEdge(null)
    const kinds = dragKinds(event.dataTransfer)
    if (!kinds.move && !kinds.widget) return
    const next = sectionPadEdge(event.currentTarget as HTMLElement, event.clientY)
    if (!next) return
    event.preventDefault()
    event.stopPropagation()
    const chunk = chunkRef.current
    if (kinds.move) {
      const id = event.dataTransfer.getData(MOVE_DRAG)
      if (!id) return
      const section = chunkSectionId(chunk)
      placeWidget(id, { kind: 'stack', index: next === 'before' ? 0 : chunk.length, section })
      return
    }
    const created = blockFromWidgetTransfer(event.dataTransfer)
    if (!created) return
    if (!chunkSectionId(chunk)) {
      insertWidgetInsideSection(chunk, created, next)
      return
    }
    insertOnStack(chunk, created, next === 'before' ? 0 : chunk.length)
  }

  const onDragLeave = (event: DragEvent) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setEdge(null)
  }

  return {
    edge: editing ? edge : null,
    bind: editing ? { onDragOver, onDrop, onDragLeave } : {},
  }
}

export default function BrandSectionGap({
  at,
  anchorId,
  deleteId,
  lead = false,
  upperId = null,
  lowerId = null,
}: {
  at: number
  anchorId: string
  deleteId: string | null
  lead?: boolean
  upperId?: string | null
  lowerId?: string | null
}) {
  const [over, setOver] = useState(false)

  const insertAt = () => indexBeforeAnchor(anchorId, at)

  const onDragOver = (event: DragEvent) => {
    const kinds = dragKinds(event.dataTransfer)
    if (kinds.move || !kinds.widget) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }

  const onDrop = (event: DragEvent) => {
    setOver(false)
    const created = blockFromWidgetTransfer(event.dataTransfer)
    if (!created) return
    event.preventDefault()
    event.stopPropagation()
    insertTopLevel(created, insertAt())
  }

  return (
    <div className={`vj-sec-gap${lead ? ' vj-sec-gap-lead' : ' vj-sec-gap-between'}${deleteId ? ' is-selected' : ''}${over ? ' is-over' : ''}`}>
      <div
        className={`vj-sec-gap-hit${over ? ' vj-canvas-drop' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={(event) => {
          const next = event.relatedTarget
          if (next instanceof Node && event.currentTarget.contains(next)) return
          setOver(false)
        }}
        onDrop={onDrop}
      >
        {!lead && (upperId || lowerId) ? (
          <button
            type="button"
            className="vj-sec-gap-drag"
            aria-label="Drag the space between these sections"
            title="Drag the space between these sections"
            onPointerDown={(event) => startGapDrag(upperId, lowerId, event)}
          />
        ) : null}
        <button type="button" className="vj-sec-gap-btn" aria-label="Add section" title="Add section under the section above" onClick={() => addSectionAt(insertAt())}>
          +
        </button>
      </div>
    </div>
  )
}
