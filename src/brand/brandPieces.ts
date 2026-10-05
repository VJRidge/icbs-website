import type { CSSProperties } from 'react'

export const PIECE_LABELS: Record<string, string> = {
  eyebrow: 'Eyebrow',
  headline: 'Title',
  statement: 'Paragraph',
  primaryLabel: 'Button',
  secondaryLabel: 'Caption',
  bookTitle: 'Book title',
  bookText: 'Book text',
  bookPrice: 'Price',
  bookLabel: 'Button',
  kitLabel: 'Button',
  label: 'Label',
  heading: 'Heading',
}

export type PieceStyle = {
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  lineHeight?: string
  color?: string
  textAlign?: string
  marginTop?: string
  marginRight?: string
  marginBottom?: string
  marginLeft?: string
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  letterSpacing?: string
  shadow?: string
  background?: string
  backgroundColor?: string
  hoverColor?: string
  display?: string
  position?: string
  width?: string
  height?: string
  opacity?: string
  borderWidth?: string
  borderStyle?: string
  borderColor?: string
  borderRadius?: string
}

export const PIECE_FONTS = [
  { label: 'Default', value: '' },
  { label: 'Anton', value: 'Anton, Impact, sans-serif' },
  { label: 'Newsreader', value: 'Newsreader, Georgia, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Mono', value: '"IBM Plex Mono", ui-monospace, monospace' },
]

const HEADING_KEYS = new Set(['headline', 'heading', 'title', 'bookTitle', 'label', 'eyebrow', 'meta'])
const TEXT_KEYS = new Set(['statement', 'text', 'lede', 'note', 'bookText', 'bookPrice'])
const BUTTON_KEYS = new Set(['primaryLabel', 'secondaryLabel', 'bookLabel', 'kitLabel', 'linkLabel', 'buttonLabel'])
const IMAGE_KEYS = new Set(['bookCover', 'coverUrl', 'photoUrl', 'mediaUrl', 'videoUrl', 'image'])

export function widgetName(field: string): string {
  const key = field.split('.').pop() ?? field
  if (IMAGE_KEYS.has(key) || key === 'href') return 'Image'
  if (BUTTON_KEYS.has(key)) return 'Button'
  if (TEXT_KEYS.has(key)) return 'Text'
  if (HEADING_KEYS.has(key)) return 'Heading'
  return 'Heading'
}

export function isHeadingWidget(field: string): boolean {
  return widgetName(field) === 'Heading'
}

export function isImageWidget(field: string): boolean {
  return widgetName(field) === 'Image'
}

export function readPieceValue(data: Record<string, unknown>, field: string): string {
  const [list, index, key] = field.split('.')
  if (list === 'items' && key) {
    const items = data.items
    if (!Array.isArray(items)) return ''
    const row = items[Number(index)]
    if (!row || typeof row !== 'object') return ''
    return String((row as Record<string, unknown>)[key] ?? '')
  }
  return String(data[field] ?? '')
}

export function pieceValuePatch(data: Record<string, unknown>, field: string, value: string): Record<string, unknown> {
  const [list, index, key] = field.split('.')
  if (list === 'items' && key) {
    const items = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : []
    return { items: items.map((item, i) => (i === Number(index) ? { ...item, [key]: value } : item)) }
  }
  return { [field]: value }
}

export function pieceBag(data: Record<string, unknown>, bagKey: string): Record<string, string> {
  const bag = data[bagKey]
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return {}
  return bag as Record<string, string>
}

export function pieceBagPatch(data: Record<string, unknown>, bagKey: string, field: string, value: string): Record<string, unknown> {
  return { [bagKey]: { ...pieceBag(data, bagKey), [field]: value } }
}

const BUTTON_LINK: Record<string, string> = {
  primaryLabel: 'primaryHref',
  secondaryLabel: 'secondaryHref',
  bookLabel: 'bookHref',
  kitLabel: 'kitHref',
  linkLabel: 'linkHref',
}

export function pieceLinkField(field: string): string | null {
  const key = field.split('.').pop() ?? field
  return BUTTON_LINK[key] ?? null
}

export const PIECE_BACKGROUNDS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#F3D13D' },
  { label: 'Forest', value: '#1A5340' },
  { label: 'Gradient', value: 'linear-gradient(100deg, #F3D13D 0%, #F25C19 100%)' },
]

export const PIECE_SHADOWS = [
  { label: 'None', value: '' },
  { label: 'Soft', value: '0 8px 24px rgba(21,20,18,0.18)' },
  { label: 'Hard', value: '4px 4px 0 #151412' },
]

const SECTION_PIECES: Record<string, { field: string; label: string }[]> = {
  brand_hero: [
    { field: 'headline', label: 'Title' },
    { field: 'statement', label: 'Paragraph' },
    { field: 'eyebrow', label: 'Eyebrow' },
    { field: 'primaryLabel', label: 'Button' },
    { field: 'secondaryLabel', label: 'Caption' },
    { field: 'bookTitle', label: 'Book title' },
    { field: 'bookText', label: 'Book text' },
    { field: 'bookPrice', label: 'Price' },
    { field: 'bookLabel', label: 'Book button' },
    { field: 'kitLabel', label: 'Kit button' },
    { field: 'bookCover', label: 'Book cover' },
    { field: 'photoUrl', label: 'Meet photo' },
  ],
  brand_cards: [
    { field: 'label', label: 'Small label' },
    { field: 'heading', label: 'Heading' },
    { field: 'linkLabel', label: 'Button' },
  ],
  brand_topics: [
    { field: 'label', label: 'Small label' },
    { field: 'heading', label: 'Heading' },
  ],
  brand_columns: [
    { field: 'label', label: 'Small label' },
    { field: 'heading', label: 'Heading' },
  ],
  brand_projects: [
    { field: 'label', label: 'Small label' },
    { field: 'heading', label: 'Heading' },
    { field: 'note', label: 'Note' },
  ],
  brand_product: [
    { field: 'label', label: 'Small label' },
    { field: 'title', label: 'Title' },
    { field: 'text', label: 'Text' },
    { field: 'price', label: 'Price' },
    { field: 'primaryLabel', label: 'Button' },
    { field: 'secondaryLabel', label: 'Second button' },
    { field: 'coverUrl', label: 'Book cover' },
  ],
  brand_previews: [
    { field: 'label', label: 'Small label' },
    { field: 'heading', label: 'Heading' },
  ],
}

