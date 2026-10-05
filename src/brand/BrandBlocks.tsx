import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import SignupForm from '../components/SignupForm'
import { KitBlockView } from '../studio/components/blog/blocks/brand/KitBlocks'
import { useResolvableHref } from './cardHref'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { useBrandEdit } from './brandEditContext'
import { highlightedText } from './headingHighlight'
import { isPieceHidden, pieceBag, pieceCss, pieceHover, widgetName } from './brandPieces'
import './brand.css'

type Item = {
  title: string
  text: string
  meta: string
  href: string
  format: string
  topic: string
  image: string
  sample: boolean
  featured: boolean
}

function str(data: Record<string, unknown>, key: string): string {
  return String(data[key] ?? '')
}

function visibleItems(data: Record<string, unknown>): Item[] {
  return items(data)
}

function mediaFace(url: string, label: string) {
  if (!url) return label
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)) return <video src={url} controls playsInline />
  return <img src={url} alt={label.trim() || 'Photo'} />
}

function items(data: Record<string, unknown>): Item[] {
  if (!Array.isArray(data.items)) return []
  return data.items.map((raw) => {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    return {
      title: String(o.title ?? ''),
      text: String(o.text ?? ''),
      meta: String(o.meta ?? ''),
      href: String(o.href ?? ''),
      format: String(o.format ?? ''),
      topic: String(o.topic ?? ''),
      image: String(o.image ?? ''),
      sample: Boolean(o.sample),
      featured: Boolean(o.featured),
    }
  })
}

function Highlighted({ text, highlight }: { text: string; highlight: string }) {
  return <>{highlightedText(text, highlight)}</>
}

function Editable({
  data,
  field,
  as,
  className,
  href,
  children,
}: {
  data: Record<string, unknown>
  field: string
  label?: string
  as: 'h1' | 'h2' | 'h3' | 'p' | 'a' | 'div'
  className?: string
  href?: string
  children: ReactNode
}) {
  const edit = useBrandEdit()
  if (isPieceHidden(data, field)) return null
  const selected = edit?.selectedField === field
  const style = pieceCss(data, field)
  const hover = pieceHover(data, field) ? '' : undefined
  const classes = `${className ?? ''} ${edit ? 'vj-piece' : ''} ${selected ? 'vj-piece-on' : ''}`.trim()
  const onClick = edit
    ? (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        edit.focusField(field)
      }
    : undefined
  const bar = selected && edit ? (
    <span className="vj-piece-bar" onClick={(event) => event.stopPropagation()}>
      {widgetName(field)}
      <button type="button" onClick={() => edit.hideField(field)}>Delete</button>
    </span>
  ) : null
  const storedTag = pieceBag(data, 'elementTags')[field] ?? ''
  const storedLink = pieceBag(data, 'elementLinks')[field] ?? ''
  const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div']
  const kind = as === 'a' ? 'a' : levels.includes(storedTag) ? storedTag : as
  const body = !edit && storedLink && kind !== 'a' ? <a href={storedLink}>{children}</a> : children
  const shared = { className: classes, style, 'data-hover': hover, onClick }
  if (kind === 'h1') return <h1 {...shared}>{bar}{body}</h1>
  if (kind === 'h2') return <h2 {...shared}>{bar}{body}</h2>
  if (kind === 'h3') return <h3 {...shared}>{bar}{body}</h3>
  if (kind === 'h4') return <h4 {...shared}>{bar}{body}</h4>
  if (kind === 'h5') return <h5 {...shared}>{bar}{body}</h5>
  if (kind === 'h6') return <h6 {...shared}>{bar}{body}</h6>
  if (kind === 'p') return <p {...shared}>{bar}{body}</p>
  if (kind === 'a') return <a {...shared} href={storedLink || href}>{bar}{body}</a>
  return <div {...shared}>{bar}{body}</div>
}

