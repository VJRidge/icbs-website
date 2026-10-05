import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { currentKitField, subscribeKitField } from '../studio/components/blog/blocks/brand/kitFieldFocus'
import BlogInspectorSection from '../studio/components/blog/editor/BlogInspectorSection'
import {
  PIECE_FONTS,
  PIECE_SHADOWS,
  isHeadingWidget,
  isImageWidget,
  isPieceHidden,
  pieceBag,
  pieceBagPatch,
  pieceLinkField,
  pieceValuePatch,
  readPieceStyle,
  readPieceValue,
  widgetName,
  type PieceStyle,
} from './brandPieces'

const fieldCls = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800'

export function useSelectedPiece(blockId: string): string | null {
  const [field, setField] = useState<string | null>(() => currentKitField(blockId))
  useEffect(() => {
    setField(currentKitField(blockId))
    return subscribeKitField((target) => {
      if (target.blockId !== blockId) return
      setField(target.field || null)
    })
  }, [blockId])
  return field
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-slate-700">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function usePieceEditor(block: BlogBlock, field: string | null) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock)
  const data = block.data as Record<string, unknown>
  function patchStyle(next: PieceStyle) {
    if (!field) return
    const prev = readPieceStyle(data, field)
    const all = data.elementStyles
    const bag = all && typeof all === 'object' && !Array.isArray(all) ? { ...(all as Record<string, PieceStyle>) } : {}
    updateBlock(block.id, { elementStyles: { ...bag, [field]: { ...prev, ...next } } })
  }
  return { data, updateBlock, patchStyle, style: field ? readPieceStyle(data, field) : {} }
}

function EmptyPiece() {
  return <p className="text-xs leading-relaxed text-slate-600">Click a heading, button, or picture on the canvas.</p>
}

export function BrandPieceGeneral({ block, field }: { block: BlogBlock; field: string | null }) {
  const { data, updateBlock } = usePieceEditor(block, field)
  if (!field) return <EmptyPiece />
  const active = field
  const name = widgetName(active)
  const text = readPieceValue(data, active)
  const hidden = isPieceHidden(data, active)
  const linkKey = pieceLinkField(active)
  const link = linkKey ? String(data[linkKey] ?? '') : pieceBag(data, 'elementLinks')[active] ?? ''
  const tag = pieceBag(data, 'elementTags')[active] ?? ''

  function setText(value: string) {
    updateBlock(block.id, pieceValuePatch(data, active, value))
  }
  function setLink(value: string) {
    if (linkKey) updateBlock(block.id, { [linkKey]: value })
    else updateBlock(block.id, pieceBagPatch(data, 'elementLinks', active, value))
  }
  function setHidden(next: boolean) {
    const prev = data.hiddenFields
    const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...(prev as Record<string, boolean>) } : {}
    updateBlock(block.id, { hiddenFields: { ...base, [active]: next } })
  }

  return (
    <div className="space-y-3">
      {isImageWidget(field) ? (
        <p className="text-xs leading-relaxed text-slate-600">Click the picture on the canvas to replace it.</p>
      ) : (
        <Row label={name === 'Button' ? 'Button text' : 'Title'}>
          <textarea className={fieldCls} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </Row>
      )}
      <BlogInspectorSection title="Settings" defaultOpen={false}>
        {isHeadingWidget(field) ? (
          <Row label="Tag">
            <select className={fieldCls} value={tag} onChange={(e) => updateBlock(block.id, pieceBagPatch(data, 'elementTags', active, e.target.value))}>
              <option value="">Default</option>
              {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((level) => (
                <option key={level} value={level}>{level.toUpperCase()}</option>
              ))}
            </select>
          </Row>
        ) : null}
        {isImageWidget(field) ? null : (
          <Row label="Link">
            <input className={fieldCls} value={link} placeholder="https:// or /page" onChange={(e) => setLink(e.target.value)} />
          </Row>
        )}
        {hidden ? (
          <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[#1A5340]" onClick={() => setHidden(false)}>
            Put it back
          </button>
        ) : (
          <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[#B53D0D]" onClick={() => setHidden(true)}>
            Delete
          </button>
        )}
      </BlogInspectorSection>
    </div>
  )
}

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72]

