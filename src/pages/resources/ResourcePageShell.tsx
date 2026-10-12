import { useEffect, type ReactNode } from 'react'
import Footer from '../../components/Footer'
import SiteHeader from '../../components/SiteHeader'
import './resources.css'

export default function ResourcePageShell({
  title,
  hero,
  children,
}: {
  title: string
  /** Full-bleed band above the constrained article body. */
  hero?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    document.title = `${title} · VettaJimale.Tech`
  }, [title])

  return (
    <main className={`resource-page${hero ? ' has-hero' : ''}`}>
      <SiteHeader />
      {hero ? <div className="resource-hero-bleed">{hero}</div> : null}
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

export function ResourceBookCta({ large = false }: { large?: boolean }) {
  return (
    <p className={`resource-book-cta${large ? ' resource-book-cta--large' : ''}`}>
      <a className="btn" href="/products/i-call-bs">
        Explore the complete book — $17
      </a>
    </p>
  )
}
