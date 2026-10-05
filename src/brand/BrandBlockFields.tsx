import { useEffect, useState } from 'react'
import { Images } from 'lucide-react'
import FileUpload from '../studio/components/FileUpload'
import { scrollToKitField, subscribeKitField, takePendingKitField } from '../studio/components/blog/blocks/brand/kitFieldFocus'
import { useBlogAdminMediaLibrary } from '../studio/contexts/BlogAdminMediaLibraryContext'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { isPieceHidden, pieceLabel } from './brandPieces'

const TEXT: Record<string, string[]> = {
  brand_hero: ['headerLabel', 'headerHref', 'eyebrow', 'headline', 'highlight', 'statement', 'mediaLabel', 'photoUrl', 'mediaUrl', 'primaryLabel', 'primaryHref', 'secondaryLabel', 'secondaryHref', 'bookTitle', 'bookText', 'bookPrice', 'bookCover', 'bookAlt', 'bookHref', 'bookLabel', 'kitHref', 'kitLabel'],
  brand_topics: ['label', 'heading'],
  brand_columns: ['label', 'heading'],
  brand_cards: ['label', 'heading', 'note', 'linkLabel', 'linkHref'],
  brand_projects: ['label', 'heading', 'note'],
  brand_product: ['label', 'title', 'text', 'price', 'coverUrl', 'coverAlt', 'primaryLabel', 'primaryHref', 'secondaryLabel', 'secondaryHref', 'note'],
  brand_newsletter: ['heading', 'text', 'buttonLabel'],
  brand_library: ['headerLabel', 'headerHref', 'heading', 'lede'],
  brand_quote: ['heading', 'text', 'mediaLabel', 'videoUrl'],
  brand_contact: ['headerLabel', 'headerHref', 'headline', 'highlight', 'lede'],
  brand_catalog: ['headerLabel', 'headerHref', 'heading', 'lede', 'note'],
  brand_previews: ['label', 'heading'],
  brand_compare: ['heading', 'kitHeading', 'bookHeading'],
  brand_faq: ['heading'],
  brand_thanks: ['headerLabel', 'headerHref', 'heading', 'text', 'downloadLabel', 'downloadHref', 'bookTitle', 'bookText', 'bookPrice', 'bookLabel', 'bookHref', 'bookNote', 'resourcesLabel', 'resourcesHref'],
  brand_article: ['headerLabel', 'headerHref', 'eyebrow', 'heading', 'lede', 'bookLabel', 'bookHref'],
}

const MEDIA = new Set(['photoUrl', 'mediaUrl', 'bookCover', 'coverUrl', 'videoUrl'])
const LABELS: Record<string, string> = {
  headerLabel: 'Header button',
  headerHref: 'Header button link',
  photoUrl: 'Meet photo',
  mediaUrl: 'Photo or video',
  mediaLabel: 'Photo or video label',
  bookCover: 'Book cover',
  coverUrl: 'Cover image',
  videoUrl: 'Video',
  primaryLabel: 'Button',
  primaryHref: 'Button link',
  secondaryLabel: 'Second button or photo caption',
  secondaryHref: 'Second link',
  heading: 'Heading',
  label: 'Small label',
  note: 'Note',
  title: 'Title',
  text: 'Text',
  lede: 'Intro',
  price: 'Price',
  linkLabel: 'Button',
  linkHref: 'Button link',
}

type ItemField = { key: string; label: string; hint?: string; media?: boolean; multiline?: boolean }

