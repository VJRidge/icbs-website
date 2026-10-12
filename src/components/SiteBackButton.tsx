import { resolveSiteBackTarget } from '../lib/site/siteBack'

type Props = {
  className?: string
  /** Visual variant for green site header vs brand paper header. */
  tone?: 'site' | 'brand'
}

export default function SiteBackButton({ className = '', tone = 'site' }: Props) {
  const path =
    typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/'

  if (path === '/') return null

  const onBack = () => {
    const target = resolveSiteBackTarget(path, document.referrer, window.location.origin)
    if (target === 'history') {
      window.history.back()
      return
    }
    window.location.href = target
  }

  return (
    <button
      type="button"
      className={`site-back-btn site-back-btn--${tone} ${className}`.trim()}
      onClick={onBack}
      aria-label="Go back"
    >
      <span aria-hidden>←</span> Back
    </button>
  )
}
