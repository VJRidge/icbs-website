import { useLayoutEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import BlogBlockRenderer from '../studio/components/blog/BlogBlockRenderer'
import BlogHeadingBlock from '../studio/components/blog/blocks/BlogHeadingBlock'
import BlogParagraphBlock from '../studio/components/blog/blocks/BlogParagraphBlock'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { findBlockInTree } from '../studio/lib/blog/blogBlockTree'
import { normalizeColumnZones } from '../studio/lib/blog/columnLayouts'
import { safeHref } from '../studio/lib/blog/safeHref'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { BrandFlexibleColumns, sectionIsEmpty } from './BrandCanvasControls'
import { BrandColumnGrid } from './BrandColumnGrid'
import { columnStackAttrs } from './columnLayout'
import { BoxResizeHandles, ImageCornerHandles, imageFrameStyle, textBoxStyle, meetCardStyle, meetPhotoImgStyle, meetPhotoStyle } from './ImageCornerHandles'
import LayoutChooser from './LayoutChooser'
import { sectionBoxStyle, useSectionPadDrop } from './BrandSectionGap'
import { WIDGET_DRAG, blockFromWidgetToken } from './columnWidgets'
import {
  chunkBrandSections,
  chunkSectionId,
  columnModeOf,
  insertOnStack,
  placeWidget,
  sectionAnchorId,
  setSectionLayout,
  useColumnPick,
} from './sectionActions'
import './brand.css'

export { chunkBrandSections }

const MOVE_DRAG = 'application/x-icbs-move'

const SKIN_CLASS: Record<string, string> = {
  hero: 'vj-sec vj-hero vj-hero-lead',
  cards: 'vj-sec',
  forest: 'vj-sec vj-forest',
  product: 'vj-sec tight',
  news: 'vj-sec',
}

export function brandSectionOffsets(blocks: BlogBlock[]) {
  let at = 0
  return chunkBrandSections(blocks).map((chunk) => {
    const start = at
    at += chunk.blocks.length
    return { chunk, start }
  })
}

function Visual({ block, editing = false, live = false }: { block: BlogBlock; editing?: boolean; live?: boolean }) {
  if (block.type === 'image' && !String(block.data.url ?? '').trim()) {
    if (!editing) return null
    const label = String(block.data.alt ?? '').trim() || 'Choose an image'
    return (
      <div className="vj-media" style={{ minHeight: 140, fontSize: 16 }}>
        {label}
      </div>
    )
  }
  if (live && block.type === 'heading') return <BlogHeadingBlock block={block} isEditing canvasEdit />
  if (live && block.type === 'paragraph') {
    return <BlogParagraphBlock block={block} isEditing toolbarSource={false} canvasSurface autoFocus />
  }
  return <BlogBlockRenderer block={block} isEditing={false} />
}

function textTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[contenteditable="true"], input, textarea, select'))
}

