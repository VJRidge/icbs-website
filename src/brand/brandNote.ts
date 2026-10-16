/** Paragraphs for a long-form brand note. Blank rows are dropped. */
export function noteParagraphs(data: Record<string, unknown>): string[] {
  if (!Array.isArray(data.items)) return []
  return data.items.flatMap((raw) => {
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const text = String(row.text ?? '').trim()
    return text ? [text] : []
  })
}

export function noteAnchor(data: Record<string, unknown>): string {
  return String(data.anchor ?? '').trim()
}
