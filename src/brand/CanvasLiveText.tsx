import { createElement, useRef, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Plain-text editing on the page canvas. The node is not rewritten while it has focus. */
export default function CanvasLiveText({
  blockId,
  text,
  as,
  className,
  style,
  html = false,
}: {
  blockId: string
  text: string
  as: string
  className?: string
  style?: CSSProperties
  html?: boolean
}) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock)
  const writing = useRef(false)
  const nodeRef = useRef<HTMLElement | null>(null)

  const bind = (node: HTMLElement | null) => {
    nodeRef.current = node
    if (!node || writing.current) return
    if (node.textContent !== text) node.textContent = text
  }

  return createElement(as, {
    ref: bind,
    className,
    style,
    contentEditable: 'plaintext-only',
    suppressContentEditableWarning: true,
    spellCheck: true,
    onMouseDown: (event: MouseEvent) => event.stopPropagation(),
    onFocus: () => {
      writing.current = true
    },
    onBlur: () => {
      writing.current = false
      const node = nodeRef.current
      if (node && node.textContent !== text) node.textContent = text
    },
    onInput: (event: FormEvent<HTMLElement>) => {
      const next = event.currentTarget.textContent ?? ''
      updateBlock(blockId, { text: html ? `<p>${escapeText(next)}</p>` : next })
    },
  })
}
