import { FormEvent, useEffect, useState } from 'react'
import { supabaseBrowser } from '../../lib/supabaseBrowser'
import { excerptFromDocument, findNode, normalizeDocument, slugify, type BuilderDocument } from '../../cms/document'
import PageBuilder from '../builder/PageBuilder'
import BlockInspector from '../builder/BlockInspector'
import type { ContentRow } from './PagesList'

type Revision = { id: string; created_at: string; title: string | null }

export default function PageEditor({ id }: { id: 'new' | string }) {
  const isNew = id === 'new'
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('untitled')
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [doc, setDoc] = useState<BuilderDocument>(() => normalizeDocument(null, ''))
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
      setDoc(normalizeDocument(data.draft_document as BuilderDocument, data.title))
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
    setDoc((d) => ({ ...d, title: v }))
    if (!slugTouched) setSlug(slugify(v))
  }

  async function persist(publish: boolean, unpublish = false) {
    const sb = supabaseBrowser()
    if (!sb) return
    const { data: userData } = await sb.auth.getUser()
    const uid = userData.user?.id
    const pageTitle = title.trim() || 'Untitled'
    const nextDoc = { ...doc, title: pageTitle }
    const patch = {
      title: pageTitle,
      slug: slugify(slug),
      parent_id: parentId || null,
      excerpt: excerptFromDocument(nextDoc),
      seo: { title: seoTitle, description: seoDesc },
      draft_document: nextDoc,
      updated_at: new Date().toISOString(),
      author_id: uid,
      kind: 'page' as const,
    }
    setErr('')
    setSaveState('Saving…')
    if (isNew) {
      const { data, error } = await sb
        .from('contents')
        .insert({ ...patch, status: publish ? 'published' : 'draft', published_document: publish ? nextDoc : null, published_at: publish ? new Date().toISOString() : null })
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
      published_document = nextDoc
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
    await sb.from('content_revisions').insert({ content_id: id, document: nextDoc, title: pageTitle, created_by: uid })
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
    const loaded = normalizeDocument(data.document as BuilderDocument, data.title || title)
    setTitle(data.title || title)
    setDoc(loaded)
    setSaveState('Revision loaded into the editor. Save draft to keep it.')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await persist(false)
  }

  const selected = selectedId ? findNode(doc.nodes, selectedId) : null
  const live = !isNew && status === 'published' ? `/${slug}` : ''

  return (
    <form className="ad-editor" onSubmit={onSubmit}>
      <div className="ad-toolbar doc-top">
        <a className="ad-link" href="/admin/pages">
          ← All pages
        </a>
        <span className={`doc-pill ${status}`}>{status === 'published' ? 'Published' : 'Draft'}</span>
        <span className="ad-empty">{saveState}</span>
        <span className="doc-top-right">
          {live ? (
            <a className="ad-link" href={live} target="_blank" rel="noreferrer">
              Preview
            </a>
          ) : null}
          <button type="submit" className="ad-btn ghost">
            Save draft
          </button>
          <button type="button" className="ad-btn" onClick={() => persist(true)}>
            Publish
          </button>
          {status === 'published' ? (
            <button type="button" className="ad-btn danger" onClick={() => persist(false, true)}>
              Unpublish
            </button>
          ) : null}
        </span>
      </div>
      {err ? (
        <p className="ad-empty" style={{ color: 'var(--ad-danger)', padding: '0 16px' }}>
          {err}
        </p>
      ) : null}
      <div className="doc-shell">
        <aside className="doc-left">
          <h3>Module</h3>
          <BlockInspector document={doc} selected={selected} onChange={setDoc} />
        </aside>
        <div className="doc-mid">
          <p className="doc-notice">
            {status === 'published' ? 'Live after Publish. Drafts stay private until then.' : 'Draft — visible only here until you Publish.'}
          </p>
          <textarea
            className="doc-title"
            rows={1}
            placeholder="Title"
            value={title}
            onChange={(e) => {
              onTitle(e.target.value)
              e.currentTarget.style.height = 'auto'
              e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
          />
          <PageBuilder document={doc} onChange={setDoc} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <aside className="doc-right">
          <h3>Page settings</h3>
          <label>
            Public URL
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
            />
          </label>
          {live ? (
            <p className="ad-empty">
              <a href={live} target="_blank" rel="noreferrer">
                {live}
              </a>
            </p>
          ) : (
            <p className="ad-empty">After you publish, readers open /{slugify(slug)}</p>
          )}
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
            SEO title
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </label>
          <label>
            SEO description
            <textarea rows={3} value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} />
          </label>
          <label className="ad-check">
            <input type="checkbox" checked={asHome} onChange={(e) => setAsHome(e.target.checked)} />
            Use as website homepage. /free stays the kit.
          </label>
          {!isNew && revs.length > 0 ? (
            <div>
              <h3>Revisions</h3>
              <ul className="ad-revs">
                {revs.map((r) => (
                  <li key={r.id}>
                    {new Date(r.created_at).toLocaleString()}{' '}
                    <button type="button" className="ad-link" onClick={() => restore(r.id)}>
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </form>
  )
}
