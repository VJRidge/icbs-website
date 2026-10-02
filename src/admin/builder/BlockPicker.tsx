import { useEffect, useRef, useState } from 'react'
import { MODULES, PICKER_CATEGORIES, type ModuleDef } from '../../cms/modules/registry'

const CATS = Object.keys(PICKER_CATEGORIES) as ModuleDef['category'][]

export default function BlockPicker({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<ModuleDef['category']>('Text')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    input.current?.focus()
  }, [])

  const search = q.trim().toLowerCase()
  const shown = search
    ? MODULES.filter((m) => m.label.toLowerCase().includes(search) || m.type.includes(search))
    : MODULES.filter((m) => (PICKER_CATEGORIES[cat] ?? []).includes(m.type))

  return (
    <div className="doc-modal" role="dialog" aria-label="Add block">
      <button type="button" className="doc-modal-bg" onClick={onClose} aria-label="Close" />
      <div className="doc-modal-card">
        <div className="doc-modal-search">
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search blocks…" />
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {!search ? (
          <div className="doc-chips">
            {CATS.map((c) => (
              <button key={c} type="button" className={c === cat ? 'on' : undefined} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        ) : null}
        <div className="doc-picker-grid">
          {shown.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => {
                onAdd(m.type)
                onClose()
              }}
            >
              <b>{m.label}</b>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
