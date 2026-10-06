import { useEffect, useState, type ReactNode } from 'react'
import PublicPage, { isStudioDocument } from './PublicPage'
import { applyPublicContentSeo } from './applyPublicContentSeo'
import { supabaseBrowser } from '../lib/supabaseBrowser'
import { PUBLISHED_CONTENTS_VIEW } from '../lib/publishedContent'
import NotFoundPage from './NotFoundPage'

export default function CmsBySlug({ slug, fallback }: { slug: string; fallback?: ReactNode }) {
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
        .select('title, seo_title, seo_description, published_document, status, published_at, updated_at')
        .eq('kind', 'page')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (gone) return
      if (isStudioDocument(data?.published_document)) {
        clearSeo = applyPublicContentSeo({
          path: `/${encodeURIComponent(slug)}`,
          title: data.title,
          seoTitle: data.seo_title,
          seoDescription: data.seo_description,
          publishedDocument: data.published_document,
          kind: 'page',
          publishedAt: data.published_at,
          updatedAt: data.updated_at,
        })
        setNode(<PublicPage title={data.title} document={data.published_document} fallback={fallback} chrome />)
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
  return <>{node ?? fallback ?? <NotFoundPage />}</>
}
