import { useState } from 'react'
import type { ColumnLayoutKey } from '../studio/lib/blog/blogBlockTypes'
import { COLUMN_LAYOUT_META, defaultWidthsForLayout } from '../studio/lib/blog/columnLayouts'
import type { ColumnMode } from './sectionActions'

const PRESETS: ColumnLayoutKey[] = ['100', '50-50', '33-33-33', '25-25-25-25', '66-33', '33-66']

function StructureGlyph({ layout, dotted }: { layout: ColumnLayoutKey; dotted: boolean }) {
  const widths = defaultWidthsForLayout(layout)
  return (
    <span className={`icbs-struct${dotted ? ' is-dotted' : ''}`} aria-hidden>
      {widths.map((width, index) => (
        <span key={index} style={{ flexGrow: width }} />
      ))}
    </span>
  )
}

export default function LayoutChooser({
  variant = 'canvas',
  activeLayout = '',
  onPick,
}: {
  variant?: 'canvas' | 'side'
  activeLayout?: string
  onPick: (mode: ColumnMode, layout: ColumnLayoutKey) => void
}) {
  const [mode, setMode] = useState<ColumnMode | null>(null)
  const dotted = mode === 'grid'

  return (
    <div
      className={`icbs-layout${variant === 'canvas' ? ' is-canvas' : ' is-side'}`}
      onClick={(event) => event.stopPropagation()}
    >
      {mode == null ? (
        <>
          <p className="icbs-layout-q">Which layout would you like to use?</p>
          <div className="icbs-mode-row">
            <button type="button" className="icbs-mode" onClick={() => setMode('flex')}>
              <span className="icbs-mode-art is-flex" aria-hidden>
                <span />
                <span />
              </span>
              Flexbox
            </button>
            <button type="button" className="icbs-mode" onClick={() => setMode('grid')}>
              <span className="icbs-mode-art is-grid" aria-hidden>
                <span />
                <span />
                <span />
                <span />
              </span>
              Grid
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" className="icbs-layout-back" aria-label="Back" onClick={() => setMode(null)}>
            ‹
          </button>
          <p className="icbs-layout-q">Select your structure</p>
          <div className="icbs-struct-row" role="group" aria-label={dotted ? 'Grid structures' : 'Flexbox structures'}>
            {PRESETS.map((layout) => {
              const on = activeLayout === layout
              const label = COLUMN_LAYOUT_META[layout].label
              return (
                <button
                  key={layout}
                  type="button"
                  className={`icbs-struct-btn${on ? ' is-on' : ''}`}
                  aria-label={label}
                  aria-pressed={on}
                  title={label}
                  onClick={() => onPick(mode, layout)}
                >
                  <StructureGlyph layout={layout} dotted={dotted} />
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
