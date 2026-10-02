import { useEffect, useMemo, useState } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import { supabaseBrowser } from '../lib/supabaseBrowser'

type Category = { slug: string; name: string }
type PostCard = {
  slug: string
  title: string
  excerpt: string
  author: string
  image: string
  publishedAt: string
  categories: Category[]
}

type Row = {
  slug: string
  title: string
  published_at: string
  doc_title: string | null
  excerpt: string | null
  author: string | null
  image: string | null
  content_taxonomies: { taxonomies: { kind: string; slug: string; name: string } | null }[] | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<PostCard[] | null>(null)
  const [active, setActive] = useState(() => new URLSearchParams(window.location.search).get('category') ?? '')

  useEffect(() => {
    document.title = 'Blog · I Call BS'
    const sb = supabaseBrowser()
    if (!sb) {
      setPosts([])
      return
    }
    let gone = false
    ;(async () => {
      const { data } = await sb
        .from('contents')
        .select(
          'slug, title, published_at, doc_title:published_document->>title, excerpt:published_document->>excerpt, author:published_document->>author_name, image:published_document->>featured_image_url, content_taxonomies(taxonomies(kind, slug, name))',
        )
        .eq('kind', 'post')
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(200)
      if (gone) return
      const rows = (data ?? []) as unknown as Row[]
      setPosts(
        rows.map((r) => ({
          slug: r.slug,
          title: r.doc_title || r.title,
          excerpt: r.excerpt ?? '',
          author: r.author ?? '',
          image: r.image ?? '',
          publishedAt: r.published_at,
          categories: (r.content_taxonomies ?? [])
            .map((ct) => ct.taxonomies)
            .filter((t): t is { kind: string; slug: string; name: string } => !!t && t.kind === 'category')
            .map(({ slug, name }) => ({ slug, name })),
        })),
      )
    })()
    return () => {
      gone = true
    }
  }, [])

  const categories = useMemo(() => {
    const seen = new Map<string, Category>()
    for (const p of posts ?? []) for (const c of p.categories) seen.set(c.slug, c)
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [posts])

  const shown = useMemo(
    () => (posts ?? []).filter((p) => !active || p.categories.some((c) => c.slug === active)),
    [posts, active],
  )

  function pick(slug: string) {
    setActive(slug)
    const url = slug ? `/blog?category=${encodeURIComponent(slug)}` : '/blog'
    window.history.replaceState(null, '', url)
  }

  return (
    <main>
      <SiteHeader />
      <div className="green">
        <div className="wrap">
          <div className="blog-head">
            <div className="k o">The blog</div>
            <h1 className="an">
              Calling <span className="y">BS</span>, with receipts.
            </h1>
          </div>
        </div>
      </div>

      <section className="sec cream">
        <div className="wrap">
          {categories.length > 0 ? (
            <div className="blog-cats" role="group" aria-label="Filter by category">
              <button type="button" aria-pressed={!active} onClick={() => pick('')}>
                All
              </button>
              {categories.map((c) => (
                <button key={c.slug} type="button" aria-pressed={active === c.slug} onClick={() => pick(c.slug)}>
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          {posts === null ? (
            <div style={{ minHeight: '30vh' }} />
          ) : shown.length === 0 ? (
            <p className="lede">{active ? 'No posts in this category yet.' : 'No posts yet. Check back soon.'}</p>
          ) : (
            <ul className="blog-grid">
              {shown.map((p) => (
                <li key={p.slug}>
                  <a href={`/blog/${encodeURIComponent(p.slug)}`} className="blog-card">
                    {p.image ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
                    <div className="blog-card-body">
                      <span className="k o">
                        {[formatDate(p.publishedAt), p.categories.map((c) => c.name).join(', ')].filter(Boolean).join(' · ')}
                      </span>
                      <h2>{p.title}</h2>
                      {p.excerpt ? <p>{p.excerpt}</p> : null}
                      {p.author ? <span className="blog-by">By {p.author}</span> : null}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
