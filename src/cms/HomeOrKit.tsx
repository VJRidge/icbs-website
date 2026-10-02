import { useEffect, useState } from 'react'
import Free from '../pages/Free'
import PublicPage from './PublicPage'
import { supabaseBrowser } from '../lib/supabaseBrowser'

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
    ;(async () => {
      const { data: settings } = await sb.from('settings').select(slot).eq('id', 1).maybeSingle()
      const id = (settings as Record<string, unknown> | null)?.[slot] as string | null | undefined
      if (!id) {
        if (!gone) setState('kit')
        return
      }
      const { data: page } = await sb
        .from('contents')
        .select('title, published_document, status')
        .eq('id', id)
        .maybeSingle()
      if (!gone && page?.status === 'published' && page.published_document) {
        setTitle(page.title)
        setDoc(page.published_document)
        setState('cms')
        return
      }
      if (!gone) setState('kit')
    })()
    return () => {
      gone = true
    }
  }, [slot])

  if (state === 'load') {
    return (
      <main>
        <section className="sec green" style={{ minHeight: '40vh' }} />
      </main>
    )
  }
  if (state === 'cms' && doc) return <PublicPage title={title} document={doc} fallback={<Free />} />
  return <Free />
}
