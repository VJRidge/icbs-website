import type { SiteSocial as SocialMap } from '../lib/siteChrome'
import { SOCIAL_NETWORKS } from '../lib/siteChrome'

function Icon({ id }: { id: (typeof SOCIAL_NETWORKS)[number]['id'] }) {
  const common = { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const }
  if (id === 'instagram') {
    return (
      <svg {...common}>
        <path fillRule="evenodd" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm10 1.7H7A2.3 2.3 0 0 0 4.7 7v10A2.3 2.3 0 0 0 7 19.3h10a2.3 2.3 0 0 0 2.3-2.3V7A2.3 2.3 0 0 0 17 4.7zM12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zm0 1.7a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM17.35 6.15a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1z" />
      </svg>
    )
  }
  if (id === 'x') {
    return (
      <svg {...common}>
        <path d="M4 3h4.2l3.2 4.6L15 3H20l-6.2 7.6L20.4 21h-4.2l-3.6-5.1L8.2 21H3.2l6.6-8.1L4 3z" />
      </svg>
    )
  }
  if (id === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M14 3v11.2a4.2 4.2 0 1 1-3.2-4.1V7.2A7.4 7.4 0 0 0 14 8.6V6.2A7.2 7.2 0 0 0 18.8 8.4V5.2A5.4 5.4 0 0 1 14 3z" />
      </svg>
    )
  }
  if (id === 'facebook') {
    return (
      <svg {...common}>
        <path d="M14 8h4V4h-4a5 5 0 0 0-5 5v2H6v4h3v9h4v-9h3.2l.8-4H13V9a1 1 0 0 1 1-1z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1.2 7.2H8.6V19H6.2zm1.2-4a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5zM12 10.2h2.3v1.2h.1a2.5 2.5 0 0 1 2.3-1.3c2.4 0 2.9 1.6 2.9 3.6V19h-2.4v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V19H12z" />
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
