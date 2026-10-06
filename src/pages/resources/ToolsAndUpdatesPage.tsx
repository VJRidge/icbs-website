import ResourcePageShell, { ResourceBookCta, ResourceFooterMeta } from './ResourcePageShell'
import { TOOL_SECTIONS } from './toolsCatalog'

export default function ToolsAndUpdatesPage() {
  return (
    <ResourcePageShell title="Tools & Updates">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/resources">Resources</a> / Tools &amp; Updates
      </nav>
      <p className="k o" style={{ marginTop: '1rem' }}>
        Tools &amp; updates
      </p>
      <h1>
        Tools by <mark>job</mark>
      </h1>
      <p className="resource-lede">
        Start with the work. Then choose the tool. A tool earns its place by helping with a job you actually have. This
        shelf explains what each tool does, where care is needed, and where to check the current documentation. It is a
        starting point, not a ranking or a list of subscriptions you need.
      </p>

      {TOOL_SECTIONS.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.tools.map((tool) => (
            <article key={tool.name} className="resource-tool">
              <p className="k o">{tool.category}</p>
              <h3>{tool.name}</h3>
              <p>
                <strong>The job:</strong> {tool.job}
              </p>
              <p>
                <strong>What it does:</strong> {tool.does}
              </p>
              <p>
                <strong>What to watch:</strong> {tool.watch}
              </p>
              <p>
                <strong>A useful first task:</strong> {tool.firstTask}
              </p>
              <p>
                <a href={tool.docsUrl} target="_blank" rel="noreferrer">
                  Official documentation →
                </a>
                {tool.extraUrl ? (
                  <>
                    {' · '}
                    <a href={tool.extraUrl} target="_blank" rel="noreferrer">
                      {tool.extraLabel || 'Related reference'} →
                    </a>
                  </>
                ) : null}
              </p>
              <p className="resource-meta" style={{ marginTop: '0.5rem' }}>
                Documentation reviewed {tool.reviewed}
              </p>
            </article>
          ))}
        </section>
      ))}

      <h2>What belongs on this shelf</h2>
      <p>
        The job comes first. Features, plans, and interfaces change. Follow the official links before making a decision
        that depends on current details. This page will carry dated revisions when its content changes; it does not
        promise a weekly or monthly publishing schedule.
      </p>

      <div className="resource-related">
        <p className="k o">Related</p>
        <p>
          <a href="/resources/builder-quick-reference">Builder Quick Reference</a>
          {' · '}
          <a href="/resources/templates">Templates</a>
          {' · '}
          <a href="/contact">Something changed? Let me know</a>
        </p>
        <ResourceBookCta />
      </div>
      <ResourceFooterMeta />
    </ResourcePageShell>
  )
}
