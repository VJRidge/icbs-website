import ResourcePageShell, { ResourceBookCta, ResourceFooterMeta } from './ResourcePageShell'

const BASE = '/downloads/resources'

export default function TemplatesPage() {
  return (
    <ResourcePageShell title="Templates">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/resources">Resources</a> / Templates
      </nav>
      <p className="k o" style={{ marginTop: '1rem' }}>
        Free editable resources
      </p>
      <h1>Templates for the work in front of you</h1>
      <p className="resource-lede">
        A little structure can save a lot of re-explaining. These starters help you name the next task, protect working
        behavior, and record what you checked. Make them yours before putting them to work. No email signup required.
      </p>

      <article className="resource-card">
        <p className="k o">Markdown</p>
        <h2 style={{ marginTop: 0 }}>ROADMAP starter</h2>
        <p>
          Keep done, next, and blocked in one place. Record the current outcome, important decisions, and the next safe
          step so a new session can pick up with useful context.
        </p>
        <div className="resource-actions">
          <a className="btn" href={`${BASE}/ROADMAP-starter.md`} download>
            Download Markdown
          </a>
          <a className="btn line" href={`${BASE}/examples/ROADMAP-example.md`} download>
            View example
          </a>
        </div>
        <p className="resource-meta" style={{ marginTop: 0 }}>
          The filled example is fictional and labeled for illustration only.
        </p>
      </article>

      <article className="resource-card">
        <p className="k o">Markdown</p>
        <h2 style={{ marginTop: 0 }}>Project Rules starter</h2>
        <p>
          Set the boundaries before an agent edits your project. Identify scope, protected flows, evidence requirements,
          and the instructions already in place. Merge this guidance with existing instructions — it is a starter to
          adapt, not a replacement for your project’s rules or permissions.
        </p>
        <div className="resource-actions">
          <a className="btn" href={`${BASE}/PROJECT-RULES-starter.md`} download>
            Download Markdown
          </a>
          <a className="btn line" href={`${BASE}/examples/PROJECT-RULES-example.md`} download>
            View example
          </a>
        </div>
        <p className="resource-meta" style={{ marginTop: 0 }}>
          The filled example is fictional and labeled for illustration only.
        </p>
      </article>

      <article className="resource-card">
        <p className="k o">Markdown + PDF</p>
        <h2 style={{ marginTop: 0 }}>Before You Accept Done</h2>
        <p>
          A claim of completion deserves a check. Use this worksheet to record the expected result, the path you tried,
          related behavior, and what remains unverified.
        </p>
        <div className="resource-actions">
          <a className="btn" href={`${BASE}/BEFORE-YOU-ACCEPT-DONE.md`} download>
            Download Markdown
          </a>
          <a className="btn line" href={`${BASE}/Before_You_Accept_Done.pdf`} download>
            Download PDF
          </a>
        </div>
      </article>

      <h2>Make the starter yours</h2>
      <ol>
        <li>Download the file that solves today’s problem.</li>
        <li>Fill it in for one task on your project.</li>
        <li>Use it, then update it when the work changes.</li>
      </ol>

      <div className="resource-related">
        <p className="k o">Related</p>
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
