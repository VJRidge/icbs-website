/** Dropped text/heading widgets have no copy yet, so the canvas box would collapse. */
export function widgetCopyIsBlank(block: { type: string; data: Record<string, unknown> }): boolean {
  if (block.type !== 'heading' && block.type !== 'paragraph') return false
  const html = String(block.data.text ?? '')
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return !text
}
