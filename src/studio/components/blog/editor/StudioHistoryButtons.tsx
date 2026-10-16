import { Redo2, Undo2 } from 'lucide-react'
import { useActiveEditor } from '../../../contexts/ActiveEditorContext'
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore'

function editingTextField(): HTMLElement | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return null
  if (active.closest('[data-studio-history="widgets"]')) return null
  if (active.closest('.ProseMirror, [contenteditable="true"]')) return active
  if (active instanceof HTMLTextAreaElement) return active
  if (active instanceof HTMLInputElement) {
    const type = active.type
    if (type === 'text' || type === 'search' || type === 'url' || type === 'email' || type === 'password' || !type) {
      return active
    }
  }
  return null
}

/** Same result as Ctrl+Z / Ctrl+Y: text undo while a field is focused, otherwise the last widget change. */
export default function StudioHistoryButtons({ tone = 'header' }: { tone?: 'header' | 'light' }) {
  const undoWidgets = useBlogEditorStore((s) => s.undoWidgets)
  const redoWidgets = useBlogEditorStore((s) => s.redoWidgets)
  const selectedId = useBlogEditorStore((s) => s.selectedBlockId)
  const { activeEditor, getBlogParagraphEditor } = useActiveEditor()

  const run = (direction: 'undo' | 'redo') => {
    const field = editingTextField()
    if (field) {
      const prose = field.closest('.ProseMirror')
      if (prose) {
        const editor = (selectedId ? getBlogParagraphEditor(selectedId) : null) ?? activeEditor
        if (editor && !editor.isDestroyed) {
          const chain = editor.chain().focus()
          if (direction === 'undo') chain.undo().run()
          else chain.redo().run()
          return
        }
      }
      document.execCommand(direction)
      return
    }
    if (direction === 'undo') undoWidgets()
    else redoWidgets()
  }

  const button =
    tone === 'light'
      ? 'inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand-blue/40 hover:text-brand-blue'
      : 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 hover:text-brand-yellow'

  return (
    <div
      className={
        tone === 'light'
          ? 'flex shrink-0 items-center gap-0.5'
          : 'flex shrink-0 items-center gap-0.5 border-l border-white/10 pl-2'
      }
    >
      <button
        type="button"
        className={button}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run('undo')}
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        className={button}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run('redo')}
      >
        <Redo2 size={16} />
      </button>
    </div>
  )
}
