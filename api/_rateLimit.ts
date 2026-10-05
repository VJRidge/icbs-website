type ReqLike = { headers?: Record<string, unknown> }

const hits = new Map<string, number[]>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_HITS = 8

export function requestAddress(req: ReqLike): string {
  const headers = req.headers ?? {}
  const raw = headers['x-forwarded-for']
  const text = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '')
  const ip = text.split(',')[0]?.trim() || 'local'
  return ip.slice(0, 64)
}

/** True when this key has already been used too many times in the current window. */
export function rateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS)
  if (recent.length >= MAX_HITS) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 500) {
    for (const [id, times] of hits) {
      const fresh = times.filter((at) => now - at < WINDOW_MS)
      if (fresh.length === 0) hits.delete(id)
    }
  }
  return false
}
