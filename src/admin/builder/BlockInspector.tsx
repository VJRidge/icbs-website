import { getModule } from '../../cms/modules/registry'
import { updateNodeProps, type BuilderDocument, type BuilderNode } from '../../cms/document'

export default function BlockInspector({
  document,
  selected,
  onChange,
}: {
  document: BuilderDocument
  selected: BuilderNode | null
  onChange: (doc: BuilderDocument) => void
}) {
  const def = selected ? getModule(selected.type) : undefined
  if (!selected || !def) {
    return (
      <div className="doc-insp-empty">
        <p>No block selected</p>
        <span>Click a block in the canvas to edit it here — or use + Add block.</span>
      </div>
    )
  }

  function set(key: string, value: string) {
    onChange({ ...document, nodes: updateNodeProps(document.nodes, selected!.id, { [key]: value }) })
  }

  const styleFields = def.fields.filter((f) => f.key === 'align' || f.key === 'color' || f.key === 'level' || f.key === 'height')
  const contentFields = def.fields.filter((f) => !styleFields.includes(f))

  return (
    <div className="doc-insp">
      <p className="bb-kind">{def.label}</p>
      <p className="ad-empty">{def.hint}</p>
      {contentFields.length === 0 ? <p className="ad-empty">Edit this block in the center canvas.</p> : null}
      {contentFields.map((field) => (
        <label key={field.key}>
          {field.label}
          {field.kind === 'textarea' ? (
            <textarea rows={5} value={String(selected.props[field.key] ?? '')} onChange={(e) => set(field.key, e.target.value)} />
          ) : field.kind === 'select' && field.options ? (
            <select value={String(selected.props[field.key] ?? '')} onChange={(e) => set(field.key, e.target.value)}>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input value={String(selected.props[field.key] ?? '')} onChange={(e) => set(field.key, e.target.value)} />
          )}
        </label>
      ))}
      {styleFields.length > 0 ? (
        <>
          <h3>Style</h3>
          {styleFields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.kind === 'select' && field.options ? (
                <select value={String(selected.props[field.key] ?? '')} onChange={(e) => set(field.key, e.target.value)}>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={String(selected.props[field.key] ?? '')} onChange={(e) => set(field.key, e.target.value)} />
              )}
            </label>
          ))}
        </>
      ) : null}
    </div>
  )
}