function CardFacts({ item }: { item: Item }) {
  const line = [item.format, item.topic].filter((part) => part && part !== item.meta).join(' · ')
  return (
    <>
      {line ? <p className="meta">{line}</p> : null}
      {item.sample ? <p className="vj-sample">Sample</p> : null}
    </>
  )
}

function Card({ data, index, item }: { data: Record<string, unknown>; index: number; item: Item }) {
  const edit = useBrandEdit()
  const href = useResolvableHref(item.href)
  const body = edit ? (
    <>
      {item.meta ? <Editable data={data} field={`items.${index}.meta`} label="Small label" as="p" className="vj-k">{item.meta}</Editable> : null}
      <Editable data={data} field={`items.${index}.title`} label="Title" as="h3">{item.title || 'Title'}</Editable>
      {item.text ? <Editable data={data} field={`items.${index}.text`} label="Description" as="p">{item.text}</Editable> : null}
      <CardFacts item={item} />
    </>
  ) : (
    <>
      {item.meta && !isPieceHidden(data, `items.${index}.meta`) ? <p className="vj-k">{item.meta}</p> : null}
      {isPieceHidden(data, `items.${index}.title`) ? null : <h3>{item.title}</h3>}
      {item.text && !isPieceHidden(data, `items.${index}.text`) ? <p>{item.text}</p> : null}
      <CardFacts item={item} />
    </>
  )
  if (edit || !href || item.sample && item.format === 'Video') {
    return <article className="vj-card">{body}</article>
  }
  return (
    <article className="vj-card">
      <a href={href}>{body}</a>
    </article>
  )
}

const BOOK_AD_KEY = 'vj-home-book-ad'

function rememberBookAd() {
  try {
    sessionStorage.setItem(BOOK_AD_KEY, '1')
  } catch {
    /* private mode or blocked storage */
  }
}

function bookAdDismissed(): boolean {
  try {
    return sessionStorage.getItem(BOOK_AD_KEY) === '1'
  } catch {
    return true
  }
}

function onBrandHome(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/'
}

function scrolledHalfway(): boolean {
  const root = document.documentElement
  const maxScroll = root.scrollHeight - window.innerHeight
  if (maxScroll <= 0) return false
  return window.scrollY >= maxScroll * 0.5
}

function BookAd({ data }: { data: Record<string, unknown> }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialog.current
    if (!el || el.open || !onBrandHome() || bookAdDismissed()) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    function openIfHalfway() {
      const node = dialog.current
      if (!node || node.open || bookAdDismissed() || !scrolledHalfway()) return
      node.showModal()
      window.removeEventListener('scroll', openIfHalfway)
      document.removeEventListener('scroll', openIfHalfway)
    }

    window.addEventListener('scroll', openIfHalfway, { passive: true })
    document.addEventListener('scroll', openIfHalfway, { passive: true })
    return () => {
      window.removeEventListener('scroll', openIfHalfway)
      document.removeEventListener('scroll', openIfHalfway)
    }
  }, [])

  function dismiss() {
    rememberBookAd()
    dialog.current?.close()
  }

  function onBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) dismiss()
  }

  return (
    <dialog
      ref={dialog}
      className="vj-book-ad"
      aria-labelledby="vj-book-ad-title"
      onClick={onBackdrop}
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
    >
      <button type="button" className="vj-book-ad-close" onClick={dismiss}>Close</button>
      <img src={str(data, 'bookCover') || '/img/book-cover.png'} alt={str(data, 'bookAlt')} />
      <div className="vj-book-ad-body">
        <h2 id="vj-book-ad-title">{str(data, 'bookTitle')}</h2>
        <p>{str(data, 'bookText')}</p>
        <p className="vj-note">{str(data, 'bookPrice')}</p>
        <div className="vj-actions">
          <a className="vj-btn" href={str(data, 'bookHref')} onClick={rememberBookAd}>{str(data, 'bookLabel')}</a>
          {str(data, 'kitLabel') ? <a className="vj-btn ghost" href={str(data, 'kitHref')} onClick={rememberBookAd}>{str(data, 'kitLabel')}</a> : null}
        </div>
      </div>
    </dialog>
  )
}

