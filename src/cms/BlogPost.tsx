import { useEffect, useState, type ReactNode } from 'react'
import PublicPage, { isStudioDocument } from './PublicPage'
import { applyPublicContentSeo } from './applyPublicContentSeo'
import SiteHeader from '../components/SiteHeader'
import { supabaseBrowser } from '../lib/supabaseBrowser'
import { PUBLISHED_CONTENTS_VIEW } from '../lib/publishedContent'

type Taxonomy = { kind: string; slug: string; name: string }

function NotFound() {
  return (
    <main>
      <SiteHeader />
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
    let clearSeo: (() => void) | undefined
    ;(async () => {
      const { data } = await sb
        .from(PUBLISHED_CONTENTS_VIEW)
        .select('title, seo_title, seo_description, published_at, updated_at, published_document, taxonomies')
        .eq('kind', 'post')
        .eq('slug', slug)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .maybeSingle()
      if (gone) return
      const doc = data?.published_document
      if (data && isStudioDocument(doc)) {
        const title = doc.title || data.title
        clearSeo = applyPublicContentSeo({
          path: `/blog/${encodeURIComponent(slug)}`,
          title,
          seoTitle: data.seo_title,
          seoDescription: data.seo_description,
          publishedDocument: doc,
          kind: 'post',
          publishedAt: data.published_at,
          updatedAt: data.updated_at,
        })
        const taxonomies = (data.taxonomies ?? []) as unknown as Taxonomy[]
        const categories = taxonomies
          .filter((t) => t.kind === 'category')
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
      clearSeo?.()
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
