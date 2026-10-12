import { useEffect, useId, useRef, useState } from 'react'
import ResourcePageShell, { ResourceBookCta, ResourceFooterMeta } from './ResourcePageShell'
import {
  EXPERIENCE_LABELS,
  TOOLS_PAGE_CONTENT,
  WORKING_STACK,
  findCategory,
  findToolLocation,
  formatReviewedLabel,
  hasActiveAffiliateLinks,
  jobQueryHref,
  parseJobQuery,
  visitUrlForTool,
  type ExperienceStatus,
  type ToolRecord,
} from './toolsPageModel'

function StatusBadge({ status }: { status: ExperienceStatus }) {
  const used = status === 'used-by-vj'
  return (
    <span className={`resource-tools-status${used ? ' is-used' : ''}`}>{EXPERIENCE_LABELS[status]}</span>
  )
}

function ExternalLink({
  href,
  children,
  sponsored,
  className = '',
}: {
  href: string
  children: string
  sponsored?: boolean
  className?: string
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel={sponsored ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
    >
      {children} →
    </a>
  )
}

export default function ToolsAndUpdatesPage() {
  const pickerId = useId()
  const pickerRef = useRef<HTMLLabelElement>(null)
  const [jobId, setJobId] = useState(() =>
    typeof window !== 'undefined' ? parseJobQuery(window.location.search) : 'builders',
  )
  const [openToolId, setOpenToolId] = useState<string | null>(null)
  const category = findCategory(jobId)
  const showAffiliateDisclosure = hasActiveAffiliateLinks()

  useEffect(() => {
    const onPop = () => {
      setJobId(parseJobQuery(window.location.search))
      setOpenToolId(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const selectJob = (nextJob: string, toolId?: string, opts?: { scrollToPicker?: boolean; scrollToTool?: boolean }) => {
    const next = findCategory(nextJob)
    setJobId(next.id)
    setOpenToolId(toolId ?? null)
    const href = jobQueryHref(next.id)
    window.history.replaceState({}, '', href)
    if (opts?.scrollToPicker) {
      pickerRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
    if (opts?.scrollToTool && toolId) {
      requestAnimationFrame(() => {
        document.getElementById(`tool-${toolId}`)?.scrollIntoView({ block: 'start', behavior: 'auto' })
      })
    }
  }

  const onStackJump = (toolId: string) => {
    const found = findToolLocation(toolId)
    if (!found) return
    selectJob(found.category.id, toolId, { scrollToTool: true })
  }

  const reviewedShelf = formatReviewedLabel(TOOLS_PAGE_CONTENT.reviewedAt)

  const hero = (
    <div className="resource-tools-hero-band">
      <div className="resource-tools-hero-inner">
        <nav aria-label="Breadcrumb" className="resource-tools-hero-crumb">
          <a href="/resources">Resources</a> / Tools &amp; Updates
        </nav>
        <div className="resource-tools-hero">
          <div>
            <h1>
              Tools by <mark>job</mark>
            </h1>
            <p className="resource-tools-hero-lede">
              Start with the work. Then choose the tool. Here are the tools I used, alongside other options worth
              comparing. Find the job you need to do, see the trade-offs, and check the official source before you
              commit.
            </p>
          </div>
            <aside className="resource-tools-note">
            <p>
              <strong>Not a shopping list.</strong> Links currently go to official sites. Alternatives are researched
              options, not claims that I have used every platform.
            </p>
            <p className="resource-tools-hero-meta">Documentation reviewed {reviewedShelf}</p>
          </aside>
        </div>
      </div>
    </div>
  )

  return (
    <ResourcePageShell title="Tools & Updates" hero={hero}>
      <div className="resource-tools">
        {showAffiliateDisclosure ? (
          <p className="resource-tools-affiliate">
            Some Visit links are sponsored referrals. Documentation and pricing links stay official.
          </p>
        ) : null}

        <section className="resource-tools-stack" aria-labelledby="working-stack-title">
          <div className="resource-tools-stack-head">
            <strong id="working-stack-title">My working stack</strong>
            <span>Current tools. Previous tools. Different jobs.</span>
          </div>
          <div className="resource-tools-stack-grid">
            {WORKING_STACK.map((item) => {
              const found = findToolLocation(item.toolId)
              if (!found) return null
              return (
                <a
                  key={item.toolId}
                  href={`#tool-${item.toolId}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onStackJump(item.toolId)
                  }}
                >
                  <strong>{found.tool.name}</strong>
                  <span>{item.blurb}</span>
                </a>
              )
            })}
          </div>
        </section>

        <details className="resource-tools-journey">
          <summary>
            <strong>My path:</strong> Lovable → Cursor (optional context)
          </summary>
          <p>
            Both can help build a complete app. Lovable bundles prompt, preview, and services. Cursor centers project
            files and development tools. Previously used: Lovable. Previously explored: Flutter (a framework, not an
            editor). Your path does not have to match mine.
          </p>
        </details>

        <label className="resource-tools-picker-label" htmlFor={pickerId} ref={pickerRef} id="job-picker">
          <span className="resource-tools-picker-caption">Compare tools for</span>
          <select
            id={pickerId}
            className="resource-tools-picker"
            value={category.id}
            onChange={(e) => selectJob(e.target.value, undefined, { scrollToPicker: true })}
          >
            {TOOLS_PAGE_CONTENT.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <section className="resource-tools-current" aria-live="polite">
          <h2>{category.title}</h2>
          <p className="resource-tools-intro">{category.intro}</p>
          <div className="resource-tools-decision">
            <strong>Decision guide:</strong> {category.decision}
          </div>
          {category.note ? <p className="resource-tools-context">{category.note}</p> : null}

          <div className="resource-tools-table-wrap">
            <table className="resource-tools-comparison">
              <thead>
                <tr>
                  <th scope="col">Tool</th>
                  <th scope="col">Consider it when</th>
                  <th scope="col">Useful features</th>
                  <th scope="col">Main trade-off</th>
                </tr>
              </thead>
              <tbody>
                {category.tools.map((tool) => (
                  <tr key={tool.id}>
                    <td>
                      <strong>{tool.name}</strong>
                      <StatusBadge status={tool.experienceStatus} />
                      {tool.comparisonRole === 'complement' ? (
                        <div className="resource-meta" style={{ marginTop: '0.35rem' }}>
                          Uses Git
                        </div>
                      ) : null}
                    </td>
                    <td data-label="Consider it when">{tool.bestFit}</td>
                    <td data-label="Useful features">{tool.features.slice(0, 2).join('; ')}</td>
                    <td data-label="Main trade-off">{tool.cons[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="resource-tools-closer">A closer look</h3>
          {category.tools.map((tool) => (
            <ToolDetail
              key={tool.id}
              tool={tool}
              open={openToolId === tool.id}
              onToggle={() => setOpenToolId((id) => (id === tool.id ? null : tool.id))}
            />
          ))}
        </section>

        <div className="resource-tools-bottom">
          <section>
            <h2>What changed on this shelf</h2>
            <p>Dated notes when the information changes. No promised publishing schedule.</p>
            <div className="resource-tools-updates">
              {TOOLS_PAGE_CONTENT.updates.map((u) => (
                <article key={u.title} className="resource-tools-update">
                  <p className="resource-meta" style={{ marginTop: 0 }}>
                    {formatReviewedLabel(u.date)}
                  </p>
                  <strong>{u.title}</strong>
                  <p>
                    {u.body}{' '}
                    <ExternalLink href={u.source}>Source</ExternalLink>
                  </p>
                </article>
              ))}
            </div>
          </section>
          <aside className="resource-tools-buy">
            <h2>Before you pay</h2>
            <p>
              Try one small task first. Check plan limits, what gets sent to a model provider, who can access your data,
              and whether you can take your project elsewhere.
            </p>
          </aside>
        </div>

        <div className="resource-related">
          <p>
            <a href="/resources/builder-quick-reference">Builder Quick Reference</a>
            {' · '}
            <a href="/resources/templates">Templates</a>
            {' · '}
            <a href="/contact">Something changed? Let me know</a>
          </p>
        </div>

        <aside className="resource-tools-book-offer">
          <div>
            <h2>The tools are only part of the build.</h2>
            <p>
              <em>I Call BS</em> puts the workflow around them: clearer requests, better checks, and receipts you can
              return to.
            </p>
          </div>
          <ResourceBookCta large />
        </aside>

        <ResourceFooterMeta />
      </div>
    </ResourcePageShell>
  )
}

function ToolDetail({
  tool,
  open,
  onToggle,
}: {
  tool: ToolRecord
  open: boolean
  onToggle: () => void
}) {
  const visit = visitUrlForTool(tool)
  return (
    <details className="resource-tools-detail" id={`tool-${tool.id}`} open={open}>
      <summary
        onClick={(e) => {
          e.preventDefault()
          onToggle()
        }}
      >
        <div>
          <div className="resource-tools-detail-title">
            <h3>{tool.name}</h3>
            <StatusBadge status={tool.experienceStatus} />
          </div>
          <p>{tool.summary}</p>
        </div>
        <span className="resource-tools-sign" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </summary>
      {open ? (
        <div className="resource-tools-detail-body">
          <div className="resource-tools-cols">
            <div>
              <h4>Features</h4>
              <ul>
                {tool.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Pros</h4>
              <ul>
                {tool.pros.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Cons / Care needed</h4>
              <ul>
                {tool.cons.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <p>
            <strong>A useful first task:</strong> {tool.firstTask}
          </p>
          <p>
            <strong>Cost structure:</strong> {tool.costNote}
          </p>
          <p className="resource-tools-links">
            <ExternalLink href={visit.href} sponsored={visit.sponsored} className="resource-tools-visit">
              {`Visit ${tool.name}`}
            </ExternalLink>
            {' · '}
            <ExternalLink href={tool.docsUrl}>Official docs</ExternalLink>
            {tool.pricingUrl ? (
              <>
                {' · '}
                <ExternalLink href={tool.pricingUrl}>Current pricing</ExternalLink>
              </>
            ) : null}
          </p>
          <p className="resource-meta">Documentation reviewed {formatReviewedLabel(tool.reviewedAt)}</p>
          <p className="resource-tools-editorial">
            Best-fit advice and trade-offs are editorial guidance based on documentation, not a hands-on benchmark.
          </p>
        </div>
      ) : null}
    </details>
  )
}
