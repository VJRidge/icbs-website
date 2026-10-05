import { useState } from 'react'
import { BLOG_BLOCK_LABELS, type BlogBlock, type BlogBlockType } from '../studio/lib/blog/blogBlockTypes'
import { normalizeColumnZones } from '../studio/lib/blog/columnLayouts'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { addSectionAfterSelection, useColumnPick } from './sectionActions'

function widgetLabel(block: BlogBlock) {
  if (block.type === 'carousel' && block.data.kind === 'image') return 'Image carousel'
  if (block.type === 'paragraph') return 'Text Editor'
  return BLOG_BLOCK_LABELS[block.type as BlogBlockType] ?? block.type
}

function StructureTree() {
  const blocks = useBlogEditorStore((s) => s.blocks)
  const selectedId = useBlogEditorStore((s) => s.selectedBlockId)
  const selectBlock = useBlogEditorStore((s) => s.selectBlock)
  const pick = useColumnPick((s) => s.pick)
  const setPick = useColumnPick((s) => s.setPick)

  if (blocks.length === 0) {
    return <p className="px-2 py-3 text-xs text-slate-500">No sections yet.</p>
  }

  return (
    <ul className="space-y-1">
      {blocks.map((block, index) => {
        const sectionOn = selectedId === block.id && pick?.parentId !== block.id
        if (block.type !== 'columns') {
          return (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => {
                  setPick(null)
                  selectBlock(block.id)
                }}
                className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${sectionOn ? 'bg-slate-900 font-bold text-white' : 'hover:bg-slate-100'}`}
              >
                {widgetLabel(block)}
              </button>
            </li>
          )
        }
        const zones = normalizeColumnZones(block.data.columns, String(block.data.layout ?? '50-50'))
        return (
          <li key={block.id}>
            <button
              type="button"
              onClick={() => {
                setPick(null)
                selectBlock(block.id)
              }}
              className={`w-full rounded-md px-2 py-1.5 text-left text-xs font-bold ${sectionOn ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
            >
              Section {index + 1}
            </button>
            <ul className="mt-0.5 space-y-0.5 pl-3">
              {zones.map((zone, column) => {
                const columnOn = pick?.parentId === block.id && pick.column === column && selectedId === block.id
                return (
                  <li key={`${block.id}-${column}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPick({ parentId: block.id, column })
                        selectBlock(block.id)
                      }}
                      className={`w-full rounded-md px-2 py-1 text-left text-[11px] ${columnOn ? 'bg-slate-200 font-bold' : 'hover:bg-slate-100'}`}
                    >
                      Column {column + 1}
                    </button>
                    <ul className="pl-3">
                      {zone.blocks.map((nested) => (
                        <li key={nested.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPick(null)
                              selectBlock(nested.id)
                            }}
                            className={`w-full rounded-md px-2 py-1 text-left text-[11px] ${
                              selectedId === nested.id ? 'bg-slate-200 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {widgetLabel(nested)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

function HistoryList() {
  const past = useBlogEditorStore((s) => s.past)
  const jumpWidgets = useBlogEditorStore((s) => s.jumpWidgets)
  if (past.length === 0) {
    return <p className="px-2 py-3 text-xs text-slate-500">No structural changes yet. Text edits stay on undo.</p>
  }
  const rows = past.map((entry, index) => ({ entry, index })).reverse()
  return (
    <ul className="space-y-1">
      {rows.map(({ entry, index }) => (
        <li key={`${entry.label}-${index}`}>
          <button
            type="button"
            onClick={() => jumpWidgets(index)}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-100"
          >
            {entry.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

type Panel = 'structure' | 'history' | null

const tabClass = (on: boolean) =>
  `inline-flex h-8 items-center rounded-lg px-2 text-xs font-semibold transition-colors ${
    on ? 'bg-white/15 text-brand-yellow' : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

/** Add, Structure, and History at the top of the editor's left column. Undo and redo stay in the header. */
export default function EditorSideChrome() {
  const [panel, setPanel] = useState<Panel>(null)
  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next))

  return (
    <div className="shrink-0 border-b border-white/10 px-2 py-2">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          title="Add a section under the current one"
          aria-label="Add section"
          onClick={() => {
            setPanel(null)
            addSectionAfterSelection()
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          +
        </button>
        <button type="button" className={tabClass(panel === 'structure')} aria-expanded={panel === 'structure'} onClick={() => toggle('structure')}>
          Structure
        </button>
        <button type="button" className={tabClass(panel === 'history')} aria-expanded={panel === 'history'} onClick={() => toggle('history')}>
          History
        </button>
      </div>
      {panel ? (
        <div className="mt-2 max-h-[min(420px,50vh)] overflow-auto rounded-lg bg-white p-2 text-slate-800 shadow-lg">
          {panel === 'structure' ? <StructureTree /> : null}
          {panel === 'history' ? <HistoryList /> : null}
        </div>
      ) : null}
    </div>
  )
}