function Piece({
  block,
  editing,
  nested,
  stacked = false,
  insertClass = '',
}: {
  block: BlogBlock
  editing: boolean
  nested?: boolean
  stacked?: boolean
  insertClass?: string
}) {
  const selectBlock = useBlogEditorStore((s) => s.selectBlock)
  const deleteBlock = useBlogEditorStore((s) => s.deleteBlock)
  const selected = useBlogEditorStore((s) => s.selectedBlockId === block.id)
  const host = useRef<HTMLDivElement>(null)
  const frame = pieceFrame(block)
  if (!editing) {
    if (!frame) return <Visual block={block} />
    return (
      <div style={frame}>
        <Visual block={block} />
      </div>
    )
  }
  const armDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = host.current
    if (!node) return
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[data-drag-handle]')) {
      node.draggable = true
      return
    }
    if (target.closest('button, a, input, textarea, select, .vj-img-handle, [contenteditable="true"]')) {
      node.draggable = false
      return
    }
    node.draggable = true
  }
  return (
    <div
      ref={host}
      data-nested-id={nested ? block.id : undefined}
      data-stack-id={stacked ? block.id : undefined}
      className={`${selected ? 'vj-canvas-on' : 'vj-canvas-piece'}${insertClass}`}
      style={frame}
      draggable={!selected}
      onPointerDown={armDrag}
      onDragStart={(event) => {
        if (event.target instanceof Element && event.target.closest('.vj-img-handle, [contenteditable="true"]')) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        if (event.currentTarget.dataset.stackId) event.currentTarget.dataset.dragging = '1'
        event.stopPropagation()
        event.dataTransfer.setData(MOVE_DRAG, block.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={(event) => {
        delete event.currentTarget.dataset.dragging
      }}
      onClick={(event) => {
        const target = event.target
        const typing = textTarget(target)
        event.stopPropagation()
        selectBlock(block.id)
        if (typing) return
        event.preventDefault()
        if (block.type !== 'heading' && block.type !== 'paragraph') return
        const node = event.currentTarget
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            node.querySelector<HTMLElement>('[contenteditable="true"]')?.focus()
          })
        })
      }}
    >
      {selected ? (
        <span className="vj-canvas-bar" onClick={(event) => event.stopPropagation()}>
          <span
            data-drag-handle
            className="vj-drag-handle"
            title="Drag"
            aria-label="Drag widget"
            draggable
            onDragStart={(event) => {
              event.stopPropagation()
              const stack = event.currentTarget.closest('[data-stack-id]')
              if (stack instanceof HTMLElement && stack.dataset.stackId === block.id) stack.dataset.dragging = '1'
              event.dataTransfer.setData(MOVE_DRAG, block.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={(event) => {
              const stack = event.currentTarget.closest('[data-stack-id]')
              if (stack instanceof HTMLElement && stack.dataset.stackId === block.id) delete stack.dataset.dragging
            }}
          >
            Drag
          </span>
          <button type="button" onClick={() => deleteBlock(block.id)}>
            Delete
          </button>
        </span>
      ) : null}
      <Visual block={block} editing live={selected} />
      {selected && block.type === 'image' ? <ImageCornerHandles blockId={block.id} /> : null}
      {selected && (block.type === 'heading' || block.type === 'paragraph' || block.type === 'columns') ? (
        <BoxResizeHandles blockId={block.id} />
      ) : null}
    </div>
  )
}

function pieceFrame(block: BlogBlock) {
  if (block.type === 'image') return imageFrameStyle(block.data.width, block.data.align)
  if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'columns') return textBoxStyle(block.data.width)
  return undefined
}

function renderPieces(blocks: BlogBlock[], editing: boolean, nested = false, slot: number | null = null, slotOffset = 0, total = 0) {
  return blocks.map((block, index) => (
    <Piece
      key={block.id}
      block={block}
      editing={editing}
      nested={nested}
      stacked={!nested && editing}
      insertClass={nested ? '' : stackMark(slot, slotOffset + index, total)}
    />
  ))
}

function stackMark(slot: number | null, index: number, total: number) {
  if (slot == null || total <= 0) return ''
  if (slot === index) return ' vj-sec-insert-before'
  if (slot >= total && index === total - 1) return ' vj-sec-insert-after'
  return ''
}

function stackIndex(root: HTMLElement, clientY: number, ignoreId: string) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-stack-id]')].filter((el) => {
    if (el.closest('[data-col-drop]')) return false
    if (el.dataset.dragging === '1') return false
    if (ignoreId && el.dataset.stackId === ignoreId) return false
    return true
  })
  for (let i = 0; i < items.length; i += 1) {
    const rect = items[i].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return i
  }
  return items.length
}

function useStackDrop(chunk: BlogBlock[], editing: boolean) {
  const chunkRef = useRef(chunk)
  chunkRef.current = chunk
  const [slot, setSlot] = useState<number | null>(null)

  const onDragOver = (event: DragEvent) => {
    if (!editing) return
    const target = event.target
    if (target instanceof Element && target.closest('[data-col-drop]')) {
      setSlot((current) => (current == null ? current : null))
      return
    }
    const types = [...event.dataTransfer.types]
    const moving = types.includes(MOVE_DRAG)
    const copying = types.includes(WIDGET_DRAG)
    if (!moving && !copying) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = moving ? 'move' : 'copy'
    const next = stackIndex(event.currentTarget as HTMLElement, event.clientY, '')
    setSlot((current) => (current === next ? current : next))
  }

  const onDrop = (event: DragEvent) => {
    if (!editing) return
    setSlot(null)
    const target = event.target
    if (target instanceof Element && target.closest('[data-col-drop]')) return
    const types = [...event.dataTransfer.types]
    const moving = types.includes(MOVE_DRAG)
    const copying = types.includes(WIDGET_DRAG)
    if (!moving && !copying) return
    event.preventDefault()
    event.stopPropagation()
    const chunk = chunkRef.current
    const root = event.currentTarget as HTMLElement
    if (moving) {
      const id = event.dataTransfer.getData(MOVE_DRAG)
      if (!id) return
      placeWidget(id, { kind: 'stack', index: stackIndex(root, event.clientY, id), section: chunkSectionId(chunk) })
      return
    }
    const created = blockFromWidgetToken(event.dataTransfer.getData(WIDGET_DRAG) || event.dataTransfer.getData('text/plain'))
    if (!created) return
    insertOnStack(chunk, created, stackIndex(root, event.clientY, ''))
  }

  const onDragLeave = (event: DragEvent) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setSlot(null)
  }

  return {
    slot: editing ? slot : null,
    bind: editing ? { onDragOver, onDrop, onDragLeave } : {},
  }
}

