import { FormEvent, useEffect, useState } from 'react'
import { supabaseBrowser } from '../../lib/supabaseBrowser'
import { bodyFromDocument, documentFromBody, slugify, type BuilderDocument } from '../../cms/document'
import type { ContentRow } from './PagesList'

type Revision = { id: string; created_at: string; title: string | null }

export default function PageEditor({ id }: { id: 'new' | string }) {
  const isNew = id === 'new'
  const [title, setTitle] = useState('Untitled')
  const [slug, setSlug] = useState('untitled')
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [body, setBody] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDesc, setSeoDesc] = useState('')
  const [parentId, setParentId] = useState('')
  const [asHome, setAsHome] = useState(false)
  const [status, setStatus] = useState('draft')
  const [version, setVersion] = useState(1)
  const [parents, setParents] = useState<ContentRow[]>([])
  const [revs, setRevs] = useState<Revision[]>([])
  const [saveState, setSaveState] = useState('')
  const [err, setErr] = useState('')
  const [homeId, setHomeId] = useState<string | null>(null)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) return
    sb.from('contents').select('id, title, slug, status, updated_at, parent_id').eq('kind', 'page').then(({ data }) => {
      setParents((data ?? []) as ContentRow[])
    })
    sb.from('settings').select('homepage_content_id').eq('id', 1).maybeSingle().then(({ data }) => {
      setHomeId(data?.homepage_content_id ?? null)
    })
    if (isNew) return
    ;(async () => {
      const { data, error } = await sb.from('contents').select('*').eq('id', id).single()
      if (error || !data) {
        setErr(error?.message ?? 'Page not found.')
        return
      }
      setTitle(data.title)
      setSlug(data.slug)
      setStatus(data.status)
      setVersion(data.doc_version)
      setParentId(data.parent_id ?? '')
      setSeoTitle(data.seo?.title ?? '')
      setSeoDesc(data.seo?.description ?? '')
      setBody(bodyFromDocument(data.draft_document as BuilderDocument))
      setAsHome(data.id === (await sb.from('settings').select('homepage_content_id').eq('id', 1).maybeSingle()).data?.homepage_content_id)
      const { data: revRows } = await sb
        .from('content_revisions')
        .select('id, created_at, title')
        .eq('content_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      setRevs((revRows ?? []) as Revision[])
    })()
  }, [id, isNew])

  function onTitle(v: string) {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  async function persist(publish: boolean, unpublish = false) {
    const sb = supabaseBrowser()
    if (!sb) return
    const { data: userData } = await sb.auth.getUser()
    const uid = userData.user?.id
    const doc = documentFromBody(title, body)
    const patch = {
      title,
      slug: slugify(slug),
      parent_id: parentId || null,
      excerpt: body.slice(0, 280),
      seo: { title: seoTitle, description: seoDesc },
      draft_document: doc,
      updated_at: new Date().toISOString(),
      author_id: uid,
      kind: 'page' as const,
    }
    setErr('')
    setSaveState('Saving…')
    if (isNew) {
      const { data, error } = await sb
        .from('contents')
        .insert({ ...patch, status: publish ? 'published' : 'draft', published_document: publish ? doc : null, published_at: publish ? new Date().toISOString() : null })
        .select('id')
        .single()
      if (error || !data) {
        setSaveState('Save failed')
        setErr(error?.message ?? 'Could not create the page.')
        return
      }
      if (asHome) await sb.from('settings').update({ homepage_content_id: data.id }).eq('id', 1)
      setSaveState('Saved')
      window.location.assign(`/admin/pages/${data.id}`)
      return
    }

    let nextStatus = status
    let published_document: BuilderDocument | null | undefined = undefined
    let published_at: string | null | undefined = undefined
    if (unpublish) {
      nextStatus = 'draft'
      published_document = null
      published_at = null
    } else if (publish) {
      nextStatus = 'published'
      published_document = doc
      published_at = new Date().toISOString()
    }

    const { data: updated, error } = await sb
      .from('contents')
      .update({
        ...patch,
        status: nextStatus,
        ...(published_document !== undefined ? { published_document, published_at } : {}),
        doc_version: version + 1,
      })
      .eq('id', id)
      .eq('doc_version', version)
      .select('id, doc_version')
      .maybeSingle()

    if (error) {
      setSaveState('Save failed')
      setErr(error.message)
      return
    }
    if (!updated) {
      setSaveState('Save failed')
      setErr('Someone else saved this page. Reload before saving again.')
      return
    }
    await sb.from('content_revisions').insert({ content_id: id, document: doc, title, created_by: uid })
    if (asHome) await sb.from('settings').update({ homepage_content_id: id }).eq('id', 1)
    else if (homeId === id) await sb.from('settings').update({ homepage_content_id: null }).eq('id', 1)
    setVersion(updated.doc_version)
    setStatus(nextStatus)
    setSaveState('Saved')
    const { data: revRows } = await sb
      .from('content_revisions')
      .select('id, created_at, title')
      .eq('content_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
    setRevs((revRows ?? []) as Revision[])
  }

  async function restore(revId: string) {
    const sb = supabaseBrowser()
    if (!sb) return
    const { data, error } = await sb.from('content_revisions').select('document, title').eq('id', revId).single()
    if (error || !data) {
      setErr(error?.message ?? 'Could not restore.')
      return
    }
    const doc = data.document as BuilderDocument
    setTitle(data.title || title)
    setBody(bodyFromDocument(doc))
    setSaveState('Revision loaded into the editor. Save draft to keep it.')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await persist(false)
  }

  return (
    <form className="ad-form" onSubmit={onSubmit}>
      <div className="ad-toolbar">
        <button type="submit" className="ad-btn">{saveState === 'Saving…' ? 'Saving…' : 'Save draft'}</button>
        <button type="button" className="ad-btn" onClick={() => persist(true)}>Publish</button>
        {status === 'published' ? (
          <button type="button" className="ad-btn danger" onClick={() => persist(false, true)}>
            Unpublish
          </button>
        ) : null}
        <span className="ad-empty">{saveState}{status ? ` · ${status}` : ''}</span>
      </div>
      {err ? <p className="ad-empty" style={{ color: 'var(--ad-danger)' }}>{err}</p> : null}
      <label>
        Title
        <input value={title} onChange={(e) => onTitle(e.target.value)} required />
      </label>
      <label>
        URL slug
        <input
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
        />
      </label>
      <label>
        Parent page
        <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">(none)</option>
          {parents
            .filter((p) => p.id !== id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
        </select>
      </label>
      <label>
        Body
        <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the page in plain text. The visual builder comes in a later phase." />
      </label>
      <label>
        SEO title
        <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
      </label>
      <label>
        SEO description
        <textarea rows={3} value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} />
      </label>
      <label className="ad-check">
        <input type="checkbox" checked={asHome} onChange={(e) => setAsHome(e.target.checked)} />
        Use as website homepage (only after Publish). /free stays the kit signup.
      </label>
      {!isNew && revs.length > 0 ? (
        <div>
          <h2>Revisions</h2>
          <ul className="ad-revs">
            {revs.map((r) => (
              <li key={r.id}>
                {new Date(r.created_at).toLocaleString()} — {r.title || 'Untitled'}{' '}
                <button type="button" className="ad-link" onClick={() => restore(r.id)}>
                  Restore into editor
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!isNew && status === 'published' ? (
        <p className="ad-empty">
          Live URL: <a href={`/${slug}`} target="_blank" rel="noreferrer">/{slug}</a>
        </p>
      ) : null}
    </form>
  )
}
