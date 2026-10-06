import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import { PUBLISHED_CONTENTS_VIEW } from '../lib/publishedContent'
import { rankSearchHits, type DiscoveryPublishedRow } from '../lib/discovery/publicUrls'
import { supabaseBrowser } from '../lib/supabaseBrowser'

type Hit = DiscoveryPublishedRow & { path: string }

/** Public search over published_contents titles only. */
export default function PublicSearch() {
  const initial = useMemo(() => new URLSearchParams(window.location.search).get('q') ?? '', [])
  const [query, setQuery] = useState(initial)
  const [rows, setRows] = useState<DiscoveryPublishedRow[] | null>(null)
  const [homepageContentId, setHomepageContentId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Search · I Call BS'
    const sb = supabaseBrowser()
    if (!sb) {
      setRows([])
      return
    }
    let gone = false
    ;(async () => {
      const [{ data: settings }, { data }] = await Promise.all([
        sb.from('settings').select('homepage_content_id').eq('id', 1).maybeSingle(),
        sb
          .from(PUBLISHED_CONTENTS_VIEW)
          .select('id, kind, slug, title, seo_description, public_path, content_type_key, published_at')
          .order('published_at', { ascending: false })
          .limit(500),
      ])
      if (gone) return
      setHomepageContentId((settings as { homepage_content_id?: string | null } | null)?.homepage_content_id ?? null)
      setRows((data as DiscoveryPublishedRow[] | null) ?? [])
    })()
    return () => {
      gone = true
    }
  }, [])

  const hits: Hit[] = useMemo(() => {
    if (!rows) return []
    return rankSearchHits(rows, query, { homepageContentId })
  }, [rows, query, homepageContentId])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = query.trim()
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('q', next)
    else url.searchParams.delete('q')
    window.history.replaceState({}, '', url.pathname + url.search)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-brand-ink">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Search</h1>
        <form onSubmit={onSubmit} className="flex gap-2 mb-8" role="search">
          <label className="sr-only" htmlFor="site-search">
            Search published content
          </label>
          <input
            id="site-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles…"
            className="flex-1 border border-brand-ink/20 rounded px-3 py-2"
            autoComplete="off"
          />
          <button type="submit" className="px-4 py-2 rounded bg-brand-blue text-white">
            Search
          </button>
        </form>
        {rows === null ? (
          <p className="text-brand-ink/60">Loading…</p>
        ) : query.trim().length < 2 ? (
          <p className="text-brand-ink/60">Enter at least two characters.</p>
        ) : hits.length === 0 ? (
          <p className="text-brand-ink/60">No published matches.</p>
        ) : (
          <ul className="space-y-4">
            {hits.map((hit) => (
              <li key={hit.id}>
                <a href={hit.path} className="text-lg text-brand-blue underline-offset-2 hover:underline">
                  {hit.title || hit.slug}
                </a>
                {hit.seo_description ? (
                  <p className="text-sm text-brand-ink/70 mt-1">{hit.seo_description}</p>
                ) : null}
                <p className="text-xs font-mono text-brand-ink/50 mt-1">{hit.path}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
