import { useEffect, useState } from 'react'
import { DEFAULT_SITE_CHROME, loadSiteChromeOnce, type SiteChrome } from '../lib/siteChrome'
import SiteSocial from './SiteSocial'

function isActive(href: string, path: string): boolean {
  if (href === '/') return path === '/'
  return path === href || path.startsWith(`${href}/`)
}

export default function SiteHeader() {
  const [chrome, setChrome] = useState<SiteChrome>(DEFAULT_SITE_CHROME)
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/'

  useEffect(() => {
    void loadSiteChromeOnce().then(setChrome)
  }, [])

  return (
    <header className="site-header green">
      <div className="wrap">
        <div className="nav">
          <a className="site-brand" href="/">
            {chrome.logoUrl ? (
              <img src={chrome.logoUrl} alt={chrome.siteName} className="site-logo" />
            ) : (
              <span className="k tag">{chrome.siteName}</span>
            )}
            {chrome.tagline ? <span className="k site-tagline">{chrome.tagline}</span> : null}
          </a>
          <div className="site-header-end">
            <SiteSocial social={chrome.social} />
            {chrome.header.length > 0 ? (
              <nav className="site-header-links" aria-label="Site">
                {chrome.header.map((item) => (
                  <a key={item.id} href={item.href} aria-current={isActive(item.href, path) ? 'page' : undefined}>
                    {item.label}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
