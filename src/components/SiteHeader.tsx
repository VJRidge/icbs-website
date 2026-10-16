import { useEffect, useState } from 'react'
import { DEFAULT_SITE_CHROME, loadSiteChromeOnce, type SiteChrome } from '../lib/siteChrome'
import { siteNavIsActive } from '../lib/siteNavActive'
import SiteBackButton from './SiteBackButton'
import SiteSocial from './SiteSocial'

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
          <div className="site-header-start">
            <SiteBackButton tone="site" />
            <a className="site-brand" href="/">
              {chrome.logoUrl ? (
                <img src={chrome.logoUrl} alt={chrome.siteName} className="site-logo" />
              ) : (
                <span className="k tag">{chrome.siteName}</span>
              )}
              {chrome.tagline ? <span className="k site-tagline">{chrome.tagline}</span> : null}
            </a>
          </div>
          <div className="site-header-end">
            <SiteSocial social={chrome.social} />
            {chrome.header.length > 0 ? (
              <nav className="site-header-links" aria-label="Site">
                {chrome.header.map((item) => (
                  <a key={item.id} href={item.href} aria-current={siteNavIsActive(item.href, path) ? 'page' : undefined}>
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
