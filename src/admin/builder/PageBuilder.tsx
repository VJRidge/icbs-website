import { useMemo, useState } from 'react'
import { RenderNode } from '../../cms/render/RenderDocument'
import { MODULES, createModuleNode, getModule } from '../../cms/modules/registry'
import {
  duplicateNode,
  findNode,
  findParent,
  insertNode,
  moveNode,
  removeNode,
  updateNodeProps,
  type BuilderDocument,
  type BuilderNode,
} from '../../cms/document'

const CATS = ['Layout', 'Content', 'Media', 'Lead gen'] as const

function flatten(nodes: BuilderNode[], depth = 0): { node: BuilderNode; depth: number }[] {
  const out: { node: BuilderNode; depth: number }[] = []
  for (const node of nodes) {
    out.push({ node, depth })
    if (node.children) out.push(...flatten(node.children, depth + 1))
  }
  return out
}

export default function PageBuilder({
  document,
  onChange,
}: {
  document: BuilderDocument
  onChange: (doc: BuilderDocument) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? findNode(document.nodes, selectedId) : null
  const def = selected ? getModule(selected.type) : undefined
  const structure = useMemo(() => flatten(document.nodes), [document.nodes])

  function setNodes(nodes: BuilderNode[], keepId?: string | null) {
    onChange({ ...document, nodes })
    if (keepId !== undefined) setSelectedId(keepId)
  }

  function addModule(type: string) {
    const node = createModuleNode(type)
    const sel = selectedId ? findNode(document.nodes, selectedId) : null
    if (type === 'section') {
      setNodes(insertNode(document.nodes, null, node, selected?.type === 'section' ? selected.id : null), node.id)
      return
    }
    if (sel?.type === 'section') {
      setNodes(insertNode(document.nodes, sel.id, node), node.id)
      return
    }
    const parent = selectedId ? findParent(document.nodes, selectedId) : null
    if (parent?.type === 'section') {
      setNodes(insertNode(document.nodes, parent.id, node, selectedId), node.id)
      return
    }
    if (document.nodes.length === 0 || !sel) {
      const section = createModuleNode('section')
      section.children = [node]
      setNodes([...document.nodes, section], node.id)
      return
    }
    setNodes(insertNode(document.nodes, null, node, selectedId), node.id)
  }

  return (
    <div className="bb">
      <aside className="bb-lib" aria-label="Modules">
        <h2>Modules</h2>
        <p>Click a module to add it. Select a section first to drop inside it.</p>
        {CATS.map((cat) => (
          <div key={cat}>
            <h3>{cat}</h3>
            {MODULES.filter((m) => m.category === cat).map((m) => (
              <button key={m.type} type="button" className="bb-widget" onClick={() => addModule(m.type)} title={m.hint}>
                <b>{m.label}</b>
                <span>{m.hint}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <div className="bb-canvas">
        {document.nodes.length === 0 ? (
          <div className="bb-empty">
            <p>This page is empty.</p>
            <p>Add a Section, then Heading and Text — or click any module and we will create a section for you.</p>
          </div>
        ) : (
          document.nodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))
        )}
      </div>

      <aside className="bb-insp" aria-label="Editor">
        <h2>Editor</h2>
        {selected && def ? (
          <>
            <p className="bb-kind">{def.label}</p>
            {def.fields.length === 0 ? <p className="ad-empty">This module has no settings.</p> : null}
            {def.fields.map((field) => {
              const value = String(selected.props[field.key] ?? '')
              const set = (v: string) => setNodes(updateNodeProps(document.nodes, selected.id, { [field.key]: v }))
              return (
                <label key={field.key}>
                  {field.label}
                  {field.kind === 'textarea' ? (
                    <textarea rows={6} value={value} onChange={(e) => set(e.target.value)} />
                  ) : field.kind === 'select' && field.options ? (
                    <select value={value} onChange={(e) => set(e.target.value)}>
                      {field.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={value} onChange={(e) => set(e.target.value)} />
                  )}
                </label>
              )
            })}
            <div className="bb-actions">
              <button type="button" onClick={() => setNodes(moveNode(document.nodes, selected.id, -1))}>
                Up
              </button>
              <button type="button" onClick={() => setNodes(moveNode(document.nodes, selected.id, 1))}>
                Down
              </button>
              <button type="button" onClick={() => setNodes(duplicateNode(document.nodes, selected.id))}>
                Duplicate
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setNodes(removeNode(document.nodes, selected.id), null)
                }}
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <p className="ad-empty">Select a module on the canvas, or add one from the left.</p>
        )}
        {structure.length > 0 ? (
          <div className="bb-tree">
            <h3>Structure</h3>
            {structure.map(({ node, depth }) => (
              <button
                key={node.id}
                type="button"
                className={node.id === selectedId ? 'on' : undefined}
                style={{ paddingLeft: 8 + depth * 12 }}
                onClick={() => setSelectedId(node.id)}
              >
                {getModule(node.type)?.label ?? node.type}
              </button>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  )
}

function CanvasNode({
  node,
  selectedId,
  onSelect,
}: {
  node: BuilderNode
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const on = node.id === selectedId
  const label = getModule(node.type)?.label ?? node.type
  return (
    <div
      className={`bb-block${on ? ' on' : ''}${node.type === 'section' ? ' is-section' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
    >
      <span className="bb-handle">{label}</span>
      <div className="bb-preview">
        {node.type === 'section' ? (
          <section className={`sec ${String(node.props.tone || 'cream')}`}>
            <div className="wrap">
              {(node.children ?? []).length === 0 ? (
                <p className="lede" style={{ opacity: 0.55 }}>
                  Empty section — click a module on the left to add it here.
                </p>
              ) : (
                (node.children ?? []).map((child) => (
                  <CanvasNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
                ))
              )}
            </div>
          </section>
        ) : (
          <RenderNode node={node} />
        )}
      </div>
    </div>
  )
}