const ITEM_FIELDS: Record<string, ItemField[]> = {
  brand_cards: [
    { key: 'meta', label: 'Small label', hint: 'The short word above the title, such as Article or Video.' },
    { key: 'title', label: 'Title' },
    { key: 'text', label: 'Description', multiline: true },
    { key: 'href', label: 'Link', hint: 'The page this card opens, such as /resources/your-post.' },
    { key: 'format', label: 'Kind', hint: 'Article, Tutorial, Video, or Download. The library uses this as a filter.' },
  ],
  brand_projects: [
    { key: 'title', label: 'Title' },
    { key: 'text', label: 'Description', multiline: true },
    { key: 'image', label: 'Image', media: true, hint: 'A photo for this project.' },
    { key: 'href', label: 'Link', hint: 'Optional. Where this project goes.' },
  ],
  brand_previews: [
    { key: 'title', label: 'Caption' },
    { key: 'href', label: 'Page image', media: true, hint: 'A picture of a page. Visitors click it to see it larger. This is not a link to a post.' },
    { key: 'meta', label: 'Image description', hint: 'What the picture shows, for someone who cannot see it.' },
  ],
  brand_topics: [
    { key: 'title', label: 'Title' },
    { key: 'text', label: 'Description', multiline: true },
    { key: 'href', label: 'Link' },
  ],
  brand_columns: [
    { key: 'title', label: 'Title' },
    { key: 'text', label: 'Description', multiline: true },
  ],
  brand_library: [
    { key: 'meta', label: 'Small label' },
    { key: 'title', label: 'Title' },
    { key: 'text', label: 'Description', multiline: true },
    { key: 'href', label: 'Link', hint: 'The page this card opens.' },
    { key: 'format', label: 'Kind', hint: 'Article, Tutorial, Video, or Download.' },
    { key: 'topic', label: 'Search words', hint: 'Extra words the search box matches. Visitors do not see this line.' },
  ],
  brand_catalog: [
    { key: 'title', label: 'Title' },
    { key: 'text', label: 'Description', multiline: true },
    { key: 'meta', label: 'Free or paid', hint: 'Paid shows the book cover. Free shows the kit cover.' },
    { key: 'format', label: 'Format', hint: 'Such as Digital PDF.' },
    { key: 'href', label: 'Link' },
  ],
  brand_faq: [
    { key: 'title', label: 'Question' },
    { key: 'text', label: 'Answer', multiline: true },
  ],
  brand_article: [
    { key: 'title', label: 'Step title' },
    { key: 'text', label: 'Step text', multiline: true },
  ],
  brand_contact: [
    { key: 'title', label: 'Topic' },
    { key: 'text', label: 'Description', multiline: true },
  ],
}

const ITEM_NAME: Record<string, string> = {
  brand_cards: 'Card',
  brand_projects: 'Project',
  brand_previews: 'Screenshot',
  brand_topics: 'Card',
  brand_columns: 'Column',
  brand_library: 'Resource',
  brand_catalog: 'Product',
  brand_faq: 'Question',
  brand_article: 'Step',
  brand_contact: 'Topic',
}

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none'

