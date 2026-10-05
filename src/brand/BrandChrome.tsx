import { useEffect, useState, type ReactNode } from 'react'
import { loadSiteChromeOnce, SOCIAL_NETWORKS, type SiteChrome, DEFAULT_SITE_CHROME } from '../lib/siteChrome'
import './brand.css'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/resources', label: 'Resources' },
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

function active(href: string, path: string): boolean {
  if (href === '/') return path === '/'
  return path === href || path.startsWith(`${href}/`)
}

export default function BrandChrome({
  cta,
  children,
}: {
  cta: { label: string; href: string }
  children: ReactNode
}) {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/'
  const [open, setOpen] = useState(false)
  const [chrome, setChrome] = useState<SiteChrome>(DEFAULT_SITE_CHROME)
  const year = new Date().getFullYear()

  useEffect(() => {
    void loadSiteChromeOnce().then(setChrome)
  }, [])

  const socials = SOCIAL_NETWORKS.filter((n) => chrome.social[n.id])
  const links = chrome.headerFromMenu ? chrome.header : LINKS

  return (
    <div className="vj">
      {import.meta.env.DEV ? (
        <p className="vj-preview" role="status">
          <strong>Local preview only.</strong>
          <span>This is not the live site. Nothing here is published.</span>
          <a href="/design-kit">Design kit</a>
        </p>
      ) : null}
      <header className="vj-header">
        <div className="vj-wrap vj-header-row">
          <a className="vj-brand" href="/">
            <strong>VETTAJIMALE.TECH</strong>
            <span>AI / Technology / Creative Possibilities</span>
          </a>
          <button className="vj-menu" type="button" aria-expanded={open} aria-controls="vj-site-nav" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Menu'}
          </button>
          <nav id="vj-site-nav" className={open ? 'vj-nav is-open' : 'vj-nav'} aria-label="Site">
            {links.map((link) => (
              <a key={link.href} href={link.href} aria-current={active(link.href, path) ? 'page' : undefined} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <a className="vj-btn" href={cta.href}>{cta.label}</a>
        </div>
      </header>
      <main>{children}</main>
      <footer className="vj-footer">
        <div className="vj-wrap vj-footer-row">
          <a className="vj-brand" href="/">
            <strong>VETTAJIMALE.TECH</strong>
            <span>© {year} VettaJimale.Tech</span>
          </a>
          <nav aria-label="Footer">
            {LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
            <a href="/blog">Blog</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refunds">Refunds</a>
          </nav>
          {socials.length > 0 ? (
            <nav aria-label="Social">
              {socials.map((n) => (
                <a key={n.id} href={chrome.social[n.id]} target="_blank" rel="noreferrer">{n.label}</a>
              ))}
            </nav>
          ) : null}
          <p className="legal">Personal brand site.</p>
        </div>
      </footer>
    </div>
  )
}
