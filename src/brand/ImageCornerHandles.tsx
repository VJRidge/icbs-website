import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { findBlockInTree } from '../studio/lib/blog/blogBlockTree'
import { cloneBlocks, pushHistory } from '../studio/lib/blog/editorHistory'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'

/** Smallest dragged image width. The max is the column's inner width. */
export const MIN_IMAGE_PX = 80

const CORNERS = ['nw', 'ne', 'sw', 'se'] as const
type Corner = (typeof CORNERS)[number]

const CORNER_LABEL: Record<Corner, string> = {
  nw: 'Resize image from top left',
  ne: 'Resize image from top right',
  sw: 'Resize image from bottom left',
  se: 'Resize image from bottom right',
}

export function imageWidthPx(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value)
  if (typeof value !== 'string') return null
  const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim())
  if (!match) return null
  const px = Math.round(Number(match[1]))
  return px > 0 ? px : null
}

/** Horizontal place for a sized image inside its column. Full-width images stay full width. */
export function alignBoxStyle(align: unknown): CSSProperties {
  const side = align === 'left' || align === 'right' ? align : 'center'
  if (side === 'left') {
    return { marginLeft: 0, marginRight: 'auto', justifySelf: 'start', alignSelf: 'flex-start' }
  }
  if (side === 'right') {
    return { marginLeft: 'auto', marginRight: 0, justifySelf: 'end', alignSelf: 'flex-end' }
  }
  return { marginLeft: 'auto', marginRight: 'auto', justifySelf: 'center', alignSelf: 'center' }
}

export function imageFrameStyle(width: unknown, align?: unknown): CSSProperties | undefined {
  const px = imageWidthPx(width)
  if (px == null) return undefined
  return { display: 'block', width: px, maxWidth: '100%', height: 'auto', ...alignBoxStyle(align) }
}

/** Width of a heading, paragraph, or container inside its column. Full width when unset. */
export function textBoxStyle(width: unknown): CSSProperties | undefined {
  const px = imageWidthPx(width)
  if (px == null) return undefined
  return { width: px, maxWidth: '100%', alignSelf: 'flex-start', justifySelf: 'start', boxSizing: 'border-box' }
}

export function meetCardStyle(width: unknown, align?: unknown): CSSProperties | undefined {
  const frame = imageFrameStyle(width, align)
  if (!frame) return undefined
  return { width: frame.width, maxWidth: '100%', flex: '0 0 auto', ...alignBoxStyle(align) }
}

export function meetPhotoStyle(width: unknown): CSSProperties | undefined {
  if (imageWidthPx(width) == null) return undefined
  return { flex: '0 0 auto', alignSelf: 'stretch', width: '100%', minHeight: 0, height: 'auto', padding: 0 }
}

export function meetPhotoImgStyle(width: unknown): CSSProperties | undefined {
  if (imageWidthPx(width) == null) return undefined
  return { width: '100%', height: 'auto', objectFit: 'contain' }
}

function cssWidth(el: HTMLElement) {
  return parseFloat(getComputedStyle(el).width) || 0
}

function zoomOf(el: HTMLElement) {
  const css = cssWidth(el)
  const visual = el.getBoundingClientRect().width
  if (css <= 0 || visual <= 0) return 1
  return visual / css
}

function contentWidth(el: HTMLElement) {
  const style = getComputedStyle(el)
  const box = parseFloat(style.width) || 0
  const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  const border = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0)
  return Math.max(0, box - pad - border)
}

function clampWidth(px: number, max: number) {
  return Math.round(Math.min(Math.max(MIN_IMAGE_PX, max), Math.max(MIN_IMAGE_PX, px)))
}

function widthFromCorner(corner: Corner, originW: number, originH: number, dx: number, dy: number) {
  const xSign = corner === 'ne' || corner === 'se' ? 1 : -1
  const ySign = corner === 'se' || corner === 'sw' ? 1 : -1
  const scaleX = (originW + xSign * dx) / originW
  const scaleY = originH > 0 ? (originH + ySign * dy) / originH : scaleX
  const scale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY
  return originW * (scale > 0 ? scale : 0)
}

function sizedBox(frame: HTMLElement) {
  return frame.closest<HTMLElement>('.vj-meet') ?? frame
}

function placeHandles(host: HTMLElement, img: HTMLImageElement) {
  const box = host.getBoundingClientRect()
  const rect = img.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) return null
  const x = (value: number) => ((value - box.left) / box.width) * 100
  const y = (value: number) => ((value - box.top) / box.height) * 100
  return {
    nw: { left: x(rect.left), top: y(rect.top) },
    ne: { left: x(rect.right), top: y(rect.top) },
    sw: { left: x(rect.left), top: y(rect.bottom) },
    se: { left: x(rect.right), top: y(rect.bottom) },
  }
}

