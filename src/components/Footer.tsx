import { useEffect, useState } from 'react'
import { DEFAULT_SITE_CHROME, loadSiteChromeOnce, type SiteChrome } from '../lib/siteChrome'

export default function Footer() {
  const [chrome, setChrome] = useState<SiteChrome>(DEFAULT_SITE_CHROME)

  useEffect(() => {
    void loadSiteChromeOnce().then(setChrome)
  }, [])

  return (
    <footer className="foot green">
      <span>{chrome.footerCredit}</span>
      <span>
        {chrome.footer.map((item) => (
          <a key={item.id} href={item.href}>
            {item.label}
          </a>
        ))}
      </span>
    </footer>
  )
}
