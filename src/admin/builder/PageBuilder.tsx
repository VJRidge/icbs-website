import { useEffect, useRef, useState } from 'react'
import {
  createModuleNode,
  getModule,
} from '../../cms/modules/registry'
import {
  duplicateNode,
  findNode,
  insertNode,
  moveNode,
  removeNode,
  updateNodeProps,
  type BuilderDocument,
  type BuilderNode,
} from '../../cms/document'
import BlockPicker from './BlockPicker'
import FormatToolbar from './FormatToolbar'
import MediaPicker from './MediaPicker'

export default function PageBuilder({
  document,
  onChange,
  selectedId,
  onSelect,
}: {
  document: BuilderDocument
  onChange: (doc: BuilderDocument) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [picker, setPicker] = useState<string | null | false>(false)
  const selected = selectedId ? findNode(document.nodes, selectedId) : null

  function setNodes(nodes: BuilderNode[], keep?: string | null) {
    onChange({ ...document, nodes })
    if (keep !== undefined) onSelect(keep)
  }

  function addType(type: string, afterId: string | null) {
    const node = createModuleNode(type)
    setNodes(insertNode(document.nodes, null, node, afterId), node.id)
  }

  function runFormat(cmd: string, value?: string) {
    window.document.execCommand(cmd, false, value)
    const el = window.document.querySelector(`[data-block="${selectedId}"] .doc-edit`) as HTMLElement | null
    if (el && selectedId) setNodes(updateNodeProps(document.nodes, selectedId, { html: el.innerHTML }))
  }

  return (
    <div className="doc-canvas" onClick={() => onSelect(null)}>
      <FormatToolbar enabled={selected?.type === 'paragraph'} onCommand={runFormat} />
      {document.nodes.length === 0 ? (
        <button
          type="button"
          className="doc-empty"
          onClick={(e) => {
            e.stopPropagation()
            setPicker(null)
          }}
        >
          <b>Start building this page</b>
          <span>Add a paragraph, heading, image, or the kit signup.</span>
        </button>
      ) : (
        document.nodes.map((node) => (
          <CanvasBlock
            key={node.id}
            node={node}
            selected={node.id === selectedId}
            onSelect={() => onSelect(node.id)}
            onChange={(props) => setNodes(updateNodeProps(document.nodes, node.id, props))}
            onUp={() => setNodes(moveNode(document.nodes, node.id, -1))}
            onDown={() => setNodes(moveNode(document.nodes, node.id, 1))}
            onDup={() => setNodes(duplicateNode(document.nodes, node.id))}
            onDelete={() => setNodes(removeNode(document.nodes, node.id), null)}
            onAddAfter={() => setPicker(node.id)}
          />
        ))
      )}
      {document.nodes.length > 0 ? (
        <button
          type="button"
          className="doc-add"
          onClick={(e) => {
            e.stopPropagation()
            setPicker(null)
          }}
        >
          + Add block
        </button>
      ) : null}
      {picker !== false ? (
        <BlockPicker
          onAdd={(type) => addType(type, typeof picker === 'string' ? picker : null)}
          onClose={() => setPicker(false)}
        />
      ) : null}
    </div>
  )
}

function CanvasBlock({
  node,
  selected,
  onSelect,
  onChange,
  onUp,
  onDown,
  onDup,
  onDelete,
  onAddAfter,
}: {
  node: BuilderNode
  selected: boolean
  onSelect: () => void
  onChange: (props: Record<string, unknown>) => void
  onUp: () => void
  onDown: () => void
  onDup: () => void
  onDelete: () => void
  onAddAfter: () => void
}) {
  const label = getModule(node.type)?.label ?? node.type
  return (
    <div
      data-block={node.id}
      className={`doc-block${selected ? ' on' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div className="doc-block-bar">
        <span>{label}</span>
        <div>
          <button type="button" onClick={onAddAfter} title="Insert after">
            +
          </button>
          <button type="button" onClick={onUp} title="Move up">
            ↑
          </button>
          <button type="button" onClick={onDown} title="Move down">
            ↓
          </button>
          <button type="button" onClick={onDup} title="Duplicate">
            Copy
          </button>
          <button type="button" onClick={onDelete} title="Delete">
            Delete
          </button>
        </div>
      </div>
      <BlockBody node={node} onChange={onChange} />
    </div>
  )
}

function BlockBody({ node, onChange }: { node: BuilderNode; onChange: (props: Record<string, unknown>) => void }) {
  const [pick, setPick] = useState(false)
  const html = String(node.props.html ?? node.props.text ?? '')
  const edit = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (node.type !== 'paragraph' || !edit.current) return
    if (document.activeElement === edit.current) return
    if (edit.current.innerHTML !== html) edit.current.innerHTML = html || ''
  }, [html, node.type])

  if (node.type === 'paragraph') {
    return (
      <div
        ref={edit}
        className="doc-edit cms-p"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Start writing…"
        style={{ textAlign: (String(node.props.align || 'left') as 'left') , color: String(node.props.color || '') || undefined }}
        onInput={(e) => onChange({ html: (e.currentTarget as HTMLDivElement).innerHTML })}
      />
    )
  }
  if (node.type === 'heading') {
    const Tag = String(node.props.level || 'h2') === 'h3' ? 'h3' : 'h2'
    return (
      <input
        className={`doc-ghost cms-h ${Tag}`}
        value={String(node.props.text ?? '')}
        placeholder="Heading"
        onChange={(e) => onChange({ text: e.target.value })}
      />
    )
  }
  if (node.type === 'quote') {
    return (
      <blockquote className="cms-quote">
        <textarea placeholder="Quote" value={String(node.props.text ?? '')} onChange={(e) => onChange({ text: e.target.value })} />
        <input placeholder="Citation" value={String(node.props.cite ?? '')} onChange={(e) => onChange({ cite: e.target.value })} />
      </blockquote>
    )
  }
  if (node.type === 'callout') {
    return (
      <aside className="cms-callout">
        <textarea placeholder="Callout" value={String(node.props.text ?? '')} onChange={(e) => onChange({ text: e.target.value })} />
      </aside>
    )
  }
  if (node.type === 'image') {
    const src = String(node.props.src ?? '')
    return (
      <div>
        {src ? <img className="cms-img" src={src} alt={String(node.props.alt ?? '')} /> : <p className="ad-empty">No image yet.</p>}
        <div className="doc-inline-fields">
          <input placeholder="Image URL" value={src} onChange={(e) => onChange({ src: e.target.value })} />
          <input placeholder="Alt text" value={String(node.props.alt ?? '')} onChange={(e) => onChange({ alt: e.target.value })} />
          <button type="button" onClick={() => setPick(true)}>
            Media library
          </button>
        </div>
        {pick ? (
          <MediaPicker
            onPick={(url, alt) => {
              onChange({ src: url, alt: String(node.props.alt || alt) })
              setPick(false)
            }}
            onClose={() => setPick(false)}
          />
        ) : null}
      </div>
    )
  }
  if (node.type === 'button') {
    return (
      <div className="doc-inline-fields">
        <input placeholder="Label" value={String(node.props.label ?? '')} onChange={(e) => onChange({ label: e.target.value })} />
        <input placeholder="/free" value={String(node.props.href ?? '')} onChange={(e) => onChange({ href: e.target.value })} />
        <a className="btn cms-btn" href={String(node.props.href || '/free')} onClick={(e) => e.preventDefault()}>
          {String(node.props.label || 'Button')}
        </a>
      </div>
    )
  }
  if (node.type === 'cta') {
    return (
      <div className="cms-cta">
        <input className="doc-ghost cms-h" placeholder="Heading" value={String(node.props.heading ?? '')} onChange={(e) => onChange({ heading: e.target.value })} />
        <textarea placeholder="Copy" value={String(node.props.text ?? '')} onChange={(e) => onChange({ text: e.target.value })} />
        <div className="doc-inline-fields">
          <input placeholder="Button label" value={String(node.props.buttonLabel ?? '')} onChange={(e) => onChange({ buttonLabel: e.target.value })} />
          <input placeholder="Button link" value={String(node.props.buttonHref ?? '')} onChange={(e) => onChange({ buttonHref: e.target.value })} />
        </div>
      </div>
    )
  }
  if (node.type === 'divider') return <hr className="cms-hr" />
  if (node.type === 'spacer') return <div className="doc-spacer" style={{ height: Number(node.props.height || 32) }} />
  if (node.type === 'kitSignup') return <p className="ad-empty">Kit signup form will show on the published page.</p>
  return <p className="ad-empty">{node.type}</p>
}