function PhotoFace({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const url = str(data, 'photoUrl')
  const label = str(data, 'mediaLabel')
  const face = url ? <img src={url} alt={label.trim() || 'Photo'} /> : label
  if (!edit) return <span className="vj-meet-photo">{face}</span>
  return (
    <button type="button" className="vj-meet-photo vj-pick" onClick={() => { edit.focusField('photoUrl'); edit.pickImage((next) => edit.setField('photoUrl', next), 'Meet photo') }}>
      {face}
      <span className="vj-pick-label">Change photo</span>
    </button>
  )
}

function ImagePiece({
  data,
  field,
  label,
  src,
  alt,
  onChange,
}: {
  data: Record<string, unknown>
  field: string
  label: string
  src: string
  alt: string
  onChange: (url: string) => void
}) {
  const edit = useBrandEdit()
  if (isPieceHidden(data, field)) {
    if (!edit) return null
    return (
      <button type="button" className="vj-piece" onClick={() => edit.showField(field)}>
        Put {label.toLowerCase()} back
      </button>
    )
  }
  const image = src ? <img src={src} alt={alt} /> : null
  if (!edit) return image
  const selected = edit.selectedField === field
  return (
    <div className={`vj-pick vj-piece ${selected ? 'vj-piece-on' : ''}`}>
      {selected ? (
        <span className="vj-piece-bar" onClick={(event) => event.stopPropagation()}>
          {label}
          <button type="button" onClick={() => edit.hideField(field)}>Delete</button>
        </span>
      ) : null}
      <button
        type="button"
        className="vj-pick"
        onClick={() => {
          edit.focusField(field)
          edit.pickImage(onChange, label)
        }}
      >
        {image ?? <span className="vj-pick-empty">Add image</span>}
        <span className="vj-pick-label">Change {label.toLowerCase()}</span>
      </button>
    </div>
  )
}

function CoverFace({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  return (
    <ImagePiece
      data={data}
      field="bookCover"
      label="Book cover"
      src={str(data, 'bookCover') || '/img/book-cover.png'}
      alt={str(data, 'bookAlt')}
      onChange={(next) => edit?.setField('bookCover', next)}
    />
  )
}

function MediaSlot({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const face = mediaFace(str(data, 'mediaUrl'), str(data, 'mediaLabel'))
  if (!edit) return <div className="vj-media">{face || <img src="/img/kit-cover.png" alt="Cover of the I Call BS Free Starter Kit" />}</div>
  return (
    <button type="button" className="vj-media vj-pick" onClick={() => { edit.focusField('mediaUrl'); edit.pickImage((next) => edit.setField('mediaUrl', next), 'Photo or video') }}>
      {face}
      <span className="vj-pick-label">Change photo or video</span>
    </button>
  )
}

function MeetLink({ data, children }: { data: Record<string, unknown>; children: ReactNode }) {
  const edit = useBrandEdit()
  if (edit) return <div className="vj-meet">{children}</div>
  return <a className="vj-meet" href={str(data, 'secondaryHref') || '/about'}>{children}</a>
}

function Hero({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const showForm = Boolean(data.showForm)
  const lead = Boolean(str(data, 'bookTitle'))
  const meet = lead && Boolean(str(data, 'mediaLabel')) && Boolean(str(data, 'secondaryLabel'))
  return (
    <>
      <section className={lead ? 'vj-sec vj-hero vj-hero-lead' : 'vj-sec'} id={showForm ? 'signup' : undefined}>
        <div className="vj-wrap vj-split">
          <div className="vj-hero-copy">
            {str(data, 'eyebrow') ? <Editable data={data} field="eyebrow" as="p" className="vj-k">{str(data, 'eyebrow')}</Editable> : null}
            <Editable data={data} field="headline" label="Title" as="h1">
              <Highlighted text={str(data, 'headline')} highlight={str(data, 'highlight')} />
            </Editable>
            {str(data, 'statement') ? <Editable data={data} field="statement" label="Paragraph" as="p" className="lede">{str(data, 'statement')}</Editable> : null}
            {showForm ? (
              <>
                <SignupForm
                  id="brand-kit"
                  buttonLabel={str(data, 'primaryLabel') || 'Send Me the Free Kit'}
                  thanksPath="/free-kit/thank-you"
                  finePrint="Free PDF from VettaJimale. Unsubscribe anytime."
                />
                <p className="vj-note">Get the PDF plus a few useful emails from VJ about building with AI and the complete book. Unsubscribe anytime. No payment required. First name is required because the signup list stores it.</p>
              </>
            ) : (
              <>
                {str(data, 'primaryLabel') || (!meet && str(data, 'secondaryLabel')) ? (
                  <div className="vj-actions">
                    {str(data, 'primaryLabel') ? <Editable data={data} field="primaryLabel" label="Button" as="a" className="vj-btn" href={str(data, 'primaryHref')}>{str(data, 'primaryLabel')}</Editable> : null}
                    {!meet && str(data, 'secondaryLabel') ? <a className="vj-btn ghost" href={str(data, 'secondaryHref')}>{str(data, 'secondaryLabel')}</a> : null}
                  </div>
                ) : null}
                {meet ? (
                  <MeetLink data={data}>
                    <PhotoFace data={data} />
                    <Editable data={data} field="secondaryLabel" label="Caption" as="div" className="vj-meet-label">{str(data, 'secondaryLabel')}</Editable>
                  </MeetLink>
                ) : null}
              </>
            )}
          </div>
          {lead ? (
            <aside className="vj-lead">
              <CoverFace data={data} />
              <div className="vj-lead-body">
                <Editable data={data} field="bookTitle" label="Book title" as="h2">{str(data, 'bookTitle')}</Editable>
                <Editable data={data} field="bookText" label="Book text" as="p">{str(data, 'bookText')}</Editable>
                <Editable data={data} field="bookPrice" label="Price" as="p" className="vj-note">{str(data, 'bookPrice')} · Digital PDF</Editable>
                <div className="vj-actions">
                  <Editable data={data} field="bookLabel" label="Button" as="a" className="vj-btn" href={str(data, 'bookHref')}>{str(data, 'bookLabel')}</Editable>
                  {str(data, 'kitLabel') ? <Editable data={data} field="kitLabel" label="Button" as="a" className="vj-btn ghost" href={str(data, 'kitHref')}>{str(data, 'kitLabel')}</Editable> : null}
                </div>
              </div>
            </aside>
          ) : (
            <MediaSlot data={data} />
          )}
        </div>
      </section>
      {lead && !edit ? <BookAd data={data} /> : null}
    </>
  )
}

function CardGrid({ data, forest = false }: { data: Record<string, unknown>; forest?: boolean }) {
  return (
    <section className={forest ? 'vj-sec vj-forest' : 'vj-sec'}>
      <div className="vj-wrap">
        {str(data, 'label') ? <Editable data={data} field="label" as="p" className="vj-k">{str(data, 'label')}</Editable> : null}
        {str(data, 'heading') ? <Editable data={data} field="heading" label="Heading" as="h2">{str(data, 'heading')}</Editable> : null}
        <div className="vj-grid">
          {items(data).map((item, index) => (
            <Card key={`${item.title}-${index}`} data={data} index={index} item={item} />
          ))}
        </div>
        {str(data, 'linkLabel') ? (
          <p><Editable data={data} field="linkLabel" label="Button" as="a" className="vj-btn" href={str(data, 'linkHref')}>{str(data, 'linkLabel')}</Editable></p>
        ) : null}
        {str(data, 'note') ? <p className="vj-note">{str(data, 'note')}</p> : null}
      </div>
    </section>
  )
}

function Projects({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const all = items(data).map((item, index) => ({ item, index }))
  const real = all.filter(({ item }) => item.title.trim().toLowerCase() !== 'project placeholder')
  const shown = real.length > 0 ? real : all
  if (shown.length === 0) return null
  return (
    <section className="vj-sec">
      <div className="vj-wrap">
        {str(data, 'label') ? <Editable data={data} field="label" label="Small label" as="p" className="vj-k">{str(data, 'label')}</Editable> : null}
        <Editable data={data} field="heading" label="Heading" as="h2">{str(data, 'heading')}</Editable>
        {str(data, 'note') ? <Editable data={data} field="note" label="Note" as="p" className="lede">{str(data, 'note')}</Editable> : null}
        <div className="vj-grid">
          {shown.map(({ item, index }) => (
            <article className="vj-card" key={`${item.title}-${index}`}>
              {edit ? (
                <ImagePiece
                  data={data}
                  field={`items.${index}.image`}
                  label="Project image"
                  src={item.image}
                  alt={item.title}
                  onChange={(url) => edit.setItem(index, 'image', url)}
                />
              ) : item.image && !isPieceHidden(data, `items.${index}.image`) ? (
                <img className="vj-card-media" src={item.image} alt={item.title} />
              ) : null}
              {edit ? (
                <>
                  <Editable data={data} field={`items.${index}.title`} label="Title" as="h3">{item.title || 'Title'}</Editable>
                  <Editable data={data} field={`items.${index}.text`} label="Description" as="p">{item.text || 'Description'}</Editable>
                </>
              ) : (
                <>
                  {isPieceHidden(data, `items.${index}.title`) ? null : <h3>{item.title}</h3>}
                  {isPieceHidden(data, `items.${index}.text`) ? null : <p>{item.text}</p>}
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductCover({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  if (isPieceHidden(data, 'coverUrl')) return <ImagePiece data={data} field="coverUrl" label="Book cover" src="" alt="" onChange={() => undefined} />
  return (
    <ImagePiece
      data={data}
      field="coverUrl"
      label="Book cover"
      src={str(data, 'coverUrl') || '/img/book-cover.png'}
      alt={str(data, 'coverAlt')}
      onChange={(next) => edit?.setField('coverUrl', next)}
    />
  )
}

function Product({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const coverHidden = isPieceHidden(data, 'coverUrl')
  return (
    <section className="vj-sec tight" id={str(data, 'anchor') || undefined}>
      <div className="vj-wrap">
        <div className={coverHidden ? 'vj-product vj-product-plain' : 'vj-product'}>
          {coverHidden && !edit ? null : <ProductCover data={data} />}
          <div>
            {str(data, 'label') ? <Editable data={data} field="label" label="Small label" as="p" className="vj-k">{str(data, 'label')}</Editable> : null}
            <Editable data={data} field="title" label="Title" as="h2">{str(data, 'title')}</Editable>
            <Editable data={data} field="text" label="Text" as="p">{str(data, 'text')}</Editable>
            <Editable data={data} field="price" label="Price" as="p" className="vj-note">{str(data, 'price')} · Digital PDF</Editable>
            <div className="vj-actions">
              {str(data, 'primaryLabel') ? <Editable data={data} field="primaryLabel" label="Button" as="a" className="vj-btn" href={str(data, 'primaryHref')}>{str(data, 'primaryLabel')}</Editable> : null}
              {str(data, 'secondaryLabel') ? <Editable data={data} field="secondaryLabel" label="Second button" as="a" className="vj-btn ghost" href={str(data, 'secondaryHref')}>{str(data, 'secondaryLabel')}</Editable> : null}
            </div>
            {str(data, 'note') ? <Editable data={data} field="note" label="Note" as="p" className="vj-note">{str(data, 'note')}</Editable> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function Newsletter({ data }: { data: Record<string, unknown> }) {
  const emailId = useId()

  return (
    <section className="vj-sec vj-forest">
      <div className="vj-wrap">
        <h2>{str(data, 'heading')}</h2>
        <p className="lede">{str(data, 'text')}</p>
        <form className="vj-form" onSubmit={(event) => event.preventDefault()}>
          <p>This list is not open yet.</p>
          <label htmlFor={emailId}>Email address</label>
          <input id={emailId} name="email" type="email" autoComplete="email" disabled />
          <button className="vj-btn" type="button" disabled>Not open yet</button>
        </form>
      </div>
    </section>
  )
}

const FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'Video', label: 'Videos' },
  { id: 'Tutorial', label: 'Tutorials' },
  { id: 'Article', label: 'Articles' },
  { id: 'Download', label: 'Downloads' },
] as const

function Library({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const list = visibleItems(data)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('All')
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase()
    return list.filter((item) => {
      const formatOk = filter === 'All' || item.format === filter
      const hay = `${item.title} ${item.text} ${item.topic}`.toLowerCase()
      return formatOk && (!query || hay.includes(query))
    })
  }, [list, q, filter])
  const featured = shown.find((item) => item.featured) ?? null
  const featuredHref = useResolvableHref(featured?.href ?? '')
  const rest = shown.filter((item) => item !== featured)

  return (
    <section className="vj-sec">
      <div className="vj-wrap">
        <h1>{str(data, 'heading')}</h1>
        <p className="lede">{str(data, 'lede')}</p>
        <div className="vj-search">
          <label className="sr" htmlFor="vj-resource-search" style={{ position: 'absolute', left: -9999 }}>Search resources</label>
          <input id="vj-resource-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources" />
          {FILTERS.map((name) => (
            <button key={name.id} type="button" className="vj-chip" aria-pressed={filter === name.id} onClick={() => setFilter(name.id)}>{name.label}</button>
          ))}
        </div>
        {shown.length === 0 ? <p>Nothing matches that search.</p> : null}
        {featured ? (
          <div className="vj-product" style={{ marginBottom: 16 }}>
            <div className="vj-media">Featured</div>
            <div>
              <p className="vj-k">{featured.format}{featured.topic ? ` · ${featured.topic}` : ''}</p>
              <h2>{featured.title}</h2>
              <p>{featured.text}</p>
              {featured.sample ? <p className="vj-sample">Sample</p> : null}
              {featuredHref ? <a className="vj-btn" href={featuredHref}>Read it</a> : null}
            </div>
          </div>
        ) : null}
        <div className="vj-grid">
          {rest.map((item) => {
            const index = items(data).findIndex((row) => row.title === item.title && row.href === item.href)
            return <Card key={`${item.title}-${index}`} data={data} index={Math.max(0, index)} item={item} />
          })}
        </div>
      </div>
    </section>
  )
}

function Quote({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const face = mediaFace(str(data, 'videoUrl'), str(data, 'mediaLabel'))
  const slot = edit ? (
    <button type="button" className="vj-media vj-pick" onClick={() => { edit.focusField('videoUrl'); edit.pickImage((next) => edit.setField('videoUrl', next), 'Video') }}>
      {face}
      <span className="vj-pick-label">Change video</span>
    </button>
  ) : (
    <div className="vj-media">{face}</div>
  )
  return (
    <section className="vj-sec vj-forest">
      <div className="vj-wrap vj-split">
        <div>
          <p className="vj-k">{str(data, 'heading')}</p>
          <h2>{str(data, 'text')}</h2>
        </div>
        {slot}
      </div>
    </section>
  )
}

function ContactBlock({ data }: { data: Record<string, unknown> }) {
  const topics = items(data)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          message: `[${form.get('topic')}] ${form.get('message')}`,
          company: form.get('company'),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || 'Something went wrong. Please try again.')
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <section className="vj-sec">
      <div className="vj-wrap vj-split">
        <div>
          <Editable data={data} field="headline" label="Title" as="h1">
            <Highlighted text={str(data, 'headline')} highlight={str(data, 'highlight')} />
          </Editable>
          <Editable data={data} field="lede" label="Paragraph" as="p" className="lede">{str(data, 'lede')}</Editable>
          {sent ? <p>Got it. I’ll read this.</p> : (
            <form className="vj-form" onSubmit={onSubmit}>
              <label htmlFor="vj-name">Name</label>
              <input id="vj-name" name="name" autoComplete="name" required maxLength={120} />
              <label htmlFor="vj-email">Email</label>
              <input id="vj-email" name="email" type="email" autoComplete="email" required maxLength={200} />
              <label htmlFor="vj-topic">Topic</label>
              <select id="vj-topic" name="topic" required defaultValue="">
                <option value="" disabled>Select a topic</option>
                {topics.map((topic) => <option key={topic.title} value={topic.title}>{topic.title}</option>)}
              </select>
              <label htmlFor="vj-message">Message</label>
              <textarea id="vj-message" name="message" required maxLength={4000} rows={5} />
              <div style={{ position: 'absolute', left: -9999 }} aria-hidden="true">
                <label htmlFor="vj-company">Company</label>
                <input id="vj-company" name="company" tabIndex={-1} autoComplete="off" />
              </div>
              {error ? <p className="vj-err" role="alert">{error}</p> : null}
              <button className="vj-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
            </form>
          )}
        </div>
        <div>
          <p className="vj-k">Let’s talk about</p>
          <div className="vj-grid" style={{ gridTemplateColumns: '1fr' }}>
            {topics.map((topic) => (
              <article className="vj-card" key={topic.title}>
                <h3>{topic.title}</h3>
                <p>{topic.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Catalog({ data }: { data: Record<string, unknown> }) {
  return (
    <section className="vj-sec">
      <div className="vj-wrap">
        <h1>{str(data, 'heading')}</h1>
        <p className="lede">{str(data, 'lede')}</p>
        {str(data, 'note') ? <p className="vj-note">{str(data, 'note')}</p> : null}
        <div className="vj-catalog">
          {items(data).map((item) => (
            <article className="vj-offer" key={item.title}>
              <img src={item.meta === 'Paid' ? '/img/book-cover.png' : '/img/kit-cover.png'} alt={item.title} />
              <div>
                <p className="vj-badge">{item.meta} · {item.format}</p>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
                {item.href.trim() ? <a className="vj-btn" href={item.href}>{item.meta === 'Free' ? 'Get the free kit' : 'View the book'}</a> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Previews({ data }: { data: Record<string, unknown> }) {
  const edit = useBrandEdit()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState<{ src: string; alt: string } | null>(null)
  return (
    <section className="vj-sec">
      <div className="vj-wrap">
        <p className="vj-k">{str(data, 'label')}</p>
        <h2>{str(data, 'heading')}</h2>
        <div className="vj-previews">
          {items(data).map((item, index) => (
            <figure key={`${item.title}-${index}`}>
              {edit ? (
                <ImagePiece
                  data={data}
                  field={`items.${index}.href`}
                  label="Page image"
                  src={item.href}
                  alt={item.meta || item.title}
                  onChange={(url) => edit.setItem(index, 'href', url)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen({ src: item.href, alt: item.meta || item.title })
                    dialog.current?.showModal()
                  }}
                >
                  <img src={item.href} alt={item.meta || item.title} />
                </button>
              )}
              {edit ? <Editable data={data} field={`items.${index}.title`} label="Caption" as="p">{item.title || 'Caption'}</Editable> : <figcaption>{item.title}</figcaption>}
            </figure>
          ))}
        </div>
        <dialog
          ref={dialog}
          onClick={() => dialog.current?.close()}
          onClose={() => setOpen(null)}
        >
          {open ? <img src={open.src} alt={open.alt} /> : null}
        </dialog>
      </div>
    </section>
  )
}

function Compare({ data }: { data: Record<string, unknown> }) {
  const rows = Array.isArray(data.rows) ? data.rows as Array<Record<string, unknown>> : []
  return (
    <section className="vj-sec" style={{ background: 'var(--surface)' }}>
      <div className="vj-wrap">
        <h2>{str(data, 'heading')}</h2>
        <div className="vj-compare">
          {rows.map((row) => (
            <div className="vj-compare-row" key={String(row.label)}>
              <p>{String(row.label ?? '')}</p>
              <p><span>{str(data, 'kitHeading')}</span>{String(row.kit ?? '')}</p>
              <p><span>{str(data, 'bookHeading')}</span>{String(row.book ?? '')}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq({ data }: { data: Record<string, unknown> }) {
  return (
    <section className="vj-sec">
      <div className="vj-wrap vj-faq">
        <h2>{str(data, 'heading')}</h2>
        {items(data).map((item) => (
          <details key={item.title}>
            <summary>{item.title}</summary>
            <p>{item.text}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Thanks({ data }: { data: Record<string, unknown> }) {
  const steps = Array.isArray(data.steps) ? data.steps as Array<Record<string, unknown>> : []
  return (
    <section className="vj-sec">
      <div className="vj-wrap">
        <h1>{str(data, 'heading')}</h1>
        <p className="lede">{str(data, 'text')}</p>
        <a className="vj-btn" href={str(data, 'downloadHref')}>{str(data, 'downloadLabel')}</a>
        <h2 style={{ marginTop: 36 }}>Three simple steps</h2>
        <div className="vj-steps">
          {steps.map((step, i) => (
            <article className="vj-step" key={String(step.title)}>
              <b>{i + 1}</b>
              <h3>{String(step.title ?? '')}</h3>
              <p>{String(step.text ?? '')}</p>
            </article>
          ))}
        </div>
        <div className="vj-product" style={{ marginTop: 36 }}>
          <img src="/img/book-cover.png" alt="Cover of I Call BS: AI Vibe Coding Myths Dispelled" />
          <div>
            <p className="vj-k">Optional next step</p>
            <h2>{str(data, 'bookTitle')}</h2>
            <p>{str(data, 'bookText')}</p>
            <a className="vj-btn" href={str(data, 'bookHref')}>{str(data, 'bookLabel')}</a>
            <p className="vj-note">{str(data, 'bookNote')}</p>
            {str(data, 'resourcesLabel') ? <p><a href={str(data, 'resourcesHref')}>{str(data, 'resourcesLabel')}</a></p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function Article({ data }: { data: Record<string, unknown> }) {
  return (
    <section className="vj-sec">
      <div className="vj-wrap" style={{ maxWidth: 760 }}>
        <p className="vj-k">{str(data, 'eyebrow')}</p>
        <h1>{str(data, 'heading')}</h1>
        <p className="lede">{str(data, 'lede')}</p>
        <ol>
          {items(data).map((item, i) => (
            <li key={item.title}>
              <h2>{i + 1}. {item.title}</h2>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
        <a className="vj-btn" href={str(data, 'bookHref')}>{str(data, 'bookLabel')}</a>
      </div>
    </section>
  )
}

export default function BrandBlockView({ block }: { block: BlogBlock }) {
  const data = block.data
  switch (block.type) {
    case 'brand_hero':
      return <Hero data={data} />
    case 'brand_topics':
    case 'brand_columns':
    case 'brand_cards':
      return <CardGrid data={data} forest={block.type === 'brand_columns'} />
    case 'brand_projects':
      return <Projects data={data} />
    case 'brand_product':
      return <Product data={data} />
    case 'brand_newsletter':
      return <Newsletter data={data} />
    case 'brand_library':
      return <Library data={data} />
    case 'brand_quote':
      return <Quote data={data} />
    case 'brand_contact':
      return <ContactBlock data={data} />
    case 'brand_catalog':
      return <Catalog data={data} />
    case 'brand_previews':
      return <Previews data={data} />
    case 'brand_compare':
      return <Compare data={data} />
    case 'kit_contents':
      return (
        <section className="vj-sec">
          <div className="vj-wrap vj-faq">
            <details>
              <summary>View the full comparison</summary>
              <KitBlockView block={block} />
            </details>
          </div>
        </section>
      )
    case 'brand_faq':
      return <Faq data={data} />
    case 'brand_thanks':
      return <Thanks data={data} />
    case 'brand_article':
      return <Article data={data} />
    default:
      return null
  }
}
