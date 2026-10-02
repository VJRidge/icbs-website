import SignupForm from '../../components/SignupForm'
import Footer from '../../components/Footer'
import { getModule } from '../modules/registry'
import type { BuilderDocument, BuilderNode } from '../document'

function str(props: Record<string, unknown>, key: string, fallback = '') {
  const v = props[key]
  return typeof v === 'string' ? v : fallback
}

export function RenderNode({ node }: { node: BuilderNode }) {
  const tone = str(node.props, 'tone', 'cream')
  if (node.type === 'section') {
    return (
      <section className={`sec ${tone}`}>
        <div className="wrap">
          {(node.children ?? []).map((child) => (
            <RenderNode key={child.id} node={child} />
          ))}
        </div>
      </section>
    )
  }
  if (node.type === 'heading') {
    const Tag = str(node.props, 'level', 'h2') === 'h1' ? 'h1' : 'h2'
    const eyebrow = str(node.props, 'eyebrow')
    return (
      <div>
        {eyebrow ? <div className="k o">{eyebrow}</div> : null}
        <Tag className={Tag === 'h1' ? 'an' : undefined}>{str(node.props, 'text', 'Heading')}</Tag>
      </div>
    )
  }
  if (node.type === 'text') {
    const text = str(node.props, 'text')
    return (
      <>
        {text.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="lede" style={{ whiteSpace: 'pre-wrap' }}>
            {para}
          </p>
        ))}
      </>
    )
  }
  if (node.type === 'quote') {
    return (
      <blockquote className="lede" style={{ borderLeft: '4px solid var(--o)', paddingLeft: 18, fontStyle: 'italic' }}>
        {str(node.props, 'text')}
        {str(node.props, 'cite') ? <cite style={{ display: 'block', fontStyle: 'normal', marginTop: 8 }}>{str(node.props, 'cite')}</cite> : null}
      </blockquote>
    )
  }
  if (node.type === 'button') {
    return (
      <p>
        <a className="btn" href={str(node.props, 'href', '/free')} style={{ display: 'inline-block', width: 'auto', paddingInline: 28 }}>
          {str(node.props, 'label', 'Button')}
        </a>
      </p>
    )
  }
  if (node.type === 'cta') {
    return (
      <div>
        <h2>{str(node.props, 'heading')}</h2>
        <p className="lede">{str(node.props, 'text')}</p>
        <a className="btn" href={str(node.props, 'buttonHref', '/free')} style={{ display: 'inline-block', width: 'auto', paddingInline: 28 }}>
          {str(node.props, 'buttonLabel', 'Continue')}
        </a>
      </div>
    )
  }
  if (node.type === 'image') {
    const src = str(node.props, 'src')
    if (!src) return null
    return <img src={src} alt={str(node.props, 'alt')} style={{ maxWidth: 480, margin: '12px 0' }} />
  }
  if (node.type === 'divider') {
    return <hr style={{ border: 0, borderTop: '2px solid currentColor', opacity: 0.25, margin: '28px 0' }} />
  }
  if (node.type === 'spacer') {
    const h = Number(str(node.props, 'height', '48')) || 48
    return <div style={{ height: h }} aria-hidden />
  }
  if (node.type === 'kitSignup') {
    return <SignupForm id={node.id.slice(0, 8)} />
  }
  const label = getModule(node.type)?.label ?? node.type
  return <p className="lede">Unknown module: {label}</p>
}

export default function RenderDocument({ title, document, withFooter = true }: { title: string; document: BuilderDocument; withFooter?: boolean }) {
  return (
    <main>
      {document.nodes.length === 0 ? (
        <section className="sec cream">
          <div className="wrap">
            <h2>{document.title || title}</h2>
            <p className="lede">This page has no modules yet.</p>
          </div>
        </section>
      ) : (
        document.nodes.map((node) => <RenderNode key={node.id} node={node} />)
      )}
      {withFooter ? <Footer /> : null}
    </main>
  )
}
