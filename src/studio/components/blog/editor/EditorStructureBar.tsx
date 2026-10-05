import { useEffect, useState } from 'react'
import { findBlockInTree } from '../../../lib/blog/blogBlockTree'
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore'
import { regenerateBlockIds, topLevelForSelection, type EditorDevice } from '../../../lib/blog/blockStyle'
import {
  listSavedSections,
  loadSavedSection,
  replaceGlobalSection,
  saveGlobalSection,
  type SavedSection,
} from '../../../lib/blog/savedSections'

const btn =
  'rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40'

export default function EditorStructureBar() {
  const undoWidgets = useBlogEditorStore((s) => s.undoWidgets)
  const redoWidgets = useBlogEditorStore((s) => s.redoWidgets)
  const device = useBlogEditorStore((s) => s.previewDevice)
  const setPreviewDevice = useBlogEditorStore((s) => s.setPreviewDevice)
  const selectedId = useBlogEditorStore((s) => s.selectedBlockId)
  const blocks = useBlogEditorStore((s) => s.blocks)
  const clipboard = useBlogEditorStore((s) => s.styleClipboard)
  const copyWidgetStyle = useBlogEditorStore((s) => s.copyWidgetStyle)
  const pasteWidgetStyle = useBlogEditorStore((s) => s.pasteWidgetStyle)
  const insertBlocks = useBlogEditorStore((s) => s.insertBlocks)
  const replaceTopLevel = useBlogEditorStore((s) => s.replaceTopLevel)
  const updateBlock = useBlogEditorStore((s) => s.updateBlock)
  const [sections, setSections] = useState<SavedSection[]>([])
  const [sectionId, setSectionId] = useState('')
  const [note, setNote] = useState('')

  const selectedTop = topLevelForSelection(blocks, selectedId)
  const linkedId = String(selectedTop?.data.globalSectionId ?? '')

  const refresh = () => {
    listSavedSections()
      .then(setSections)
      .catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Could not load saved sections.'))
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"], .ProseMirror')) return
      const key = event.key.toLowerCase()
      if (key === 'y') {
        event.preventDefault()
        redoWidgets()
        return
      }
      if (key !== 'z') return
      event.preventDefault()
      if (event.shiftKey) redoWidgets()
      else undoWidgets()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoWidgets, redoWidgets])

  const insert = async (linked: boolean) => {
    if (!sectionId) return
    try {
      const source = await loadSavedSection(sectionId)
      if (!source) {
        setNote('That saved section is empty.')
        return
      }
      const copy = regenerateBlockIds(source)
      if (linked) copy.data = { ...copy.data, globalSectionId: sectionId }
      const index = selectedTop ? blocks.findIndex((block) => block.id === selectedTop.id) + 1 : blocks.length
      insertBlocks([copy], index === 0 ? blocks.length : index)
      setNote(linked ? 'Inserted a linked section.' : 'Inserted a copy.')
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not insert the section.')
    }
  }

  const save = async () => {
    if (!selectedTop) {
      setNote('Select a section or widget first.')
      return
    }
    const title = window.prompt('Name this saved section')
    if (!title?.trim()) return
    try {
      const id = await saveGlobalSection(title, selectedTop)
      setSectionId(id)
      setNote('Saved.')
      refresh()
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not save the section.')
    }
  }

  const saveBack = async () => {
    if (!selectedTop || !linkedId) return
    try {
      await replaceGlobalSection(linkedId, selectedTop)
      setNote('Saved back to the shared section.')
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not update the shared section.')
    }
  }

  const pull = async () => {
    if (!selectedTop || !linkedId) return
    try {
      const source = await loadSavedSection(linkedId)
      if (!source) return
      const copy = regenerateBlockIds(source, selectedTop.id)
      copy.data = { ...copy.data, globalSectionId: linkedId }
      replaceTopLevel(selectedTop.id, copy)
      setNote('Updated from the saved section.')
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not update from the saved section.')
    }
  }

  return (
    <div className="mb-2 space-y-1 rounded-lg border border-slate-200 bg-white px-2 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {(['desktop', 'tablet', 'mobile'] as EditorDevice[]).map((item) => (
          <button
            key={item}
            type="button"
            className={`${btn}${device === item ? ' border-brand-blue text-brand-blue' : ''}`}
            onClick={() => setPreviewDevice(item)}
          >
            {item === 'mobile' ? 'Phone' : item === 'tablet' ? 'Tablet' : 'Desktop'}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button type="button" className={btn} disabled={!selectedId} onClick={() => copyWidgetStyle()}>
          Copy style
        </button>
        <button
          type="button"
          className={btn}
          disabled={!clipboard || !selectedId}
          onClick={() => {
            const target = selectedId ? findBlockInTree(blocks, selectedId) : null
            if (clipboard && target && clipboard.type !== target.type) {
              setNote('Paste style stays on the same kind of widget.')
              return
            }
            pasteWidgetStyle()
            setNote('Style pasted.')
          }}
        >
          Paste style
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className={btn} onClick={() => void save()}>
          Save section
        </button>
        <select
          className="max-w-[12rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
        >
          <option value="">Saved sections</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </select>
        <button type="button" className={btn} disabled={!sectionId} onClick={() => void insert(false)}>
          Insert copy
        </button>
        <button type="button" className={btn} disabled={!sectionId} onClick={() => void insert(true)}>
          Insert linked
        </button>
        {linkedId ? (
          <>
            <button type="button" className={btn} onClick={() => void pull()}>
              Update linked
            </button>
            <button type="button" className={btn} onClick={() => void saveBack()}>
              Save back
            </button>
            <button type="button" className={btn} onClick={() => updateBlock(selectedTop!.id, { globalSectionId: '' })}>
              Detach
            </button>
          </>
        ) : null}
      </div>
      {note ? <p className="text-[11px] text-slate-500">{note}</p> : null}
    </div>
  )
}
