/** Parent path for Back when browser history is unavailable. */
export function parentPathForBack(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return '/'
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return '/'
  parts.pop()
  return `/${parts.join('/')}`
}

/** Prefer same-origin history; otherwise climb one path segment. */
export function resolveSiteBackTarget(pathname: string, referrer: string, origin: string): 'history' | string {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return '/'
  try {
    if (referrer && new URL(referrer).origin === origin) return 'history'
  } catch {
    /* ignore invalid referrer */
  }
  return parentPathForBack(path)
}
