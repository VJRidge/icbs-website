import { openBlankFormPreview, type BlankFormPreviewId } from '../../lib/resources/blankFormPreview'
import ResourcePageShell, { ResourceBookCta, ResourceFooterMeta } from './ResourcePageShell'

function DocIcon() {
  return (
    <svg
      className="resource-doc-icon"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

const items: {
  num: string
  format: string
  title: string
  body: string
  formHref: string
  previewId: BlankFormPreviewId
}[] = [
  {
    num: '01',
    format: 'Fillable form',
    title: 'ROADMAP',
    body: 'Keep done, next, and blocked in one place. Record the current outcome, important decisions, and the next safe step so a new session can pick up with useful context.',
    formHref: '/resources/templates/roadmap',
    previewId: 'roadmap',
  },
  {
    num: '02',
    format: 'Fillable form',
    title: 'Project Rules',
    body: 'Set the boundaries before an agent edits your project. Identify scope, protected flows, evidence requirements, and the instructions already in place.',
    formHref: '/resources/templates/project-rules',
    previewId: 'project-rules',
  },
  {
    num: '03',
    format: 'Fillable checklist',
    title: 'Before You Accept Done',
    body: 'A claim of completion deserves a check. Record the expected result, the path you tried, related behavior, and what remains unverified.',
    formHref: '/resources/templates/before-you-accept-done',
    previewId: 'before-you-accept-done',
  },
]

export default function TemplatesPage() {
  return (
    <ResourcePageShell title="Templates">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/resources">Resources</a> / Templates
      </nav>
      <h1>Templates for the work in front of you</h1>
      <p className="resource-lede">
        Fill these forms for your own project. View sample opens a blank PDF of the form layout. After you fill a form,
        choose Markdown or PDF download. No email signup required.
      </p>

      <ol className="resource-template-list">
        {items.map((item) => (
          <li key={item.num} className="resource-template-item">
            <div className="resource-template-num" aria-hidden>
              {item.num}
            </div>
            <div className="resource-template-body">
              <div className="resource-template-head">
                <DocIcon />
                <p className="resource-format-tag">{item.format}</p>
              </div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <div className="resource-actions">
                <a className="btn" href={item.formHref}>
                  Fill template
                </a>
                <button type="button" className="btn line" onClick={() => openBlankFormPreview(item.previewId)}>
                  View sample
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="resource-related">
        <p>
          <a href="/resources/builder-quick-reference">Builder Quick Reference</a>
          {' · '}
          <a href="/resources/tools-and-updates">Tools &amp; Updates</a>
          {' · '}
          <a href="/resources">All resources</a>
        </p>
        <p>These are free companion starters. The complete book contains additional workflows, examples, and prompts.</p>
        <ResourceBookCta />
      </div>
      <ResourceFooterMeta />
    </ResourcePageShell>
  )
}