export function piecesFor(type: string, data: Record<string, unknown>): { field: string; label: string }[] {
  const base = SECTION_PIECES[type] ?? []
  const items = Array.isArray(data.items) ? data.items : []
  if (type === 'brand_projects') {
    return [
      ...base,
      ...items.flatMap((_, i) => [
        { field: `items.${i}.title`, label: `Project ${i + 1} title` },
        { field: `items.${i}.text`, label: `Project ${i + 1} text` },
        { field: `items.${i}.image`, label: `Project ${i + 1} image` },
      ]),
    ]
  }
  if (type === 'brand_previews') {
    return [
      ...base,
      ...items.flatMap((_, i) => [
        { field: `items.${i}.title`, label: `Screenshot ${i + 1} caption` },
        { field: `items.${i}.href`, label: `Screenshot ${i + 1} image` },
      ]),
    ]
  }
  if (type === 'brand_cards' || type === 'brand_topics' || type === 'brand_columns') {
    return [
      ...base,
      ...items.flatMap((_, i) => [
        { field: `items.${i}.title`, label: `Card ${i + 1} title` },
        { field: `items.${i}.text`, label: `Card ${i + 1} text` },
      ]),
    ]
  }
  return base
}

export function isImagePiece(type: string, field: string): boolean {
  if (['bookCover', 'coverUrl', 'photoUrl', 'mediaUrl', 'videoUrl'].includes(field)) return true
  if (field.endsWith('.image')) return true
  return type === 'brand_previews' && field.endsWith('.href')
}

export function pieceLabel(field: string): string {
  return PIECE_LABELS[field] ?? field
}

export function isPieceHidden(data: Record<string, unknown>, field: string): boolean {
  const bag = data.hiddenFields
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return false
  return Boolean((bag as Record<string, unknown>)[field])
}

export function readPieceStyle(data: Record<string, unknown>, field: string): PieceStyle {
  const all = data.elementStyles
  if (!all || typeof all !== 'object' || Array.isArray(all)) return {}
  const style = (all as Record<string, unknown>)[field]
  if (!style || typeof style !== 'object' || Array.isArray(style)) return {}
  return style as PieceStyle
}

export function pieceHover(data: Record<string, unknown>, field: string): string {
  return readPieceStyle(data, field).hoverColor ?? ''
}

function cssSize(value?: string): string | undefined {
  if (!value) return undefined
  return /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value
}

export function pieceCss(data: Record<string, unknown>, field: string): CSSProperties {
  const style = readPieceStyle(data, field)
  const css: CSSProperties & { '--piece-hover'?: string } = {}
  if (style.fontFamily) css.fontFamily = style.fontFamily
  if (style.fontSize) css.fontSize = cssSize(style.fontSize)
  if (style.fontWeight) css.fontWeight = style.fontWeight
  if (style.lineHeight) css.lineHeight = style.lineHeight
  if (style.color) css.color = style.color
  if (style.textAlign) css.textAlign = style.textAlign as CSSProperties['textAlign']
  if (style.marginTop) css.marginTop = cssSize(style.marginTop)
  if (style.marginRight) css.marginRight = cssSize(style.marginRight)
  if (style.marginBottom) css.marginBottom = cssSize(style.marginBottom)
  if (style.marginLeft) css.marginLeft = cssSize(style.marginLeft)
  if (style.paddingTop) css.paddingTop = cssSize(style.paddingTop)
  if (style.paddingRight) css.paddingRight = cssSize(style.paddingRight)
  if (style.paddingBottom) css.paddingBottom = cssSize(style.paddingBottom)
  if (style.paddingLeft) css.paddingLeft = cssSize(style.paddingLeft)
  if (style.letterSpacing) css.letterSpacing = cssSize(style.letterSpacing)
  if (style.shadow) css.textShadow = style.shadow
  if (style.background) css.background = style.background
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor
  if (style.display) css.display = style.display as CSSProperties['display']
  if (style.position) css.position = style.position as CSSProperties['position']
  if (style.width) css.width = cssSize(style.width)
  if (style.height) css.height = cssSize(style.height)
  if (style.opacity) css.opacity = style.opacity
  if (style.borderWidth || style.borderStyle || style.borderColor) {
    css.borderWidth = cssSize(style.borderWidth) ?? '1px'
    css.borderStyle = style.borderStyle || 'solid'
    css.borderColor = style.borderColor || 'currentColor'
  }
  if (style.borderRadius) css.borderRadius = cssSize(style.borderRadius)
  if (style.hoverColor) css['--piece-hover'] = style.hoverColor
  return css
}
