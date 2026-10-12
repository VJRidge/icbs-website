import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import { applyPublicContentSeo } from './applyPublicContentSeo'
import { supabaseBrowser } from '../lib/supabaseBrowser'
import { PUBLISHED_CONTENTS_VIEW } from '../lib/publishedContent'

type StructuredDoc = {
  format?: string
  title?: string
  _structured?: {
    typeKey?: string
    fields?: Record<string, unknown>
    public_path?: string
  }
  _meta?: {
    content_type_key?: string
    structured_fields?: Record<string, unknown>
    title?: string
  }
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function NotFound() {
  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap">
          <h2>Review not found</h2>
          <p className="lede">That tool review doesn’t exist or isn’t published yet.</p>
        </div>
      </section>
    </main>
  )
}

export default function CustomContentByPath({ typeKey, slug }: { typeKey: string; slug: string }) {
  const [doc, setDoc] = useState<StructuredDoc | null>(null)
  const [title, setTitle] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setReady(true)
      return
    }
    let gone = false
    let clearSeo: (() => void) | undefined
    void sb
      .from(PUBLISHED_CONTENTS_VIEW)
      .select('title, seo_title, seo_description, published_document, slug, published_at, updated_at')
      .eq('kind', 'custom')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (gone) return
        if (error) {
          setReady(true)
          return
        }
        const published = (data?.published_document ?? null) as StructuredDoc | null
        const resolvedType = published?._structured?.typeKey || published?._meta?.content_type_key
        if (data && published && resolvedType === typeKey) {
          const publicPath =
            typeof published._structured?.public_path === 'string' && published._structured.public_path
              ? published._structured.public_path
              : `/reviews/${encodeURIComponent(slug)}`
          clearSeo = applyPublicContentSeo({
            path: publicPath,
            title: data.title || published._meta?.title || slug,
            seoTitle: data.seo_title,
            seoDescription: data.seo_description,
            publishedDocument: published,
            kind: 'custom',
            publishedAt: data.published_at,
            updatedAt: data.updated_at,
          })
          setTitle(data.title || published._meta?.title || slug)
          setDoc(published)
        }
        setReady(true)
      })
    return () => {
      gone = true
      clearSeo?.()
    }
  }, [typeKey, slug])

  if (!ready) {
    return (
      <main>
        <section className="sec cream" style={{ minHeight: '40vh' }} />
      </main>
    )
  }
  const fields = doc?._structured?.fields ?? doc?._meta?.structured_fields ?? {}
  if (!doc) return <NotFound />

  return (
    <main>
      <SiteHeader />
      <section className="sec cream">
        <div className="wrap" style={{ maxWidth: '46rem' }}>
          <p className="k o">Review</p>
          <h1 className="an">{title}</h1>
          {asText(fields.verdict) ? <p className="lede">{asText(fields.verdict)}</p> : null}
          {fields.affiliate_disclosure === true ? (
            <p className="lede">This review includes an affiliate relationship. Decisions remain independent.</p>
          ) : null}
          <dl className="mt-8 space-y-4">
            {(
              [
                ['Platform tested', fields.platform_tested],
                ['What was tried', fields.what_was_tried],
                ['Limitations', fields.limitations],
                ['Pricing checked', fields.pricing_checked_date],
                ['Pricing summary', fields.pricing_summary],
              ] as Array<[string, unknown]>
            ).map(([label, value]) =>
              asText(value) ? (
                <div key={String(label)}>
                  <dt className="k o">{label}</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{asText(value)}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </div>
      </section>
      <Footer />
    </main>
  )
}
