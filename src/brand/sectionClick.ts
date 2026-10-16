const WIDGET_CHROME =
  'img, video, iframe, a, button, .vj-btn, [data-lightbox-trigger], input, textarea, table, .vj-canvas-bar, .vj-img-handle, .vj-meet'

const WIDGET_CONTENT =
  `[contenteditable="true"], .ProseMirror, .tiptap, .vj-heading-editor, .vj-canvas-type, p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, ${WIDGET_CHROME}`

/** True for the text/media inside a widget. False for the white padding around it. */
export function clickIsOnWidget(target: EventTarget | null): boolean {
  if (!target || typeof Element === 'undefined' || !(target instanceof Element)) return false
  return Boolean(target.closest(WIDGET_CONTENT))
}

export type ColumnClickPick = { parentId: string; column: number }

/** Column under this node, used when the click landed on padding instead of copy. */
export function columnPickFromNode(node: EventTarget | null): ColumnClickPick | null {
  if (!node || typeof Element === 'undefined' || !(node instanceof Element)) return null
  const col = node.closest('[data-col-parent]')
  if (!(col instanceof HTMLElement)) return null
  const parentId = col.dataset.colParent?.trim() ?? ''
  const column = Number(col.dataset.colIndex)
  if (!parentId || !Number.isInteger(column) || column < 0) return null
  return { parentId, column }
}

function clickHitsRenderedText(x: number, y: number, root: Element): boolean {
  if (typeof document === 'undefined') return false
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node.textContent?.trim()) {
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true
      }
    }
    node = walker.nextNode()
  }
  return false
}

/**
 * Widget if the click hit copy, media, or editor chrome.
 * Empty padding inside a column — including around a filled paragraph — selects the column.
 */
export function clickSelectsWidget(event: { target: EventTarget | null; clientX: number; clientY: number }): boolean {
  const target = event.target
  if (!target || typeof Element === 'undefined' || !(target instanceof Element)) return false
  if (target.closest('[data-col-gutter], [data-col-handle]')) return false
  if (target.closest(WIDGET_CHROME)) return true
  const selectedEditor = target.closest('.vj-canvas-on [contenteditable="true"], .vj-canvas-on .ProseMirror, .vj-canvas-on .tiptap')
  if (selectedEditor) return true
  const host = target.closest('[data-widget-box], [data-block-id], [data-nested-id]')
  if (host instanceof HTMLElement && host.hasAttribute('data-empty-widget')) return true
  if (host instanceof Element && clickHitsRenderedText(event.clientX, event.clientY, host)) return true
  return false
}
