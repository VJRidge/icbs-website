import SignupForm from '../../components/SignupForm'
import Footer from '../../components/Footer'
import { getModule } from '../modules/registry'
import { sanitizeHtml, type BuilderDocument, type BuilderNode } from '../document'

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
    const Tag = str(node.props, 'level', 'h2') === 'h3' ? 'h3' : 'h2'
    return <Tag className="cms-h">{str(node.props, 'text') || 'Heading'}</Tag>
  }
  if (node.type === 'paragraph' || node.type === 'text' || node.type === 'richText') {
    const html = str(node.props, 'html') || str(node.props, 'text')
    const align = str(node.props, 'align', 'left')
    const color = str(node.props, 'color')
    if (!html.trim()) return null
    if (html.includes('<')) {
      return (
        <div
          className="cms-p"
          style={{ textAlign: align as 'left', color: color || undefined }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
      )
    }
    return (
      <p className="cms-p" style={{ textAlign: align as 'left', color: color || undefined, whiteSpace: 'pre-wrap' }}>
        {html}
      </p>
    )
  }
  if (node.type === 'quote') {
    return (
      <blockquote className="cms-quote">
        {str(node.props, 'text')}
        {str(node.props, 'cite') ? <cite>{str(node.props, 'cite')}</cite> : null}
      </blockquote>
    )
  }
  if (node.type === 'callout') {
    return <aside className="cms-callout">{str(node.props, 'text')}</aside>
  }
  if (node.type === 'button') {
    return (
      <p>
        <a className="btn cms-btn" href={str(node.props, 'href', '/free')}>
          {str(node.props, 'label', 'Button')}
        </a>
      </p>
    )
  }
  if (node.type === 'cta') {
    return (
      <div className="cms-cta">
        {str(node.props, 'heading') ? <h2 className="cms-h">{str(node.props, 'heading')}</h2> : null}
        {str(node.props, 'text') ? <p className="cms-p">{str(node.props, 'text')}</p> : null}
        <a className="btn cms-btn" href={str(node.props, 'buttonHref', '/free')}>
          {str(node.props, 'buttonLabel', 'Continue')}
        </a>
      </div>
    )
  }
  if (node.type === 'image') {
    const src = str(node.props, 'src')
    if (!src) return null
    return <img className="cms-img" src={src} alt={str(node.props, 'alt')} />
  }
  if (node.type === 'divider') return <hr className="cms-hr" />
  if (node.type === 'spacer') {
    const h = Number(str(node.props, 'height', '32')) || 32
    return <div style={{ height: h }} aria-hidden />
  }
  if (node.type === 'kitSignup') return <SignupForm id={node.id.slice(0, 8)} />
  return <p className="cms-p">Unknown block: {getModule(node.type)?.label ?? node.type}</p>
}

export default function RenderDocument({ title, document, withFooter = true }: { title: string; document: BuilderDocument; withFooter?: boolean }) {
  const hasSections = document.nodes.some((n) => n.type === 'section')
  return (
    <main className={hasSections ? undefined : 'cms-article'}>
      {hasSections ? (
        document.nodes.map((node) => <RenderNode key={node.id} node={node} />)
      ) : (
        <article className="cms-sheet">
          <h1 className="cms-title">{document.title || title}</h1>
          {document.nodes.length === 0 ? <p className="cms-p">This page has no blocks yet.</p> : null}
          {document.nodes.map((node) => (
            <RenderNode key={node.id} node={node} />
          ))}
        </article>
      )}
      {withFooter ? <Footer /> : null}
    </main>
  )
}
