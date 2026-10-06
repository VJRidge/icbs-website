import { useEffect, useState } from 'react'
import PublicPage from './PublicPage'
import { readCmsPreview, type CmsPreviewPayload } from '../studio/lib/cmsPreview'
import { isPreviewExpired } from '../studio/lib/cms/securePreview'

function usePreviewToken(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('token')
}

export default function CmsPreview() {
  const token = usePreviewToken()
  const [remote, setRemote] = useState<CmsPreviewPayload | null>(null)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/cms-preview?token=${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Preview unavailable.')
        }
        if (isPreviewExpired(data.expiresAt)) {
          throw new Error('Preview expired.')
        }
        if (!cancelled) {
          setRemote({
            title: data.title,
            document: data.document,
            post: data.post,
          })
        }
      } catch (err) {
        if (!cancelled) setRemoteError(err instanceof Error ? err.message : 'Preview unavailable.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]')
    const created = !robots
    const el = robots || document.createElement('meta')
    el.setAttribute('name', 'robots')
    el.setAttribute('content', 'noindex, nofollow')
    if (created) document.head.appendChild(el)
    return () => {
      if (created) el.remove()
      else el.setAttribute('content', 'index, follow')
    }
  }, [])

  const local = !token ? readCmsPreview() : null
  const payload = remote || local

  if (loading) {
    return (
      <main>
        <section className="sec cream" style={{ minHeight: '70vh' }}>
          <div className="wrap">
            <p className="k o">Preview</p>
            <h2>Loading secure preview…</h2>
          </div>
        </section>
      </main>
    )
  }

  if (remoteError) {
    return (
      <main>
        <section className="sec cream" style={{ minHeight: '70vh' }}>
          <div className="wrap">
            <p className="k o">Preview</p>
            <h2>Preview unavailable</h2>
            <p className="lede">{remoteError}</p>
          </div>
        </section>
      </main>
    )
  }

  if (!payload) {
    return (
      <main>
        <section className="sec cream" style={{ minHeight: '70vh' }}>
          <div className="wrap">
            <p className="k o">Preview</p>
            <h2>Nothing to preview</h2>
            <p className="lede">Open Preview from the studio editor. This tab only shows the draft you just sent.</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <>
      <div
        className="k"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--y)',
          color: 'var(--ink)',
          padding: '10px 16px',
          textAlign: 'center',
        }}
      >
        Preview — not live. Publish in the studio to put this on the site.
      </div>
      <PublicPage title={payload.title} document={payload.document} post={payload.post} fallback={null} />
    </>
  )
}