function zonesOf(block: BlogBlock) {
  return normalizeColumnZones(block.data.columns, String(block.data.layout ?? '50-50'))
}

function pointerInRect(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect()
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}

function widgetRows(columnEl: HTMLElement, ignoreId: string) {
  return [...columnEl.querySelectorAll<HTMLElement>('[data-nested-id]')].filter((row) => {
    const id = row.dataset.nestedId
    if (!id || id === ignoreId) return false
    const parent = row.parentElement?.closest('[data-nested-id]')
    return !parent || !columnEl.contains(parent)
  })
}

function dropIndex(columnEl: HTMLElement, clientY: number, ignoreId: string) {
  const list = widgetRows(columnEl, ignoreId)
  for (let i = 0; i < list.length; i += 1) {
    const rect = list[i].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return i
  }
  return list.length
}

function useColumnDrop(parentId: string, colIndex: number) {
  const [over, setOver] = useState(false)
  const onDragOver = (event: DragEvent) => {
    const columnEl = event.currentTarget as HTMLElement
    if (!pointerInRect(columnEl, event.clientX, event.clientY)) {
      setOver(false)
      return
    }
    const types = [...event.dataTransfer.types]
    const moving = types.includes(MOVE_DRAG)
    const copying = types.includes(WIDGET_DRAG)
    if (!moving && !copying) return
    event.preventDefault()
    event.dataTransfer.dropEffect = moving ? 'move' : 'copy'
    setOver(true)
  }
  const onDrop = (event: DragEvent) => {
    const columnEl = event.currentTarget as HTMLElement
    if (!pointerInRect(columnEl, event.clientX, event.clientY)) {
      setOver(false)
      return
    }
    const types = [...event.dataTransfer.types]
    const moving = types.includes(MOVE_DRAG)
    const copying = types.includes(WIDGET_DRAG)
    setOver(false)
    if (!moving && !copying) return
    event.preventDefault()
    event.stopPropagation()
    if (moving) {
      const moveId = event.dataTransfer.getData(MOVE_DRAG)
      if (!moveId) return
      placeWidget(moveId, { kind: 'column', parentId, column: colIndex, index: dropIndex(columnEl, event.clientY, moveId) })
      return
    }
    const created = blockFromWidgetToken(event.dataTransfer.getData(WIDGET_DRAG) || event.dataTransfer.getData('text/plain'))
    if (!created) return
    const parent = findBlockInTree(useBlogEditorStore.getState().blocks, parentId)
    if (!parent || parent.type !== 'columns') return
    const zones = zonesOf(parent).map((zone) => ({ blocks: [...zone.blocks] }))
    const dest = zones[colIndex]
    if (!dest) return
    const at = Math.max(0, Math.min(dropIndex(columnEl, event.clientY, ''), dest.blocks.length))
    const nextBlocks = [...dest.blocks]
    nextBlocks.splice(at, 0, created)
    const nextColumns = zones.map((zone, index) => (index === colIndex ? { blocks: nextBlocks } : zone))
    const { blocks, commitBlocks } = useBlogEditorStore.getState()
    commitBlocks(
      blocks.map((item) => (item.id === parentId ? { ...parent, data: { ...parent.data, columns: nextColumns, structureChosen: true } } : item)),
      'Added widget',
      created.id,
    )
  }
  return {
    over,
    bind: {
      onDragOver,
      onDragLeave: (event: DragEvent) => {
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setOver(false)
      },
      onDrop,
    },
  }
}

