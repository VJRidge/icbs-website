import type { SiteSocial as SocialMap } from '../lib/siteChrome'
import { SOCIAL_NETWORKS } from '../lib/siteChrome'

function Icon({ id }: { id: (typeof SOCIAL_NETWORKS)[number]['id'] }) {
  const common = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const }
  if (id === 'instagram') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (id === 'x') {
    return (
      <svg {...common}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }
  if (id === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    )
  }
  if (id === 'facebook') {
    return (
      <svg {...common}>
        <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.5 1.6-1.5h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H8v3.2h2.1V22h3.4z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M5.2 9.2H7.6V19H5.2zM6.4 4.6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM10.2 9.2h2.3v1.3h.1c.4-.7 1.3-1.5 2.7-1.5 2.9 0 3.4 1.9 3.4 4.4V19h-2.4v-5.1c0-1.2 0-2.8-1.7-2.8s-1.9 1.3-1.9 2.7V19h-2.5V9.2z" />
    </svg>
  )
}

export default function SiteSocial({ social, className }: { social: SocialMap; className?: string }) {
  return (
    <div className={['social', className].filter(Boolean).join(' ')}>
      {SOCIAL_NETWORKS.map((n) => {
        const href = social[n.id].trim()
        const icon = <Icon id={n.id} />
        if (!href) return (
          <span key={n.id} className="social-ph" title={`${n.label} — add the link in Header & footer`}>
            {icon}
          </span>
        )
        return (
          <a key={n.id} href={href} target="_blank" rel="noopener noreferrer" aria-label={n.label}>
            {icon}
          </a>
        )
      })}
    </div>
  )
}
