import type { BlogBlockType } from '../studio/lib/blog/blogBlockTypes'
import { COLUMN_WIDGETS, WIDGET_DRAG } from './columnWidgets'
import { addWidgetFromTray } from './sectionActions'

/** Left-panel widget list. Layout Flexbox/Grid stays on the canvas for an empty section. */
export default function ColumnWidgetTray() {
  return (
    <div className="space-y-3 bg-white p-3">
      <p className="text-xs leading-relaxed text-slate-600">
        Drag a widget into this section after you pick a layout.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {COLUMN_WIDGETS.map((widget) => {
          const token = widget.preset ? `${widget.type}:${widget.preset}` : widget.type
          return (
            <button
              key={token}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(WIDGET_DRAG, token)
                event.dataTransfer.setData('text/plain', token)
                event.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => addWidgetFromTray(widget.type as BlogBlockType, widget.preset)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-3 text-left text-xs font-bold text-slate-700 hover:border-[#7c3aed]"
            >
              {widget.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
