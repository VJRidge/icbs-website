import { useEffect, useState } from 'react'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import {
  COLUMN_LAYOUT_META,
  COLUMN_WIDTH_MAX,
  COLUMN_WIDTH_MIN,
  normalizeColumnWidths,
  widthsWithColumnPercent,
} from '../studio/lib/blog/columnLayouts'
import { cloneBlocks, pushHistory } from '../studio/lib/blog/editorHistory'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { setLiveColumnWidths } from './BrandColumnGrid'
import { useColumnPick } from './sectionActions'

type Session = {
  blockId: string
  /** Number field that opened the gesture, or null while a slider owns it. */
  index: number | null
  blocks: BlogBlock[]
  dirty: boolean
  base: number[]
}

let session: Session | null = null
let commitFrame = 0
let disarm: (() => void) | null = null

function layoutKey(block: BlogBlock): string {
  const layout = String(block.data.layout ?? '50-50')
  return layout in COLUMN_LAYOUT_META ? layout : '50-50'
}

function formatPercent(n: number): string {
  return String(Math.round(n * 10) / 10)
}

function parsePercent(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  return Number(trimmed)
}

function nearly(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => Math.abs(n - (b[i] ?? 0)) < 0.11)
}

function beginSession(blockId: string, base: number[], index: number | null) {
  if (session?.blockId === blockId) return
  if (session) commitSession()
  const state = useBlogEditorStore.getState()
  session = { blockId, index, blocks: cloneBlocks(state.blocks), dirty: state.isDirty, base: [...base] }
}

function restoreSession() {
  if (!session) return
  setLiveColumnWidths(null)
  useBlogEditorStore.setState({ blocks: cloneBlocks(session.blocks), isDirty: session.dirty })
}

/** One history step for the whole gesture. Live `updateBlock` calls do not record history. */
function commitSession() {
  if (commitFrame) {
    cancelAnimationFrame(commitFrame)
    commitFrame = 0
  }
  disarm?.()
  disarm = null
  const snap = session
  session = null
  setLiveColumnWidths(null)
  if (!snap) return
  const current = useBlogEditorStore.getState().blocks
  if (JSON.stringify(current) === JSON.stringify(snap.blocks)) return
  useBlogEditorStore.setState((state) => ({
    past: pushHistory(state.past, snap.blocks, 'Resized columns'),
    future: [],
  }))
}

function scheduleCommit() {
  if (commitFrame) return
  commitFrame = requestAnimationFrame(() => {
    commitFrame = 0
    commitSession()
  })
}

function armRelease() {
  if (disarm) return
  const up = () => {
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    disarm = null
    scheduleCommit()
  }
  disarm = () => {
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
  }
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

function livePercent(blockId: string, index: number, percent: number): boolean {
  if (!session || session.blockId !== blockId) return false
  const next = widthsWithColumnPercent(session.base, index, percent)
  if (!next) return false
  setLiveColumnWidths(blockId)
  useBlogEditorStore.getState().updateBlock(blockId, { columnWidths: next })
  return true
}

function finishNumber(blockId: string, index: number, raw: string) {
  const snap = session
  if (!snap || snap.blockId !== blockId || snap.index !== index) return
  const percent = parsePercent(raw)
  const next = percent == null ? null : widthsWithColumnPercent(snap.base, index, percent)
  const unchanged = !next || nearly(next, snap.base)
  if (unchanged) {
    const current = useBlogEditorStore.getState().blocks
    if (JSON.stringify(current) !== JSON.stringify(snap.blocks)) restoreSession()
  } else if (next) {
    setLiveColumnWidths(blockId)
    useBlogEditorStore.getState().updateBlock(blockId, { columnWidths: next })
  }
  commitSession()
}

function staysInWidths(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-column-width]'))
}

const numberClass =
  'w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs font-semibold text-slate-800 outline-none focus:border-slate-500'

function WidthRow({
  blockId,
  index,
  width,
  widths,
  prominent,
  draft,
  setDraft,
}: {
  blockId: string
  index: number
  width: number
  widths: number[]
  prominent: boolean
  draft: { index: number; raw: string } | null
  setDraft: (draft: { index: number; raw: string } | null) => void
}) {
  const shown = draft?.index === index ? draft.raw : formatPercent(width)
  const sliderValue = Math.min(COLUMN_WIDTH_MAX, Math.max(COLUMN_WIDTH_MIN, width))
  return (
    <div className={prominent ? 'mt-2 rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-900' : 'mt-2 text-xs text-slate-700'}>
      <div
        className={`mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest ${
          prominent ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        <span>{prominent ? `Column ${index + 1} width` : `Column ${index + 1}`}</span>
        <span className="inline-flex items-center gap-1 normal-case tracking-normal">
          <input
            type="number"
            inputMode="decimal"
            min={COLUMN_WIDTH_MIN}
            max={COLUMN_WIDTH_MAX}
            step={0.1}
            aria-label={`Column ${index + 1} width percent`}
            className={numberClass}
            value={shown}
            onFocus={(event) => {
              commitSession()
              beginSession(blockId, widths, index)
              const input = event.currentTarget
              requestAnimationFrame(() => input.select())
            }}
            onChange={(event) => {
              const raw = event.target.value
              beginSession(blockId, widths, index)
              setDraft({ index, raw })
              const percent = parsePercent(raw)
              if (percent == null || !livePercent(blockId, index, percent)) restoreSession()
            }}
            onBlur={() => {
              const raw = draft?.index === index ? draft.raw : formatPercent(width)
              setDraft(null)
              finishNumber(blockId, index, raw)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              event.currentTarget.blur()
            }}
          />
          <span>%</span>
        </span>
      </div>
      <input
        type="range"
        min={COLUMN_WIDTH_MIN}
        max={COLUMN_WIDTH_MAX}
        step={0.1}
        value={sliderValue}
        aria-label={`Column ${index + 1} width`}
        className="w-full"
        onPointerDown={() => {
          commitSession()
          beginSession(blockId, widths, null)
          armRelease()
        }}
        onChange={(event) => {
          beginSession(blockId, widths, null)
          const percent = Number(event.target.value)
          if (Number.isFinite(percent)) livePercent(blockId, index, percent)
        }}
        onKeyUp={() => scheduleCommit()}
        onBlur={(event) => {
          if (staysInWidths(event.relatedTarget)) return
          commitSession()
        }}
      />
    </div>
  )
}

/** Percent sliders for Style → Container. Writes the same `columnWidths` as the gutter and Content tab. */
export default function ColumnWidthSliders({ block }: { block: BlogBlock }) {
  const pick = useColumnPick((s) => s.pick)
  const selectedId = useBlogEditorStore((s) => s.selectedBlockId)
  const [draft, setDraft] = useState<{ index: number; raw: string } | null>(null)
  const widths = normalizeColumnWidths(layoutKey(block), block.data.columnWidths)
  const active =
    pick?.parentId === block.id && selectedId === block.id && pick.column >= 0 && pick.column < widths.length
      ? pick.column
      : null

  useEffect(() => {
    return () => commitSession()
  }, [block.id])

  if (widths.length < 2) {
    return (
      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        Column 1: {formatPercent(widths[0] ?? 100)}%
      </p>
    )
  }

  return (
    <div className="mt-2" data-column-width="">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Column width</p>
      {widths.map((width, index) => (
        <WidthRow
          key={index}
          blockId={block.id}
          index={index}
          width={width}
          widths={widths}
          prominent={active === index}
          draft={draft}
          setDraft={setDraft}
        />
      ))}
    </div>
  )
}
