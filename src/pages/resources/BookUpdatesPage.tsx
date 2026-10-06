import ResourcePageShell, { ResourceFooterMeta } from './ResourcePageShell'
import { BOOK_UPDATE_ENTRIES } from './bookUpdates'

/** Published book companion notes. Empty until real correction entries exist. */
export default function BookUpdatesPage() {
  const entries = BOOK_UPDATE_ENTRIES

  return (
    <ResourcePageShell title="Book Updates & Corrections">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/products/i-call-bs">I Call BS</a> / Updates
      </nav>
      <p className="k o" style={{ marginTop: '1rem' }}>
        I Call BS companion resource
      </p>
      <h1>Book updates &amp; corrections</h1>
      <p className="resource-lede">
        A place to keep the reference useful as the work changes. This page records published corrections to{' '}
        <em>I Call BS</em>, changed resource links, and significant updates that affect its examples. Each entry
        identifies what changed and where it belongs.
      </p>
      <p>
        The book remains a record of the experience behind it. Tool documentation and interfaces can move on; dated
        notes here will help distinguish a correction from a later change.
      </p>

      <h2>Published notes</h2>
      {entries.length === 0 ? (
        <div className="resource-empty">
          <p className="k o">Published notes</p>
          <p>No updates or corrections have been published here yet.</p>
          <p className="resource-meta" style={{ marginTop: '0.75rem' }}>
            This describes this page’s collection only — not a claim that the book was audited or is error-free.
          </p>
        </div>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="resource-card">
              <p className="k o">
                {entry.type} · {entry.publishedAt}
              </p>
              <h3 style={{ marginTop: 0 }}>{entry.title}</h3>
              <p>{entry.summary}</p>
              {entry.readerAction ? <p><strong>Reader action:</strong> {entry.readerAction}</p> : null}
            </li>
          ))}
        </ul>
      )}

      <h2>Found something to flag?</h2>
      <p>
        Tell me the chapter or page, the passage or link, and what you noticed. If a tool has changed, an official
        documentation link is helpful. Please leave out passwords, API keys, and private project data.
      </p>
      <div className="resource-actions">
        <a className="btn" href="/contact">
          Report a book issue
        </a>
      </div>

      <div className="resource-related">
        <p className="k o">Keep exploring</p>
        <p>
          <a href="/resources/builder-quick-reference">Builder Quick Reference</a>
          {' · '}
          <a href="/resources/tools-and-updates">Tools &amp; Updates</a>
          {' · '}
          <a href="/resources/templates">Templates</a>
          {' · '}
          <a href="/products/i-call-bs">View the complete book</a>
        </p>
      </div>
      <ResourceFooterMeta />
    </ResourcePageShell>
  )
}
