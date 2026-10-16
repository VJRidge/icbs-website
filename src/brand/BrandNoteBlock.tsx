import { noteAnchor, noteParagraphs } from './brandNote'
import { useBrandEdit } from './brandEditContext'

function str(data: Record<string, unknown>, key: string): string {
  return String(data[key] ?? '')
}

export default function BrandNoteBlock({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const paragraphs = noteParagraphs(data)
  const rawItems = Array.isArray(data.items) ? data.items : []
  const anchor = noteAnchor(data)
  return (
    <section className={str(data, 'heading') ? 'vj-sec' : 'vj-sec tight'} id={anchor || undefined}>
      <div className="vj-wrap">
        <div className="vj-note-article">
          {str(data, 'eyebrow') ? <p className="vj-k">{str(data, 'eyebrow')}</p> : null}
          {str(data, 'heading') ? <h2>{str(data, 'heading')}</h2> : null}
          {edit
            ? rawItems.map((raw, index) => {
                const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
                return (
                  <p key={index}>{String(row.text ?? '')}</p>
                )
              })
            : paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
        </div>
      </div>
    </section>
  )
}
