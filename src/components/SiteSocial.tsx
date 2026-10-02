import type { SiteSocial as SocialMap } from '../lib/siteChrome'
import { SOCIAL_NETWORKS } from '../lib/siteChrome'

function Icon({ id }: { id: (typeof SOCIAL_NETWORKS)[number]['id'] }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true as const }
  if (id === 'instagram') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (id === 'x') {
    return (
      <svg {...common}>
        <path d="M5 4h3.2l3.3 4.6L15.2 4H19l-5.4 6.7L19.4 20h-3.2l-3.6-5L8 20H4.2l5.7-7.1L5 4z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (id === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M14 4v10.2a3.2 3.2 0 1 1-2.4-3.1V8.2A6.2 6.2 0 0 0 14 9.2V7.4A6 6 0 0 0 17.6 9V6.4A4.4 4.4 0 0 1 14 4z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (id === 'facebook') {
    return (
      <svg {...common}>
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 10v7M7 7.5h.01M11 17v-4.2a2 2 0 1 1 4 0V17" />
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
