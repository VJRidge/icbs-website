import { useMemo } from 'react'
import PublicPage from './PublicPage'
import { readCmsPreview } from '../studio/lib/cmsPreview'

export default function CmsPreview() {
  const payload = useMemo(() => readCmsPreview(), [])

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