function MediaField({ fieldKey, active, label, value, onChange }: { fieldKey: string; active: boolean; label: string; value: string; onChange: (v: string) => void }) {
  const { openMediaLibrary } = useBlogAdminMediaLibrary()
  return (
    <div data-kit-field={fieldKey} className={`space-y-2 rounded-lg p-1 ${active ? 'bg-[#FFF475]/40 ring-2 ring-[#F3D13D]' : ''}`}>
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <FileUpload variant="compact" bucket="media-public" type="all" accept="image/*,video/*" value={value} onChange={onChange} />
        <button
          type="button"
          onClick={() => openMediaLibrary(onChange, label)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-brand-blue/40"
        >
          <Images size={14} /> Library
        </button>
      </div>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/img/... or https://..." />
    </div>
  )
}

function Field({ fieldKey, active, label, value, onChange, multiline = false }: { fieldKey: string; active: boolean; label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <label data-kit-field={fieldKey} className={`block rounded-lg p-1 text-xs text-slate-700 ${active ? 'bg-[#FFF475]/40 ring-2 ring-[#F3D13D]' : ''}`}>
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      {multiline ? (
        <textarea className={inputCls} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

export default function BrandBlockFields({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock)
  const [activeField, setActiveField] = useState<string | null>(null)
  const data = block.data
  const keys = TEXT[block.type] ?? []
  const listKey = Array.isArray(data.items) ? 'items' : Array.isArray(data.rows) ? 'rows' : Array.isArray(data.steps) ? 'steps' : ''
  const list = listKey && Array.isArray(data[listKey]) ? (data[listKey] as Array<Record<string, unknown>>) : []

  function setList(next: Array<Record<string, unknown>>) {
    updateBlock(block.id, { [listKey]: next })
  }

  useEffect(() => {
    const show = (field: string) => {
      setActiveField(field)
      requestAnimationFrame(() => scrollToKitField(block.id, field))
    }
    const pending = takePendingKitField(block.id)
    if (pending) show(pending)
    return subscribeKitField((target) => {
      if (target.blockId !== block.id) return
      if (!target.field) {
        setActiveField(null)
        return
      }
      takePendingKitField(block.id)
      show(target.field)
    })
  }, [block.id])

  function setHidden(key: string, hidden: boolean) {
    const prev = data.hiddenFields
    const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...(prev as Record<string, boolean>) } : {}
    updateBlock(block.id, { hiddenFields: { ...base, [key]: hidden } })
  }

  return (
    <div data-kit-fields-for={block.id} className="space-y-3">
      {activeField ? (
        <div className="rounded-lg border-2 border-[#F3D13D] bg-[#FFF475]/40 p-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#151412]">{pieceLabel(activeField)}</p>
          <p className="mb-2 text-[11px] leading-relaxed text-slate-600">Open Style to change the font, size, weight, color, spacing, shadow, background, or hover.</p>
          {isPieceHidden(data, activeField) ? (
            <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[#1A5340]" onClick={() => setHidden(activeField, false)}>
              Put it back
            </button>
          ) : (
            <>
              <input
                className={inputCls}
                value={String(data[activeField] ?? '')}
                onChange={(e) => updateBlock(block.id, { [activeField]: e.target.value })}
              />
              <button type="button" className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#B53D0D]" onClick={() => setHidden(activeField, true)}>
                Delete
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Click a title, paragraph, or button on the canvas. The green bar on the section moves or deletes the whole section.</p>
      )}
      {keys.map((key) => (
        MEDIA.has(key) ? (
          <MediaField
            key={key}
            fieldKey={key}
            active={activeField === key}
            label={LABELS[key] ?? key}
            value={String(data[key] ?? '')}
            onChange={(value) => updateBlock(block.id, { [key]: value })}
          />
        ) : (
          <Field
            key={key}
            fieldKey={key}
            active={activeField === key}
            label={LABELS[key] ?? key}
            value={String(data[key] ?? '')}
            multiline={['statement', 'text', 'lede', 'note', 'bookText', 'bookNote'].includes(key)}
            onChange={(value) => updateBlock(block.id, { [key]: value })}
          />
        )
      ))}
      {block.type === 'brand_hero' ? (
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(data.showForm)}
            onChange={(e) => updateBlock(block.id, { showForm: e.target.checked })}
          />
          Show the free-kit form
        </label>
      ) : null}
      {block.type === 'brand_previews' ? (
        <p className="text-xs leading-relaxed text-slate-600">Each screenshot is a picture of a page. Put the picture in Page image. It opens larger when someone clicks it. To feature a blog post, use a resource card and put the post address in Link.</p>
      ) : null}
      {list.map((row, index) => {
        const schema = listKey === 'items'
          ? ITEM_FIELDS[block.type]
          : listKey === 'rows'
            ? [
                { key: 'label', label: 'Row name' },
                { key: 'kit', label: 'Free kit' },
                { key: 'book', label: 'Complete book' },
              ]
            : listKey === 'steps'
              ? [
                  { key: 'title', label: 'Step title' },
                  { key: 'text', label: 'Step text', multiline: true },
                ]
              : undefined
        const fields: ItemField[] = schema ?? Object.keys(row)
          .filter((key) => typeof row[key] !== 'boolean')
          .map((key) => ({ key, label: key, multiline: key === 'text' }))
        return (
        <fieldset key={`${listKey}-${index}`} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{ITEM_NAME[block.type] ?? listKey} {index + 1}</legend>
          {fields.map((field) => {
            const fieldKey = `${listKey}.${index}.${field.key}`
            const onChange = (value: string) => {
              const next = list.map((item, i) => (i === index ? { ...item, [field.key]: value } : item))
              setList(next)
            }
            return field.media ? (
              <div key={field.key}>
                <MediaField fieldKey={fieldKey} active={activeField === fieldKey} label={field.label} value={String(row[field.key] ?? '')} onChange={onChange} />
                {field.hint ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{field.hint}</p> : null}
              </div>
            ) : (
              <div key={field.key}>
                <Field
                  fieldKey={fieldKey}
                  active={activeField === fieldKey}
                  label={field.label}
                  value={String(row[field.key] ?? '')}
                  multiline={Boolean(field.multiline)}
                  onChange={onChange}
                />
                {field.hint ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{field.hint}</p> : null}
              </div>
            )
          })}
          {typeof row.sample === 'boolean' ? (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(row.sample)}
                onChange={(e) => {
                  const next = list.map((item, i) => (i === index ? { ...item, sample: e.target.checked } : item))
                  setList(next)
                }}
              />
              Sample — not published
            </label>
          ) : null}
          <button
            type="button"
            className="text-[10px] font-black uppercase tracking-widest text-[#B53D0D]"
            onClick={() => setList(list.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </fieldset>
        )
      })}
      {listKey === 'items' ? (
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600"
          onClick={() => {
            const blank: Record<string, unknown> = { title: 'New item', text: '', sample: false }
            for (const field of ITEM_FIELDS[block.type] ?? []) blank[field.key] = ''
            setList([...list, blank])
          }}
        >
          Add item
        </button>
      ) : null}
    </div>
  )
}