function DropColumn({
  parentId,
  colIndex,
  className,
  editing,
  layoutData,
  children,
}: {
  parentId: string
  colIndex: number
  className: string
  editing: boolean
  layoutData: Record<string, unknown>
  children: ReactNode
}) {
  const drop = useColumnDrop(parentId, colIndex)
  const picked = useColumnPick((s) => s.pick?.parentId === parentId && s.pick.column === colIndex)
  const setPick = useColumnPick((s) => s.setPick)
  const selectBlock = useBlogEditorStore((s) => s.selectBlock)
  const stack = columnStackAttrs(layoutData, colIndex)
  const cls = `${className}${stack.className ? ` ${stack.className}` : ''}`
  if (!editing) return <div className={cls} style={stack.style}>{children}</div>
  return (
    <div
      data-col-drop=""
      className={`${cls}${drop.over ? ' vj-canvas-drop' : ''}${picked ? ' vj-col-on' : ''}${editing ? ' vj-col-drop' : ''}`}
      style={stack.style}
      {...drop.bind}
      onClick={(event) => {
        const target = event.target
        if (target instanceof Element && target.closest('.vj-canvas-piece, .vj-canvas-on, .vj-meet, .vj-canvas-bar, .icbs-layout, .vj-sec-chrome, .vj-col-gutter')) {
          return
        }
        event.stopPropagation()
        selectBlock(parentId)
        setPick({ parentId, column: colIndex })
      }}
    >
      {children}
    </div>
  )
}

function heroCopy(blocks: BlogBlock[], editing: boolean) {
  const out: ReactNode[] = []
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const next = blocks[i + 1]
    if (block.type === 'image' && next?.type === 'button') {
      out.push(<MeetCard key={block.id} image={block} button={next} editing={editing} />)
      i += 1
      continue
    }
    out.push(<Piece key={block.id} block={block} editing={editing} nested />)
  }
  return out
}

function MeetCard({ image, button, editing }: { image: BlogBlock; button: BlogBlock; editing: boolean }) {
  const selectBlock = useBlogEditorStore((s) => s.selectBlock)
  const deleteBlock = useBlogEditorStore((s) => s.deleteBlock)
  const selectedId = useBlogEditorStore((s) => s.selectedBlockId)
  const href = safeHref(button.data.url) ?? '#'
  const url = String(image.data.url ?? '').trim()
  const label = String(image.data.alt ?? '').trim() || 'Your photo or welcome video'
  const photoOn = editing && selectedId === image.id
  const labelOn = editing && selectedId === button.id
  const card = meetCardStyle(image.data.width, image.data.align)
  const photo = meetPhotoStyle(image.data.width)
  return (
    <a
      className="vj-meet"
      style={card}
      href={editing ? undefined : href}
      onClick={editing ? (event) => event.preventDefault() : undefined}
    >
      <span
        className={photoOn ? 'vj-meet-photo vj-canvas-on' : 'vj-meet-photo'}
        style={photo}
        data-nested-id={editing ? image.id : undefined}
        draggable={editing}
        onDragStart={
          editing
            ? (event) => {
                if (event.target instanceof Element && event.target.closest('.vj-img-handle')) {
                  event.preventDefault()
                  event.stopPropagation()
                  return
                }
                event.stopPropagation()
                event.dataTransfer.setData(MOVE_DRAG, image.id)
                event.dataTransfer.effectAllowed = 'move'
              }
            : undefined
        }
        onClick={
          editing
            ? (event) => {
                event.preventDefault()
                event.stopPropagation()
                selectBlock(image.id)
              }
            : undefined
        }
      >
        {photoOn ? (
          <span className="vj-canvas-bar" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => deleteBlock(image.id)}>
              Delete
            </button>
          </span>
        ) : null}
        {url ? (
          <img src={url} alt={String(image.data.alt ?? '').trim() || label} style={meetPhotoImgStyle(image.data.width)} />
        ) : (
          label
        )}
        {photoOn && url ? <ImageCornerHandles blockId={image.id} /> : null}
      </span>
      <span
        className={labelOn ? 'vj-meet-label vj-canvas-on' : 'vj-meet-label'}
        data-nested-id={editing ? button.id : undefined}
        draggable={editing}
        onDragStart={
          editing
            ? (event) => {
                event.stopPropagation()
                event.dataTransfer.setData(MOVE_DRAG, button.id)
                event.dataTransfer.effectAllowed = 'move'
              }
            : undefined
        }
        onClick={
          editing
            ? (event) => {
                event.preventDefault()
                event.stopPropagation()
                selectBlock(button.id)
              }
            : undefined
        }
      >
        {labelOn ? (
          <span className="vj-canvas-bar" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => deleteBlock(button.id)}>
              Delete
            </button>
          </span>
        ) : null}
        {String(button.data.text ?? '')}
      </span>
    </a>
  )
}