function fontPx(value: string): number {
  const n = parseFloat(value)
  return Number.isFinite(n) && n > 0 ? n : 16
}

export function FontSize({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const listed = FONT_SIZES.some((size) => String(size) === value)
  function step(dir: 1 | -1) {
    if (!value) {
      onChange(dir > 0 ? '16' : '14')
      return
    }
    const next = Math.min(120, Math.max(8, fontPx(value) + dir))
    onChange(String(next))
  }
  return (
    <Row label="Font size">
      <div className="flex gap-1">
        <select
          className={fieldCls}
          value={listed ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{value && !listed ? value : 'Default'}</option>
          {FONT_SIZES.map((size) => <option key={size} value={String(size)}>{size}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          <input
            className="w-14 border-0 px-2 py-1.5 text-sm text-slate-800 outline-none"
            inputMode="numeric"
            value={value}
            placeholder="px"
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          />
          <div className="flex flex-col border-l border-slate-200">
            <button type="button" className="px-1 text-slate-500 hover:bg-slate-50" aria-label="Larger" onClick={() => step(1)}>
              <ChevronUp size={12} />
            </button>
            <button type="button" className="border-t border-slate-200 px-1 text-slate-500 hover:bg-slate-50" aria-label="Smaller" onClick={() => step(-1)}>
              <ChevronDown size={12} />
            </button>
          </div>
        </div>
      </div>
    </Row>
  )
}

function Side({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Row label={label}>
      <input className={fieldCls} value={value} placeholder="0" onChange={(e) => onChange(e.target.value)} />
    </Row>
  )
}

export function BrandPieceStyle({ block, field }: { block: BlogBlock; field: string | null }) {
  const { patchStyle, style } = usePieceEditor(block, field)
  if (!field) return <EmptyPiece />
  const image = isImageWidget(field)

  return (
    <div className="space-y-2">
      <BlogInspectorSection title="Layout" defaultOpen={false}>
        <Row label="Display">
          <select className={fieldCls} value={style.display ?? ''} onChange={(e) => patchStyle({ display: e.target.value })}>
            <option value="">Default</option>
            <option value="block">Block</option>
            <option value="inline-block">Inline</option>
            <option value="flex">Flex</option>
          </select>
        </Row>
      </BlogInspectorSection>
      <BlogInspectorSection title="Spacing" defaultOpen={false}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Margin</p>
        <div className="grid grid-cols-2 gap-2">
          <Side label="Top" value={style.marginTop ?? ''} onChange={(marginTop) => patchStyle({ marginTop })} />
          <Side label="Right" value={style.marginRight ?? ''} onChange={(marginRight) => patchStyle({ marginRight })} />
          <Side label="Bottom" value={style.marginBottom ?? ''} onChange={(marginBottom) => patchStyle({ marginBottom })} />
          <Side label="Left" value={style.marginLeft ?? ''} onChange={(marginLeft) => patchStyle({ marginLeft })} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Padding</p>
        <div className="grid grid-cols-2 gap-2">
          <Side label="Top" value={style.paddingTop ?? ''} onChange={(paddingTop) => patchStyle({ paddingTop })} />
          <Side label="Right" value={style.paddingRight ?? ''} onChange={(paddingRight) => patchStyle({ paddingRight })} />
          <Side label="Bottom" value={style.paddingBottom ?? ''} onChange={(paddingBottom) => patchStyle({ paddingBottom })} />
          <Side label="Left" value={style.paddingLeft ?? ''} onChange={(paddingLeft) => patchStyle({ paddingLeft })} />
        </div>
      </BlogInspectorSection>
      <BlogInspectorSection title="Size" defaultOpen={false}>
        <Side label="Width" value={style.width ?? ''} onChange={(width) => patchStyle({ width })} />
        <Side label="Height" value={style.height ?? ''} onChange={(height) => patchStyle({ height })} />
      </BlogInspectorSection>
      <BlogInspectorSection title="Position" defaultOpen={false}>
        <Row label="Position">
          <select className={fieldCls} value={style.position ?? ''} onChange={(e) => patchStyle({ position: e.target.value })}>
            <option value="">Default</option>
            <option value="static">Static</option>
            <option value="relative">Relative</option>
            <option value="absolute">Absolute</option>
          </select>
        </Row>
      </BlogInspectorSection>
      {image ? null : (
        <BlogInspectorSection title="Typography" defaultOpen>
          <Row label="Font family">
            <select className={fieldCls} value={style.fontFamily ?? ''} onChange={(e) => patchStyle({ fontFamily: e.target.value })}>
              {PIECE_FONTS.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}
            </select>
          </Row>
          <Row label="Font weight">
            <select className={fieldCls} value={style.fontWeight ?? ''} onChange={(e) => patchStyle({ fontWeight: e.target.value })}>
              <option value="">Default</option>
              <option value="300">300 Light</option>
              <option value="400">400 Normal</option>
              <option value="500">500 Medium</option>
              <option value="700">700 Bold</option>
            </select>
          </Row>
          <FontSize value={style.fontSize ?? ''} onChange={(fontSize) => patchStyle({ fontSize })} />
          <Side label="Line height" value={style.lineHeight ?? ''} onChange={(lineHeight) => patchStyle({ lineHeight })} />
          <Side label="Letter spacing" value={style.letterSpacing ?? ''} onChange={(letterSpacing) => patchStyle({ letterSpacing })} />
          <Row label="Text align">
            <div className="grid grid-cols-3 gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => patchStyle({ textAlign: align })}
                  className={`rounded-md border px-2 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                    style.textAlign === align ? 'border-[#151412] bg-[#151412] text-white' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Text color">
            <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white" value={style.color || '#151412'} onChange={(e) => patchStyle({ color: e.target.value })} />
          </Row>
        </BlogInspectorSection>
      )}
      <BlogInspectorSection title="Background" defaultOpen={false}>
        <Row label="Color">
          <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white" value={style.backgroundColor || '#ffffff'} onChange={(e) => patchStyle({ backgroundColor: e.target.value })} />
        </Row>
      </BlogInspectorSection>
      <BlogInspectorSection title="Border" defaultOpen={false}>
        <Side label="Border width" value={style.borderWidth ?? ''} onChange={(borderWidth) => patchStyle({ borderWidth })} />
        <Row label="Border type">
          <select className={fieldCls} value={style.borderStyle ?? ''} onChange={(e) => patchStyle({ borderStyle: e.target.value })}>
            <option value="">None</option>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </Row>
        <Row label="Border color">
          <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white" value={style.borderColor || '#151412'} onChange={(e) => patchStyle({ borderColor: e.target.value })} />
        </Row>
        <Side label="Border radius" value={style.borderRadius ?? ''} onChange={(borderRadius) => patchStyle({ borderRadius })} />
      </BlogInspectorSection>
      <BlogInspectorSection title="Effects" defaultOpen={false}>
        <Side label="Opacity" value={style.opacity ?? ''} onChange={(opacity) => patchStyle({ opacity })} />
        <Row label="Shadow">
          <select className={fieldCls} value={style.shadow ?? ''} onChange={(e) => patchStyle({ shadow: e.target.value })}>
            {PIECE_SHADOWS.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}
          </select>
        </Row>
      </BlogInspectorSection>
    </div>
  )
}

export function BrandPieceInteractions({ block, field }: { block: BlogBlock; field: string | null }) {
  const { patchStyle, style } = usePieceEditor(block, field)
  if (!field) return <EmptyPiece />
  if (isImageWidget(field)) {
    return <p className="text-xs leading-relaxed text-slate-600">This picture has no hover action.</p>
  }
  return (
    <BlogInspectorSection title="Hover" defaultOpen>
      <Row label="Text color">
        <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white" value={style.hoverColor || '#F25C19'} onChange={(e) => patchStyle({ hoverColor: e.target.value })} />
      </Row>
    </BlogInspectorSection>
  )
}
