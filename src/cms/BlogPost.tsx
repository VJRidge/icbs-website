import { useEffect, useState, type ReactNode } from 'react'
import PublicPage, { isStudioDocument } from './PublicPage'
import { supabaseBrowser } from '../lib/supabaseBrowser'

type Taxonomy = { kind: string; slug: string; name: string }

function NotFound() {
  return (
    <main>
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap">
          <a className="k o" href="/blog">
            ← All posts
          </a>
          <h2>Post not found</h2>
          <p className="lede">That post doesn’t exist or isn’t published yet.</p>
        </div>
      </section>
    </main>
  )
}

export default function BlogPost({ slug }: { slug: string }) {
  const [node, setNode] = useState<ReactNode>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setReady(true)
      return
    }
    let gone = false
    ;(async () => {
      const { data } = await sb
        .from('contents')
        .select('title, published_at, published_document, content_taxonomies(taxonomies(kind, slug, name))')
        .eq('kind', 'post')
        .eq('slug', slug)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .maybeSingle()
      if (gone) return
      const doc = data?.published_document
      if (data && isStudioDocument(doc)) {
        const title = doc.title || data.title
        document.title = `${title} · I Call BS`
        const links = (data.content_taxonomies ?? []) as unknown as { taxonomies: Taxonomy | null }[]
        const categories = links
          .map((l) => l.taxonomies)
          .filter((t): t is Taxonomy => !!t && t.kind === 'category')
          .map(({ slug: s, name }) => ({ slug: s, name }))
        setNode(
          <PublicPage
            title={title}
            document={doc}
            fallback={<NotFound />}
            post={{ author: doc.author_name, publishedAt: doc.published_at ?? data.published_at, categories }}
          />,
        )
      }
      setReady(true)
    })()
    return () => {
      gone = true
    }
  }, [slug])

  if (!ready) {
    return (
      <main>
        <section className="sec cream" style={{ minHeight: '40vh' }} />
      </main>
    )
  }
  return <>{node ?? <NotFound />}</>
}
