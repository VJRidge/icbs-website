// Remembers where a visitor came from (e.g. ?utm_source=tiktok&utm_campaign=myth01)
// so the signup can be tagged with the post that brought them.
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
export type Utm = Partial<Record<(typeof KEYS)[number], string>>

export function captureUtm(): Utm {
  const out: Utm = {}
  try {
    const params = new URLSearchParams(window.location.search)
    for (const k of KEYS) {
      const v = params.get(k)
      if (v) out[k] = v.slice(0, 120)
    }
    if (Object.keys(out).length) sessionStorage.setItem('utm', JSON.stringify(out))
    else return JSON.parse(sessionStorage.getItem('utm') || '{}')
  } catch {
    /* storage can be blocked; signup still works without it */
  }
  return out
}
