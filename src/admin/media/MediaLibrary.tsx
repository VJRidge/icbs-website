import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteMedia, listMedia, mediaKind, publicMediaUrl, uploadMedia, type MediaRow } from '../../lib/media'

type Filter = 'all' | 'image' | 'video' | 'audio' | 'other'

export default function MediaLibrary() {
  const input = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<MediaRow[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  async function load() {
    const { rows: next, error } = await listMedia()
    setRows(next)
    setErr(error)
  }

  useEffect(() => {
    load()
  }, [])

  const shown = useMemo(() => {
    return rows.filter((r) => {
      const kind = mediaKind(r.mime, r.path)
      if (filter !== 'all' && kind !== filter) return false
      if (q.trim() && !`${r.title} ${r.path}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
  }, [rows, q, filter])

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setErr('')
    for (const file of Array.from(files)) {
      const { error } = await uploadMedia(file)
      if (error) setErr(error)
    }
    setBusy(false)
    await load()
  }

  return (
    <div className="media-page">
      <div className="media-head">
        <div>
          <h2>Media library</h2>
          <p>Images and files for pages. Uploads go to the public media bucket.</p>
        </div>
        <button type="button" className="ad-btn" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={input} type="file" hidden multiple accept="image/*,video/*,audio/*,.pdf" onChange={(e) => onFiles(e.target.files)} />
      </div>
      <div className="ad-toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search filename" />
        {(['all', 'image', 'video', 'audio', 'other'] as Filter[]).map((id) => (
          <button key={id} type="button" className={`ad-chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>
            {id === 'all' ? 'All' : id}
          </button>
        ))}
        <span className="ad-empty">{shown.length} files</span>
      </div>
      {err ? <p className="ad-empty" style={{ color: 'var(--ad-danger)' }}>{err}</p> : null}
      {shown.length === 0 ? (
        <p className="ad-empty">No files yet. Upload an image to use it in a page block.</p>
      ) : (
        <div className="media-grid">
          {shown.map((row) => {
            const url = publicMediaUrl(row)
            const kind = mediaKind(row.mime, row.path)
            return (
              <article key={row.id} className="media-tile">
                {kind === 'image' ? <img src={url} alt={row.alt || row.title || ''} /> : <div className="media-ph">{kind}</div>}
                <p>{row.title || row.path.split('/').pop()}</p>
                <time>{new Date(row.created_at).toLocaleDateString()}</time>
                <div>
                  <button
                    type="button"
                    className="ad-link"
                    onClick={async () => {
                      await navigator.clipboard.writeText(url)
                      setCopied(row.id)
                    }}
                  >
                    {copied === row.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="ad-link"
                    onClick={async () => {
                      if (!confirm('Delete this file?')) return
                      const { error } = await deleteMedia(row)
                      if (error) setErr(error)
                      else await load()
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
