import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import BrandBlockView from '../../../../../brand/BrandBlocks'
import { BrandEditContext, type BrandEditApi } from '../../../../../brand/brandEditContext'
import { useBlogAdminMediaLibrary } from '../../../../contexts/BlogAdminMediaLibraryContext'
import { revealKitField, subscribeKitField } from './kitFieldFocus'
import { useBlogEditorStore } from '../../../../lib/blog/useBlogEditorStore'
import type { BlogBlock } from '../../../../lib/blog/blogBlockTypes'

const DESKTOP_WIDTH = 1280

function Frame({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.55)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const box = outer.current
    const content = inner.current
    if (!box || !content) return
    const measure = () => {
      const next = Math.min(1, box.clientWidth / DESKTOP_WIDTH)
      setScale(next)
      setHeight(content.offsetHeight * next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  function keepClicksHere(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest('a')
    if (link) event.preventDefault()
  }

  return (
    <div ref={outer} className="overflow-hidden bg-white" style={{ height: height ?? undefined }} onClickCapture={keepClicksHere}>
      <div ref={inner} className="vj vj-canvas" style={{ width: DESKTOP_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}

function flagBag(data: Record<string, unknown>, key: string, hidden: boolean): Record<string, boolean> {
  const prev = data.hiddenFields
  const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...(prev as Record<string, boolean>) } : {}
  return { ...base, [key]: hidden }
}

function EditableBrandBlock({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock)
  const { openMediaLibrary } = useBlogAdminMediaLibrary()
  const blockRef = useRef(block)
  blockRef.current = block
  const [selectedField, setSelectedField] = useState<string | null>(null)

  useEffect(() => subscribeKitField((target) => {
    if (target.blockId !== blockRef.current.id) return
    setSelectedField(target.field || null)
  }), [])

  const api = useMemo<BrandEditApi>(
    () => ({
      selectedField,
      setField: (key, value) => updateBlock(blockRef.current.id, { [key]: value }),
      focusField: (key) => {
        const id = blockRef.current.id
        setSelectedField(key)
        useBlogEditorStore.getState().selectBlock(id)
        revealKitField({ blockId: id, field: key })
      },
      hideField: (key) => updateBlock(blockRef.current.id, { hiddenFields: flagBag(blockRef.current.data, key, true) }),
      showField: (key) => updateBlock(blockRef.current.id, { hiddenFields: flagBag(blockRef.current.data, key, false) }),
      setItem: (index, key, value) => {
        const list = Array.isArray(blockRef.current.data.items) ? (blockRef.current.data.items as Array<Record<string, unknown>>) : []
        updateBlock(blockRef.current.id, {
          items: list.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
        })
      },
      pickImage: (onPick, label) => openMediaLibrary(onPick, label),
    }),
    [selectedField, updateBlock, openMediaLibrary],
  )

  return (
    <BrandEditContext.Provider value={api}>
      <Frame>
        <BrandBlockView block={block} />
      </Frame>
    </BrandEditContext.Provider>
  )
}

export default function BrandBlockCanvas({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  if (!isEditing) {
    return (
      <div className="vj vj-canvas">
        <BrandBlockView block={block} />
      </div>
    )
  }
  return <EditableBrandBlock block={block} />
}