const PAGE_WIDTH = 1280

export function BrandPageCanvas({ children, frameWidth = PAGE_WIDTH }: { children: ReactNode; frameWidth?: number }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const box = outer.current
    if (!box) return
    const measure = () => setScale(Math.min(1, box.clientWidth / frameWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [frameWidth, children])

  return (
    <div
      ref={outer}
      className="-ml-6 -mr-2 overflow-hidden bg-white"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest('a')
        if (link && !(event.target as HTMLElement).closest('[contenteditable="true"]')) event.preventDefault()
      }}
    >
      <div ref={inner} className="vj vj-canvas" style={{ width: frameWidth, zoom: scale }}>
        {children}
      </div>
    </div>
  )
}

function lead(blocks: BlogBlock[], editing: boolean) {
  const images: BlogBlock[] = []
  const rest: BlogBlock[] = []
  let seenText = false
  for (const block of blocks) {
    if (!seenText && block.type === 'image') images.push(block)
    else {
      seenText = true
      rest.push(block)
    }
  }
  return (
    <>
      {renderPieces(images, editing, true)}
      <div className="vj-lead-body">{renderPieces(rest, editing, true)}</div>
    </>
  )
}

function zoneClass(base: string, count: number, editing: boolean) {
  return `${base}${editing && count === 0 ? ' vj-canvas-empty' : ''}`.trim()
}

function flowColumnClass(editing: boolean, mode: 'flex' | 'grid', count: number) {
  const box = editing ? `vj-col-box${mode === 'grid' ? ' is-grid' : ''}` : ''
  return zoneClass(box, count, editing)
}

function columnBody(block: BlogBlock, skin: string, editing: boolean) {
  const zones = zonesOf(block)
  if (block.data.flowColumns === true) {
    const choosing = editing && block.data.structureChosen !== true && sectionIsEmpty(block)
    if (choosing) {
      return (
        <div className="vj-wrap">
          <LayoutChooser
            variant="canvas"
            activeLayout={String(block.data.layout ?? '')}
            onPick={(mode, layout) => setSectionLayout(block.id, layout, mode)}
          />
        </div>
      )
    }
    const mode = columnModeOf(block.data)
    return (
      <div className="vj-wrap">
        <BrandFlexibleColumns block={block} editing={editing}>
          {zones.map((zone, index) => (
            <DropColumn
              key={index}
              parentId={block.id}
              colIndex={index}
              className={flowColumnClass(editing, mode, zone.blocks.length)}
              editing={editing}
              layoutData={block.data}
            >
              {renderPieces(zone.blocks, editing, true)}
            </DropColumn>
          ))}
        </BrandFlexibleColumns>
      </div>
    )
  }
  if (skin === 'hero') {
    return (
      <BrandColumnGrid block={block} editing={editing} className="vj-wrap vj-split" sizing="custom">
        <DropColumn parentId={block.id} colIndex={0} className={zoneClass('vj-hero-copy', zones[0]?.blocks.length ?? 0, editing)} editing={editing} layoutData={block.data}>
          {heroCopy(zones[0]?.blocks ?? [], editing)}
        </DropColumn>
        <DropColumn parentId={block.id} colIndex={1} className={zoneClass('vj-lead', zones[1]?.blocks.length ?? 0, editing)} editing={editing} layoutData={block.data}>
          {lead(zones[1]?.blocks ?? [], editing)}
        </DropColumn>
      </BrandColumnGrid>
    )
  }
  if (skin === 'product') {
    return (
      <div className="vj-wrap">
        <BrandColumnGrid block={block} editing={editing} className="vj-product" sizing="custom">
          <DropColumn parentId={block.id} colIndex={0} className={zoneClass('', zones[0]?.blocks.length ?? 0, editing)} editing={editing} layoutData={block.data}>
            {renderPieces(zones[0]?.blocks ?? [], editing, true)}
          </DropColumn>
          <DropColumn parentId={block.id} colIndex={1} className={zoneClass('', zones[1]?.blocks.length ?? 0, editing)} editing={editing} layoutData={block.data}>
            {renderPieces(zones[1]?.blocks ?? [], editing, true)}
          </DropColumn>
        </BrandColumnGrid>
      </div>
    )
  }
  if (skin === 'cards' || skin === 'forest') {
    return (
      <BrandColumnGrid block={block} editing={editing} className="vj-grid" sizing="custom">
        {zones.map((zone, index) => (
          <DropColumn parentId={block.id} colIndex={index} className={zoneClass('vj-card', zone.blocks.length, editing)} editing={editing} layoutData={block.data} key={index}>
            {renderPieces(zone.blocks, editing, true)}
          </DropColumn>
        ))}
      </BrandColumnGrid>
    )
  }
  return (
    <BrandColumnGrid
      block={block}
      editing={editing}
      className="vj-grid"
      sizing="custom"
      plainTemplate={`repeat(${Math.max(zones.length, 1)}, 1fr)`}
    >
      {zones.map((zone, index) => (
        <DropColumn parentId={block.id} colIndex={index} className={zoneClass('', zone.blocks.length, editing)} editing={editing} layoutData={block.data} key={index}>
          {renderPieces(zone.blocks, editing, true)}
        </DropColumn>
      ))}
    </BrandColumnGrid>
  )
}

