import { Fragment, type ReactNode } from 'react'

/** Brand highlighter. Used when a heading has no custom highlight color. */
export const BRAND_HEADING_MARK = '#FFF475'
const MARK_INK = '#151412'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function asLines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/** A highlight color from the style tab. Anything else stays on the brand yellow. */
export function safeHighlightColor(value: unknown): string {
  const raw = String(value ?? '').trim()
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw) ? raw : ''
}

function markBackground(color: unknown): string {
  return safeHighlightColor(color) || BRAND_HEADING_MARK
}

/** Match the phrase even when the heading is uppercased, or the apostrophe differs. */
function phrasePattern(highlight: string): RegExp | null {
  const phrase = highlight.replace(/\s+/g, ' ').trim()
  if (!phrase) return null
  const body = phrase
    .split(' ')
    .map((word) => escapeRegExp(word).replace(/['\u2018\u2019\u201B]/g, "['\u2018\u2019\u201B]"))
    .join('\\s+')
  return new RegExp(body, 'i')
}

export function splitHighlight(
  text: string,
  highlight: string,
): { before: string; phrase: string; after: string } | null {
  const source = asLines(text)
  const found = phrasePattern(highlight)?.exec(source)
  if (!found || found.index < 0) return null
  return {
    before: source.slice(0, found.index),
    phrase: found[0].replace(/\s+/g, ' '),
    after: source.slice(found.index + found[0].length),
  }
}

function withBreaks(text: string): ReactNode {
  const lines = asLines(text).split('\n')
  if (lines.length === 1) return lines[0] ?? ''
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ))
}

function breaksHtml(text: string): string {
  return escapeHtml(asLines(text)).replace(/\n/g, '<br>')
}

function markStyle(color: unknown): string {
  return `white-space:nowrap;background-color:${markBackground(color)};color:${MARK_INK}`
}

/** The marked words stay one row. A line break inside the phrase is kept out of the mark. */
export function highlightedText(text: string, highlight: string, color?: unknown): ReactNode {
  const source = asLines(text)
  const parts = splitHighlight(source, highlight)
  if (!parts) return withBreaks(source)
  return (
    <>
      {withBreaks(parts.before)}
      <mark style={{ backgroundColor: markBackground(color), color: MARK_INK, whiteSpace: 'nowrap' }}>{parts.phrase}</mark>
      {withBreaks(parts.after)}
    </>
  )
}

export function highlightHtml(text: string, highlight: string, color?: unknown): string {
  const parts = splitHighlight(text, highlight)
  if (!parts) return breaksHtml(text)
  return `${breaksHtml(parts.before)}<mark style="${markStyle(color)}">${escapeHtml(parts.phrase)}</mark>${breaksHtml(parts.after)}`
}

export function headingHasMark(value: string): boolean {
  return /<mark\b/i.test(value)
}

function looksLikeHtml(value: string): boolean {
  return /<[a-z!/][^>]*>/i.test(value)
}

/** Plain heading words. Used when a phrase edit replaces an older selection mark. */
export function plainHeadingText(value: string): string {
  if (!looksLikeHtml(value)) return value
  const decoded = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
  return decoded.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '')
}

function recolorMarks(html: string, color: unknown): string {
  const background = safeHighlightColor(color)
  if (!background) return html
  const style = markStyle(color)
  return html.replace(/<mark\b([^>]*)>/gi, (_full, attrs: string) => {
    let next = attrs
    if (/style\s*=\s*"[^"]*"/i.test(next)) next = next.replace(/style\s*=\s*"[^"]*"/i, `style="${style}"`)
    else next += ` style="${style}"`
    if (/data-color\s*=\s*"[^"]*"/i.test(next)) next = next.replace(/data-color\s*=\s*"[^"]*"/i, `data-color="${background}"`)
    else next += ` data-color="${background}"`
    return `<mark${next}>`
  })
}

function applyPhraseInTextNodes(html: string, highlight: string, color?: unknown): string {
  const pattern = phrasePattern(highlight)
  if (!pattern) return html
  const style = markStyle(color)
  return html.replace(/>([^<]*)</g, (full, text: string) => {
    const next = text.replace(new RegExp(pattern.source, 'i'), (found) => `<mark style="${style}">${escapeHtml(found)}</mark>`)
    return next === text ? full : `>${next}<`
  })
}

function flattenBlocks(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<\/?h[1-6][^>]*>/gi, '')
    .replace(/color:\s*inherit\s*;?/gi, '')
}

/** Inline HTML for the public heading tag. Stored marks win over the phrase field. */
export function headingInlineHtml(text: string, highlight: string, color?: unknown): string {
  const source = String(text ?? '')
  if (headingHasMark(source)) return flattenBlocks(recolorMarks(source, color))
  if (looksLikeHtml(source)) return flattenBlocks(applyPhraseInTextNodes(recolorMarks(source, color), highlight, color))
  return highlightHtml(source, highlight, color)
}

/** TipTap document. A phrase with no stored mark is shown, not written back, until the user edits. */
export function headingEditorHtml(text: string, highlight: string, color?: unknown): string {
  const source = String(text ?? '')
  if (!source.trim()) return '<p></p>'
  if (headingHasMark(source) || looksLikeHtml(source)) {
    const html = headingHasMark(source) ? recolorMarks(source, color) : applyPhraseInTextNodes(source, highlight, color)
    return /<\s*p[\s>]/i.test(html) ? html : `<p>${html}</p>`
  }
  return `<p>${highlightHtml(source, highlight, color)}</p>`
}

/** Phrase field edit. Selection marks are cleared so the phrase can show. */
export function headingPhrasePatch(text: string, phrase: string): { highlight: string; text?: string } {
  if (!headingHasMark(text)) return { highlight: phrase }
  return { highlight: phrase, text: plainHeadingText(text) }
}
