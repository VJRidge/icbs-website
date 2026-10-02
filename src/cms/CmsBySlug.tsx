import { useEffect, useState, type ReactNode } from 'react'
import PublicPage, { isStudioDocument } from './PublicPage'
import { supabaseBrowser } from '../lib/supabaseBrowser'

export default function CmsBySlug({ slug, fallback }: { slug: string; fallback: ReactNode }) {
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
        .select('title, seo_title, published_document, status')
        .eq('kind', 'page')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (gone) return
      if (isStudioDocument(data?.published_document)) {
        const tab = (data.seo_title || data.title || '').trim() || data.title
        document.title = `${tab} \u00b7 I Call BS`
        setNode(<PublicPage title={data.title} document={data.published_document} fallback={fallback} chrome />)
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
  return <>{node ?? fallback}</>
}