export default function BrandWidgetSection({ blocks, editing = false }: { blocks: BlogBlock[]; editing?: boolean }) {
  const selectBlock = useBlogEditorStore((s) => s.selectBlock)
  const sectionSelected = useBlogEditorStore((s) => s.selectedBlockId)
  const setPick = useColumnPick((s) => s.setPick)
  const pad = useSectionPadDrop(blocks, editing)
  const stack = useStackDrop(blocks, editing)
  const columns = blocks.find((block) => block.type === 'columns')
  const skin = String(blocks.find((block) => String(block.data.skin ?? ''))?.data.skin ?? columns?.data.skin ?? 'news')
  const before = columns ? blocks.slice(0, blocks.indexOf(columns)) : blocks
  const after = columns ? blocks.slice(blocks.indexOf(columns) + 1) : []
  const href = safeHref(columns?.data.link)
  const split = skin === 'hero' || skin === 'product'
  const sectionOn = Boolean(editing && columns && sectionSelected === columns.id)
  const anchor = blocks.find((block) => block.id === sectionAnchorId(blocks)) ?? columns
  const spaceStyle = { ...(sectionBoxStyle(anchor?.data, editing) ?? {}), ...(textBoxStyle(columns?.data.width) ?? {}) }
  const dropClass = pad.edge === 'before' ? ' vj-drop-inside is-before' : pad.edge === 'after' ? ' vj-drop-inside is-after' : ''
  const className = `${SKIN_CLASS[skin] ?? 'vj-sec'}${editing ? ' vj-canvas-sec' : ''}${sectionOn ? ' vj-canvas-on' : ''}${dropClass}`
  const total = before.length + (columns ? 1 : 0) + after.length
  const columnSlot = before.length
  const inner = (
    <>
      {split ? null : (
        <div className="vj-wrap">
          {renderPieces(before, editing, false, stack.slot, 0, total)}
          {columns ? (
            <div data-stack-id={editing ? columns.id : undefined} className={stackMark(stack.slot, columnSlot, total).trim()}>
              {columnBody(columns, skin, editing)}
            </div>
          ) : null}
          {renderPieces(after, editing, false, stack.slot, columnSlot + (columns ? 1 : 0), total)}
        </div>
      )}
      {columns && split ? (
        <div data-stack-id={editing ? columns.id : undefined} className={stackMark(stack.slot, 0, 1).trim()}>
          {columnBody(columns, skin, editing)}
        </div>
      ) : null}
      {!columns && split ? <div className="vj-wrap">{renderPieces(blocks, editing, false, stack.slot, 0, blocks.length)}</div> : null}
    </>
  )
  if (href && !editing) {
    return (
      <a href={href} className={`${className} block text-inherit no-underline`} style={spaceStyle}>
        {inner}
      </a>
    )
  }
  return (
    <section
      className={className}
      style={spaceStyle}
      data-sec-id={sectionAnchorId(blocks)}
      {...pad.bind}
      onClick={
        editing && columns
          ? (event) => {
              const target = event.target
              if (!(target instanceof Element)) return
              if (target.closest('.vj-canvas-piece, .vj-canvas-on, .vj-meet, .vj-canvas-bar, .vj-sec-gap-btn, .vj-sec-gap-drag, .icbs-layout, .vj-sec-chrome, .vj-col-gutter')) {
                return
              }
              setPick(null)
              selectBlock(columns.id)
            }
          : undefined
      }
    >
      {editing ? (
        <div data-sec-body {...stack.bind}>
          {inner}
        </div>
      ) : (
        inner
      )}
      {sectionOn && columns ? <BoxResizeHandles blockId={columns.id} /> : null}
    </section>
  )
}
