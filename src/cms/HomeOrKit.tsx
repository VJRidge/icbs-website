import { useEffect, useState } from 'react'
import Free from '../pages/Free'
import PublicPage from './PublicPage'
import { applyPublicContentSeo } from './applyPublicContentSeo'
import { supabaseBrowser } from '../lib/supabaseBrowser'
import { PUBLISHED_CONTENTS_VIEW } from '../lib/publishedContent'

type Slot = 'homepage_content_id' | 'kit_content_id'

/** Renders the published studio page assigned to a `settings` slot, or the built-in kit page. */
export default function HomeOrKit({ slot = 'homepage_content_id' }: { slot?: Slot }) {
  const [state, setState] = useState<'load' | 'kit' | 'cms'>('load')
  const [title, setTitle] = useState('')
  const [doc, setDoc] = useState<unknown>(null)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setState('kit')
      return
    }
    let gone = false
    let clearSeo: (() => void) | undefined
    ;(async () => {
      const { data: settings } = await sb.from('settings').select(slot).eq('id', 1).maybeSingle()
      const id = (settings as Record<string, unknown> | null)?.[slot] as string | null | undefined
      if (!id) {
        if (!gone) setState('kit')
        return
      }
      const { data: page } = await sb
        .from(PUBLISHED_CONTENTS_VIEW)
        .select('title, seo_title, seo_description, published_document, status, published_at, updated_at, kind')
        .eq('id', id)
        .maybeSingle()
      if (!gone && page?.status === 'published' && page.published_document) {
        const path = slot === 'homepage_content_id' ? '/' : '/free'
        clearSeo = applyPublicContentSeo({
          path,
          title: page.title,
          seoTitle: page.seo_title,
          seoDescription: page.seo_description,
          publishedDocument: page.published_document,
          kind: page.kind || 'page',
          publishedAt: page.published_at,
          updatedAt: page.updated_at,
        })
        setTitle(page.title)
        setDoc(page.published_document)
        setState('cms')
        return
      }
      if (!gone) setState('kit')
    })()
    return () => {
      gone = true
      clearSeo?.()
    }
  }, [slot])

  if (state === 'load') {
    return (
      <main>
        <section className="sec green" style={{ minHeight: '40vh' }} />
      </main>
    )
  }
  if (state === 'cms' && doc) {
    return <PublicPage title={title} document={doc} fallback={<Free />} chrome={slot !== 'kit_content_id'} />
  }
  return <Free />
}
