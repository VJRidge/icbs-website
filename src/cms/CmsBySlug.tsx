import { useEffect, useState, type ReactNode } from 'react'
import PublicPage from './PublicPage'
import { supabaseBrowser } from '../lib/supabaseBrowser'
import type { BuilderDocument } from './document'

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
        .select('title, published_document, status')
        .eq('kind', 'page')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (gone) return
      if (data?.published_document) {
        setNode(<PublicPage title={data.title} document={data.published_document as BuilderDocument} />)
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
