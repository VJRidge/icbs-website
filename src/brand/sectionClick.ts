const WIDGET_CONTENT =
  '[contenteditable="true"], .ProseMirror, .tiptap, .vj-heading-editor, .vj-canvas-type, p, h1, h2, h3, h4, h5, h6, img, video, iframe, li, blockquote, figcaption, a, table, .vj-canvas-bar, .vj-img-handle, .vj-meet'

/** True for the text/media inside a widget. False for the white padding around it. */
export function clickIsOnWidget(target: EventTarget | null): boolean {
  if (!target || typeof Element === 'undefined' || !(target instanceof Element)) return false
  return Boolean(target.closest(WIDGET_CONTENT))
}
