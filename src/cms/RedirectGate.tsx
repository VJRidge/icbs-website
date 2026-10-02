import { useEffect, useState, type ReactNode } from 'react'
import { supabaseBrowser } from '../lib/supabaseBrowser'

function norm(path: string): string {
  const p = path.replace(/\/+$/, '') || '/'
  return p.startsWith('/') ? p : `/${p}`
}

export default function RedirectGate({ path, children }: { path: string; children: ReactNode }) {
  const [pass, setPass] = useState(false)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setPass(true)
      return
    }
    let gone = false
    const here = norm(path)
    void (async () => {
      try {
        const { data } = await sb.from('redirects').select('from_path, to_path')
        if (gone) return
        const hit = (data ?? []).find((r) => norm(String(r.from_path)) === here)
        if (hit?.to_path) {
          const dest = String(hit.to_path).trim()
          if (dest && norm(dest) !== here) {
            window.location.replace(dest.startsWith('http') ? dest : norm(dest))
            return
          }
        }
        setPass(true)
      } catch {
        if (!gone) setPass(true)
      }
    })()
    return () => {
      gone = true
    }
  }, [path])

  if (!pass) {
    return (
      <main>
        <section className="sec green" style={{ minHeight: '30vh' }} />
      </main>
    )
  }
  return <>{children}</>
}
