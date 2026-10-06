import { useEffect, type ReactNode } from 'react'
import Footer from '../../components/Footer'
import SiteHeader from '../../components/SiteHeader'
import './resources.css'

export default function ResourcePageShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    document.title = `${title} · VettaJimale.Tech`
  }, [title])

  return (
    <main className="resource-page">
      <SiteHeader />
      <article className="sec white resource-article">
        <div className="wrap resource-wrap">{children}</div>
      </article>
      <Footer />
    </main>
  )
}

export function ResourceFooterMeta() {
  return (
    <p className="resource-meta">
      Version 1.0 · Reviewed October 2026 · <a href="/contact">Report an issue</a>
    </p>
  )
}

export function ResourceBookCta() {
  return (
    <p className="resource-book-cta">
      <a className="btn" href="/products/i-call-bs" style={{ width: 'auto', display: 'inline-block' }}>
        Explore the complete book — $17
      </a>
    </p>
  )
}