function beginImageResize(blockId: string, corner: Corner, event: ReactPointerEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
  if (event.button !== 0) return
  const frame = event.currentTarget.closest('.vj-img-handles')?.parentElement
  const img = frame?.querySelector('img')
  if (!(frame instanceof HTMLElement) || !(img instanceof HTMLImageElement)) return
  const sized = sizedBox(frame)
  const originW = cssWidth(sized)
  if (originW < 1) return
  const ratio = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 0
  const originH = ratio > 0 ? originW / ratio : parseFloat(getComputedStyle(img).height) || originW
  const zoom = zoomOf(sized)
  const column = sized.parentElement
  const max = Math.max(MIN_IMAGE_PX, column ? contentWidth(column) : originW)
  const originX = event.clientX
  const originY = event.clientY
  const startBlocks = cloneBlocks(useBlogEditorStore.getState().blocks)
  const stored = findBlockInTree(startBlocks, blockId)?.data.width
  const storedPx = imageWidthPx(stored)
  const originPx = Math.round(originW)
  let current = storedPx ?? originPx
  let wrote = false

  const move = (ev: PointerEvent) => {
    const dx = (ev.clientX - originX) / zoom
    const dy = (ev.clientY - originY) / zoom
    const next = clampWidth(widthFromCorner(corner, originW, originH, dx, dy), max)
    if (next === current) return
    current = next
    wrote = true
    useBlogEditorStore.getState().updateBlock(blockId, { width: next })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (!wrote) return
    const unchanged = storedPx == null ? current === originPx : current === storedPx
    if (unchanged) {
      useBlogEditorStore.getState().updateBlock(blockId, { width: stored ?? 'full' })
      return
    }
    useBlogEditorStore.setState((state) => ({
      past: pushHistory(state.past, startBlocks, 'Resized image'),
      future: [],
    }))
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const BOX_EDGES = ['nw', 'ne', 'sw', 'se', 'e', 'w'] as const
type BoxEdge = (typeof BOX_EDGES)[number]

const BOX_SPOT: Record<BoxEdge, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  sw: { left: '0%', top: '100%' },
  se: { left: '100%', top: '100%' },
  e: { left: '100%', top: '50%' },
  w: { left: '0%', top: '50%' },
}

const BOX_LABEL: Record<BoxEdge, string> = {
  nw: 'Resize from top left',
  ne: 'Resize from top right',
  sw: 'Resize from bottom left',
  se: 'Resize from bottom right',
  e: 'Resize from the right edge',
  w: 'Resize from the left edge',
}

function beginBoxResize(blockId: string, edge: BoxEdge, event: ReactPointerEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
  if (event.button !== 0) return
  const frame = event.currentTarget.closest('.vj-img-handles')?.parentElement
  if (!(frame instanceof HTMLElement)) return
  const originW = cssWidth(frame)
  if (originW < 1) return
  const zoom = zoomOf(frame)
  const column = frame.parentElement
  const max = Math.max(MIN_IMAGE_PX, column ? contentWidth(column) : originW)
  const originX = event.clientX
  const startBlocks = cloneBlocks(useBlogEditorStore.getState().blocks)
  const stored = findBlockInTree(startBlocks, blockId)?.data.width
  const storedPx = imageWidthPx(stored)
  const originPx = Math.round(originW)
  const fromLeft = edge === 'w' || edge === 'nw' || edge === 'sw'
  let current = storedPx ?? originPx
  let wrote = false

  const move = (ev: PointerEvent) => {
    const dx = (ev.clientX - originX) / zoom
    const next = clampWidth(originW + (fromLeft ? -dx : dx), max)
    if (next === current) return
    current = next
    wrote = true
    useBlogEditorStore.getState().updateBlock(blockId, { width: next })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (!wrote) return
    const unchanged = storedPx == null ? current === originPx : current === storedPx
    if (unchanged) {
      useBlogEditorStore.getState().updateBlock(blockId, { width: stored ?? '' })
      return
    }
    useBlogEditorStore.setState((state) => ({
      past: pushHistory(state.past, startBlocks, 'Resized box'),
      future: [],
    }))
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** Corner and side handles for a selected text box or container. Width only, still in normal flow. */
export function BoxResizeHandles({ blockId }: { blockId: string }) {
  return (
    <span className="vj-img-handles">
      {BOX_EDGES.map((edge) => (
        <button
          key={edge}
          type="button"
          className={`vj-img-handle ${edge}`}
          style={{ left: BOX_SPOT[edge].left, top: BOX_SPOT[edge].top }}
          aria-label={BOX_LABEL[edge]}
          draggable={false}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onDragStart={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onPointerDown={(event) => beginBoxResize(blockId, edge, event)}
        />
      ))}
    </span>
  )
}

export function ImageCornerHandles({ blockId }: { blockId: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [spots, setSpots] = useState<ReturnType<typeof placeHandles>>(null)

  useLayoutEffect(() => {
    const host = ref.current
    const frame = host?.parentElement
    const img = frame?.querySelector('img')
    if (!host || !(img instanceof HTMLImageElement)) return
    const update = () => setSpots(placeHandles(host, img))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(img)
    observer.observe(host)
    img.addEventListener('load', update)
    return () => {
      observer.disconnect()
      img.removeEventListener('load', update)
    }
  }, [blockId])

  return (
    <span ref={ref} className="vj-img-handles">
      {spots
        ? CORNERS.map((corner) => (
            <button
              key={corner}
              type="button"
              className={`vj-img-handle ${corner}`}
              style={{ left: `${spots[corner].left}%`, top: `${spots[corner].top}%` }}
              aria-label={CORNER_LABEL[corner]}
              draggable={false}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onDragStart={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onPointerDown={(event) => beginImageResize(blockId, corner, event)}
            />
          ))
        : null}
    </span>
  )
}
