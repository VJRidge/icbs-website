import { useEffect, useRef, useState } from 'react'
import { listMedia, mediaKind, publicMediaUrl, type MediaRow } from '../../lib/media'

export default function MediaPicker({ onPick, onClose }: { onPick: (url: string, alt: string) => void; onClose: () => void }) {
  const [rows, setRows] = useState<MediaRow[]>([])
  const [err, setErr] = useState('')
  useEffect(() => {
    listMedia().then(({ rows: next, error }) => {
      setRows(next)
      setErr(error)
    })
  }, [])
  const images = rows.filter((r) => mediaKind(r.mime, r.path) === 'image')
  return (
    <div className="doc-modal" role="dialog" aria-label="Media library">
      <button type="button" className="doc-modal-bg" onClick={onClose} aria-label="Close" />
      <div className="doc-modal-card wide">
        <div className="doc-modal-search">
          <b>Insert from media library</b>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {err ? <p className="ad-empty">{err}</p> : null}
        {images.length === 0 ? (
          <p className="ad-empty" style={{ padding: 20 }}>
            No images yet. Open Media Library in the sidebar to upload.
          </p>
        ) : (
          <div className="media-grid compact">
            {images.map((row) => {
              const url = publicMediaUrl(row)
              return (
                <button key={row.id} type="button" className="media-card" onClick={() => onPick(url, row.alt || row.title || '')}>
                  <img src={url} alt={row.alt || row.title || ''} />
                  <span>{row.title || row.path}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
