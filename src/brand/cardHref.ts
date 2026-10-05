import { useEffect, useState } from 'react'
import { supabaseBrowser } from '../lib/supabaseBrowser'

const published = new Map<string, boolean>()

function blogSlug(href: string): string | null {
  const match = href.match(/^\/blog\/([^/?#]+)$/i)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

async function postIsPublished(slug: string): Promise<boolean> {
  const cached = published.get(slug)
  if (cached !== undefined) return cached
  const sb = supabaseBrowser()
  if (!sb) {
    published.set(slug, false)
    return false
  }
  const { data, error } = await sb
    .from('contents')
    .select('id')
    .eq('kind', 'post')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  const ok = !error && !!data
  published.set(slug, ok)
  return ok
}

/** A card href that is safe to render as a link. Empty, `#`, and missing blog posts stay blank. */
export function useResolvableHref(href: string): string {
  const trimmed = href.trim()
  const slug = trimmed && trimmed !== '#' ? blogSlug(trimmed) : null
  const [live, setLive] = useState(() => !slug || published.get(slug) === true)

  useEffect(() => {
    if (!slug) return
    let gone = false
    void postIsPublished(slug).then((ok) => {
      if (!gone) setLive(ok)
    })
    return () => {
      gone = true
    }
  }, [slug])

  if (!trimmed || trimmed === '#') return ''
  if (!slug) return trimmed
  return live ? trimmed : ''
}
