import { useEffect, useState, type ReactNode } from 'react'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { useBlogEditorStore } from '../studio/lib/blog/useBlogEditorStore'
import { currentKitField, subscribeKitField, takePendingKitField } from '../studio/components/blog/blocks/brand/kitFieldFocus'
import { PIECE_BACKGROUNDS, PIECE_FONTS, PIECE_SHADOWS, isImagePiece, isPieceHidden, piecesFor, readPieceStyle, type PieceStyle } from './brandPieces'

const selectCls = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-slate-700">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export default function BrandElementStyle({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock)
  const data = block.data as Record<string, unknown>
  const pieces = piecesFor(block.type, data)
  const [field, setField] = useState<string | null>(() => currentKitField(block.id) ?? pieces[0]?.field ?? null)

  useEffect(() => {
    const pending = takePendingKitField(block.id)
    if (pending) setField(pending)
    return subscribeKitField((target) => {
      if (target.blockId !== block.id) return
      takePendingKitField(block.id)
      setField(target.field)
    })
  }, [block.id])

  const active = field && pieces.some((piece) => piece.field === field) ? field : pieces[0]?.field ?? null
  if (!active) {
    return <p className="text-xs leading-relaxed text-slate-600">This section has no separate pieces to style.</p>
  }

  const chosen = pieces.find((piece) => piece.field === active) ?? pieces[0]
  const style = readPieceStyle(data, active)
  const image = isImagePiece(block.type, active)
  const hidden = isPieceHidden(data, active)

  function choose(next: string) {
    setField(next)
  }

  function hide(hiddenNext: boolean) {
    const prev = data.hiddenFields
    const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...(prev as Record<string, boolean>) } : {}
    updateBlock(block.id, { hiddenFields: { ...base, [active as string]: hiddenNext } })
  }

  function patch(next: PieceStyle) {
    const all = data.elementStyles
    const prev = all && typeof all === 'object' && !Array.isArray(all) ? { ...(all as Record<string, PieceStyle>) } : {}
    updateBlock(block.id, { elementStyles: { ...prev, [active]: { ...style, ...next } } })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-600">Pick the piece, then change it. The green bar still moves or deletes the whole section.</p>
      <div className="flex flex-col gap-1">
        {pieces.map((piece) => (
          <button
            key={piece.field}
            type="button"
            onClick={() => choose(piece.field)}
            className={`rounded-md px-2 py-1.5 text-left text-xs font-bold ${
              piece.field === active ? 'bg-[#F3D13D] text-[#151412]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {piece.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{chosen?.label}</p>
      {hidden ? (
        <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[#1A5340]" onClick={() => hide(false)}>
          Put it back
        </button>
      ) : (
        <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[#B53D0D]" onClick={() => hide(true)}>
          Delete this piece
        </button>
      )}
      {image ? (
        <p className="text-xs leading-relaxed text-slate-600">This is a picture. Open Content to replace it, or delete this piece to take it off the page.</p>
      ) : null}
      {image ? null : (
      <>
      <Row label="Font">
        <select className={selectCls} value={style.fontFamily ?? ''} onChange={(e) => patch({ fontFamily: e.target.value })}>
          {PIECE_FONTS.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}
        </select>
      </Row>
      <Row label="Size">
        <input className={selectCls} value={style.fontSize ?? ''} placeholder="58px" onChange={(e) => patch({ fontSize: e.target.value })} />
      </Row>
      <Row label="Weight">
        <select className={selectCls} value={style.fontWeight ?? ''} onChange={(e) => patch({ fontWeight: e.target.value })}>
          <option value="">Default</option>
          <option value="400">Regular</option>
          <option value="700">Bold</option>
        </select>
      </Row>
      <Row label="Color">
        <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white" value={style.color || '#151412'} onChange={(e) => patch({ color: e.target.value })} />
      </Row>
      <Row label="Align">
        <select className={selectCls} value={style.textAlign ?? ''} onChange={(e) => patch({ textAlign: e.target.value })}>
          <option value="">Default</option>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Row>
      <Row label="Space above">
        <input className={selectCls} value={style.marginTop ?? ''} placeholder="16px" onChange={(e) => patch({ marginTop: e.target.value })} />
      </Row>
      <Row label="Space below">
        <input className={selectCls} value={style.marginBottom ?? ''} placeholder="16px" onChange={(e) => patch({ marginBottom: e.target.value })} />
      </Row>
      <Row label="Letter spacing">
        <input className={selectCls} value={style.letterSpacing ?? ''} placeholder="0.04em" onChange={(e) => patch({ letterSpacing: e.target.value })} />
      </Row>
      <Row label="Shadow">
        <select className={selectCls} value={style.shadow ?? ''} onChange={(e) => patch({ shadow: e.target.value })}>
          {PIECE_SHADOWS.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}
        </select>
      </Row>
      <Row label="Background">
        <select className={selectCls} value={style.background ?? ''} onChange={(e) => patch({ background: e.target.value })}>
          {PIECE_BACKGROUNDS.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}
        </select>
      </Row>
      <Row label="Hover color">
        <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white" value={style.hoverColor || '#F25C19'} onChange={(e) => patch({ hoverColor: e.target.value })} />
      </Row>
      </>
      )}
    </div>
  )
}
