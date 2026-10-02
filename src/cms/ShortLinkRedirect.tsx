import { useEffect, useState } from 'react'
import { supabaseBrowser } from '../lib/supabaseBrowser'

export default function ShortLinkRedirect({ code }: { code: string }) {
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb || !code.trim()) {
      setMissing(true)
      return
    }
    let gone = false
    ;(async () => {
      const { data, error } = await sb.rpc('resolve_cms_short_link', { p_code: code.trim() })
      if (gone) return
      if (!error && typeof data === 'string' && data.startsWith('/')) {
        window.location.replace(data)
        return
      }
      setMissing(true)
    })()
    return () => {
      gone = true
    }
  }, [code])

  return (
    <main>
      <section className="sec cream" style={{ minHeight: '40vh' }}>
        <div className="wrap">
          <p>{missing ? 'This short link is invalid or the page is not published.' : 'Redirecting…'}</p>
          {missing ? <a href="/">Back home</a> : null}
        </div>
      </section>
    </main>
  )
}
