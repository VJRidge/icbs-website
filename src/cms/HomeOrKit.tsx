import { useEffect, useState } from 'react'
import Free from '../pages/Free'
import PublicPage from './PublicPage'
import { supabaseBrowser } from '../lib/supabaseBrowser'

export default function HomeOrKit() {
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
      const { data: settings } = await sb.from('settings').select('homepage_content_id').eq('id', 1).maybeSingle()
      const id = settings?.homepage_content_id
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
  }, [])

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
