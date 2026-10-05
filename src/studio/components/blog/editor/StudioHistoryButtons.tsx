import { Redo2, Undo2 } from 'lucide-react'
import { useActiveEditor } from '../../../contexts/ActiveEditorContext'
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore'

const FIELD = 'input, textarea, select, [contenteditable="true"], .ProseMirror'

function editingField(): HTMLElement | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return null
  return active.closest(FIELD)
}

/** Same result as Ctrl+Z / Ctrl+Y: text undo while a field is focused, otherwise the last widget change. */
export default function StudioHistoryButtons() {
  const undoWidgets = useBlogEditorStore((s) => s.undoWidgets)
  const redoWidgets = useBlogEditorStore((s) => s.redoWidgets)
  const selectedId = useBlogEditorStore((s) => s.selectedBlockId)
  const { activeEditor, getBlogParagraphEditor } = useActiveEditor()

  const run = (direction: 'undo' | 'redo') => {
    const field = editingField()
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
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white'

  return (
    <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
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
