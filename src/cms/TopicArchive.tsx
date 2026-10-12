import { useEffect, useMemo, useState } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import { supabaseBrowser } from '../lib/supabaseBrowser'

type Category = { slug: string; name: string; description: string }
type PostCard = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
}

/** Public topic archive: `/topics/:slug` (categories shown as Topics on the site). */
export default function TopicArchive({ slug }: { slug: string }) {
  const [category, setCategory] = useState<Category | null | undefined>(undefined)
  const [posts, setPosts] = useState<PostCard[] | null>(null)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setCategory(null)
      setPosts([])
      return
    }
    let gone = false
    ;(async () => {
      const { data: cat } = await sb
        .from('taxonomies')
        .select('slug, name, description')
        .eq('kind', 'category')
        .eq('slug', slug)
        .maybeSingle()
      if (gone) return
      if (!cat) {
        setCategory(null)
        setPosts([])
        document.title = 'Topic · I Call BS'
        return
      }
      const topic = cat as Category
      setCategory(topic)
      document.title = `${topic.name} · Topics · I Call BS`

      const { data, error } = await sb.rpc('published_posts_for_topic', { p_slug: slug })
      if (gone) return
      if (error) {
        setPosts([])
        return
      }
      setPosts(
        ((data as { slug: string; title: string; excerpt: string; published_at: string }[]) ?? []).map(
          (r) => ({
            slug: r.slug,
            title: r.title,
            excerpt: r.excerpt ?? '',
            publishedAt: r.published_at,
          }),
        ),
      )
    })()
    return () => {
      gone = true
    }
  }, [slug])

  const heading = useMemo(() => category?.name ?? 'Topic', [category])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        {category === undefined ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : category === null ? (
          <p className="text-sm text-slate-600">Topic not found.</p>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Topics</p>
            <h1 className="mt-2 font-serif text-4xl font-black text-slate-900">{heading}</h1>
            {category.description ? (
              <p className="mt-3 text-base text-slate-600">{category.description}</p>
            ) : null}
            <ul className="mt-10 divide-y divide-slate-100 border-y border-slate-100">
              {(posts ?? []).length === 0 ? (
                <li className="py-6 text-sm text-slate-500">No articles in this topic yet.</li>
              ) : (
                (posts ?? []).map((p) => (
                  <li key={p.slug} className="py-6">
                    <a
                      href={`/blog/${encodeURIComponent(p.slug)}`}
                      className="font-serif text-2xl font-bold text-slate-900 hover:text-brand-blue"
                    >
                      {p.title}
                    </a>
                    {p.publishedAt ? (
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                        {new Date(p.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    ) : null}
                    {p.excerpt ? <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p> : null}
                  </li>
                ))
              )}
            </ul>
            <p className="mt-8 text-sm">
              <a href="/blog" className="font-semibold text-brand-blue hover:underline">
                ← All articles
              </a>
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
