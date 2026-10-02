import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '../../lib/supabaseBrowser'
import { slugify } from '../../cms/document'

export type ContentRow = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'scheduled' | 'trash'
  updated_at: string
  parent_id: string | null
}

export default function PagesList() {
  const [rows, setRows] = useState<ContentRow[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'trash'>('all')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const sb = supabaseBrowser()
    if (!sb) return
    let query = sb.from('contents').select('id, title, slug, status, updated_at, parent_id').eq('kind', 'page').order('updated_at', { ascending: false })
    const { data, error } = await query
    if (error) setErr(error.message)
    else setRows((data ?? []) as ContentRow[])
  }

  useEffect(() => {
    load()
  }, [])

  const shown = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'all' && r.status === 'trash') return false
      if (filter !== 'all' && r.status !== filter) return false
      if (q.trim() && !`${r.title} ${r.slug}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
  }, [rows, q, filter])

  async function trashSelected() {
    const ids = Object.keys(picked).filter((id) => picked[id])
    if (!ids.length) return
    if (!confirm(`Move ${ids.length} page(s) to trash?`)) return
    const sb = supabaseBrowser()
    if (!sb) return
    setBusy(true)
    const { error } = await sb.from('contents').update({ status: 'trash' }).in('id', ids)
    setBusy(false)
    if (error) setErr(error.message)
    else {
      setPicked({})
      await load()
    }
  }

  async function duplicate(row: ContentRow) {
    const sb = supabaseBrowser()
    if (!sb) return
    const { data: full, error: readErr } = await sb.from('contents').select('*').eq('id', row.id).single()
    if (readErr || !full) {
      setErr(readErr?.message ?? 'Could not copy that page.')
      return
    }
    const { id: _id, created_at: _c, published_at: _p, ...rest } = full
    const { error } = await sb.from('contents').insert({
      ...rest,
      title: `${full.title} (copy)`,
      slug: `${slugify(full.slug)}-copy`,
      status: 'draft',
      published_document: null,
      published_at: null,
    })
    if (error) setErr(error.message)
    else await load()
  }

  return (
    <div className="ad-panel">
      <div className="ad-toolbar">
        <a className="ad-btn" href="/admin/pages/new">
          Add page
        </a>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or slug" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All (hide trash)</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
          <option value="trash">Trash</option>
        </select>
        <button type="button" className="ad-btn danger" disabled={busy} onClick={trashSelected}>
          Trash selected
        </button>
      </div>
      {err ? <p className="ad-empty" style={{ color: 'var(--ad-danger)' }}>{err}</p> : null}
      {shown.length === 0 ? (
        <p className="ad-empty">No pages yet. Add a page to start. The live kit at /free stays as-is until you set a published homepage in Settings on the editor.</p>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th />
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={Boolean(picked[row.id])}
                    onChange={(e) => setPicked((p) => ({ ...p, [row.id]: e.target.checked }))}
                  />
                </td>
                <td>
                  <a href={`/admin/pages/${row.id}`}>{row.title}</a>
                </td>
                <td>/{row.slug}</td>
                <td>{row.status}</td>
                <td>{new Date(row.updated_at).toLocaleString()}</td>
                <td>
                  <button type="button" className="ad-link" onClick={() => duplicate(row)}>
                    Duplicate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
